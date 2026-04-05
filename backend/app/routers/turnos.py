from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date, timedelta
from zoneinfo import ZoneInfo
from app.db.client import get_supabase_client
from supabase import Client

router = APIRouter(prefix="/turnos", tags=["turnos"])

AR_TZ = ZoneInfo("America/Argentina/Buenos_Aires")

# Duración por tipo de tratamiento (minutos)
DURACION_POR_TRATAMIENTO: dict[str, int] = {
    "estetica": 60,
    "blanqueamiento": 45,
    "ortodoncia": 30,
    "implante": 90,
    "limpieza": 30,
    "urgencia": 45,
    "consulta": 30,
}

# Horario de atención
HORA_INICIO = 9   # 09:00
HORA_FIN = 19     # 19:00 (último slot puede iniciar a las 18:30 si dura 30m)


def get_db() -> Client:
    return get_supabase_client()


def generar_slots(fecha: date, duracion_minutos: int) -> list[str]:
    """Genera todos los slots posibles para una fecha según duración."""
    slots = []
    inicio = datetime(fecha.year, fecha.month, fecha.day, HORA_INICIO, 0, tzinfo=AR_TZ)
    fin_limite = datetime(fecha.year, fecha.month, fecha.day, HORA_FIN, 0, tzinfo=AR_TZ)

    cursor = inicio
    while cursor + timedelta(minutes=duracion_minutos) <= fin_limite:
        slots.append(cursor.strftime("%H:%M"))
        cursor += timedelta(minutes=30)  # granularidad de 30 minutos

    return slots


def slots_ocupados(fecha: date, db: Client) -> set[str]:
    """Devuelve los horarios de inicio de turnos ya ocupados para esa fecha."""
    fecha_inicio = datetime(fecha.year, fecha.month, fecha.day, 0, 0, tzinfo=AR_TZ).isoformat()
    fecha_fin = datetime(fecha.year, fecha.month, fecha.day, 23, 59, tzinfo=AR_TZ).isoformat()

    res = db.table("turnos") \
        .select("fecha_hora, duracion_minutos") \
        .gte("fecha_hora", fecha_inicio) \
        .lte("fecha_hora", fecha_fin) \
        .not_.in_("estado", ["cancelado"]) \
        .execute()

    ocupados = set()
    for t in (res.data or []):
        dt = datetime.fromisoformat(t["fecha_hora"])
        dt_ar = dt.astimezone(AR_TZ)
        duracion = t.get("duracion_minutos", 30)
        # Bloquear todos los slots que se superponen con este turno
        cursor = dt_ar
        fin_turno = dt_ar + timedelta(minutes=duracion)
        while cursor < fin_turno:
            ocupados.add(cursor.strftime("%H:%M"))
            cursor += timedelta(minutes=30)

    return ocupados


class SolicitarTurnoRequest(BaseModel):
    nombre: str
    telefono: str
    fecha_hora: datetime
    tipo_tratamiento: str
    notas: Optional[str] = None


@router.get("/disponibles")
async def turnos_disponibles(
    fecha: str,
    tratamiento: str = "consulta",
    db: Client = Depends(get_db),
):
    """
    Devuelve slots disponibles para una fecha y tipo de tratamiento.
    fecha: YYYY-MM-DD
    tratamiento: clave del tipo (estetica, blanqueamiento, ortodoncia, etc.)
    """
    try:
        fecha_date = date.fromisoformat(fecha)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido. Usar YYYY-MM-DD")

    hoy = date.today()
    if fecha_date < hoy:
        raise HTTPException(status_code=400, detail="No se puede agendar en fechas pasadas")

    # Domingo = cerrado
    if fecha_date.weekday() == 6:
        return {"fecha": fecha, "slots": [], "mensaje": "Cerrado los domingos"}

    # Sábado solo hasta las 13:00
    duracion = DURACION_POR_TRATAMIENTO.get(tratamiento, 30)
    slots = generar_slots(fecha_date, duracion)

    if fecha_date.weekday() == 5:  # sábado
        slots = [s for s in slots if int(s.split(":")[0]) < 13]

    ocupados = slots_ocupados(fecha_date, db)

    # Si la fecha es hoy, bloquear slots pasados
    if fecha_date == hoy:
        ahora = datetime.now(tz=AR_TZ)
        slots = [
            s for s in slots
            if datetime(hoy.year, hoy.month, hoy.day,
                        int(s.split(":")[0]), int(s.split(":")[1]),
                        tzinfo=AR_TZ) > ahora + timedelta(hours=1)
        ]

    disponibles = [s for s in slots if s not in ocupados]

    return {
        "fecha": fecha,
        "tratamiento": tratamiento,
        "duracion_minutos": duracion,
        "slots": disponibles,
    }


@router.post("/")
async def solicitar_turno(req: SolicitarTurnoRequest, db: Client = Depends(get_db)):
    """Solicita un turno — crea el paciente si no existe."""
    duracion = DURACION_POR_TRATAMIENTO.get(req.tipo_tratamiento, 30)

    # Buscar o crear paciente
    paciente_res = db.table("pacientes").select("id, score").eq("telefono", req.telefono).execute()

    if paciente_res.data:
        paciente_id = paciente_res.data[0]["id"]
        score_actual = paciente_res.data[0].get("score", 0)
        db.table("pacientes").update({
            "score": score_actual + 30,
            "estado": "turno_agendado",
            "nombre": req.nombre,
            "updated_at": datetime.now(tz=AR_TZ).isoformat(),
        }).eq("id", paciente_id).execute()
    else:
        nuevo = db.table("pacientes").insert({
            "telefono": req.telefono,
            "nombre": req.nombre,
            "estado": "turno_agendado",
            "score": 30,
        }).execute()
        paciente_id = nuevo.data[0]["id"]

    # Insertar turno
    turno_res = db.table("turnos").insert({
        "paciente_id": paciente_id,
        "fecha_hora": req.fecha_hora.isoformat(),
        "duracion_minutos": duracion,
        "tipo_tratamiento": req.tipo_tratamiento,
        "notas": req.notas,
        "estado": "solicitado",
    }).execute()

    turno_id = turno_res.data[0]["id"]

    # Alarma para admin
    db.table("alarmas").insert({
        "tipo": "nuevo_turno",
        "paciente_id": paciente_id,
        "titulo": f"Nuevo turno solicitado — {req.nombre}",
        "descripcion": f"{req.tipo_tratamiento} el {req.fecha_hora.strftime('%d/%m/%Y %H:%M')}",
        "prioridad": "alta",
    }).execute()

    return {
        "turno_id": turno_id,
        "paciente_id": paciente_id,
        "estado": "solicitado",
        "duracion_minutos": duracion,
    }


@router.get("/{turno_id}")
async def get_turno(turno_id: int, db: Client = Depends(get_db)):
    res = db.table("turnos").select("*, pacientes(nombre, telefono)").eq("id", turno_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    return res.data
