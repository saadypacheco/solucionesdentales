from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date, timedelta
from zoneinfo import ZoneInfo
from app.db.client import get_supabase_client
from app.core.encryption import (
    encrypt,
    hash_for_search,
    normalize_email,
    normalize_phone,
)
from app.core.paciente_helpers import hidratar_turno
from app.core.tenant import resolve_consultorio_publico
from supabase import Client

router = APIRouter(prefix="/turnos", tags=["turnos"], redirect_slashes=False)

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
HORA_FIN = 19     # 19:00


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
        cursor += timedelta(minutes=30)

    return slots


def get_doctores_para_tratamiento(tratamiento: str, db: Client, consultorio_id: int) -> list[dict]:
    """
    Devuelve odontólogos (y admins) que atienden un tratamiento, del consultorio dado.
    - especialidades vacío ({}) → atiende todos los tratamientos
    - especialidades con valores → solo atiende esos tratamientos
    """
    res = db.table("usuarios") \
        .select("id, nombre, especialidades") \
        .in_("rol", ["odontologo", "admin"]) \
        .eq("consultorio_id", consultorio_id) \
        .execute()

    doctores = []
    for u in (res.data or []):
        especialidades = u.get("especialidades") or []
        # Array vacío = atiende todos; si tiene valores, debe incluir el tratamiento
        if not especialidades or tratamiento in especialidades:
            doctores.append(u)

    return doctores


def slots_ocupados_por_doctor(fecha: date, db: Client, consultorio_id: int, usuario_id: str | None = None) -> set[str]:
    """
    Devuelve los horarios bloqueados para una fecha en un consultorio dado.
    Si usuario_id es None, devuelve todos los turnos del consultorio.
    Si usuario_id está, filtra por ese doctor.
    """
    fecha_inicio = datetime(fecha.year, fecha.month, fecha.day, 0, 0, tzinfo=AR_TZ).isoformat()
    fecha_fin = datetime(fecha.year, fecha.month, fecha.day, 23, 59, tzinfo=AR_TZ).isoformat()

    query = db.table("turnos") \
        .select("fecha_hora, duracion_minutos") \
        .eq("consultorio_id", consultorio_id) \
        .gte("fecha_hora", fecha_inicio) \
        .lte("fecha_hora", fecha_fin) \
        .not_.in_("estado", ["cancelado"])

    if usuario_id:
        query = query.eq("usuario_id", usuario_id)

    res = query.execute()

    ocupados = set()
    for t in (res.data or []):
        dt = datetime.fromisoformat(t["fecha_hora"])
        dt_ar = dt.astimezone(AR_TZ)
        duracion = t.get("duracion_minutos", 30)
        cursor = dt_ar
        fin_turno = dt_ar + timedelta(minutes=duracion)
        while cursor < fin_turno:
            ocupados.add(cursor.strftime("%H:%M"))
            cursor += timedelta(minutes=30)

    return ocupados


# ─── ENDPOINTS ──────────────────────────────────────────────────────────────

@router.get("/doctores")
async def get_doctores(
    tratamiento: str = "consulta",
    consultorio_id: int = Depends(resolve_consultorio_publico),
    db: Client = Depends(get_db),
):
    """
    Devuelve los odontólogos disponibles para un tipo de tratamiento.
    - Si hay 1 → el frontend lo asigna automáticamente (sin selector)
    - Si hay varios → el frontend muestra selector de doctor
    """
    doctores = get_doctores_para_tratamiento(tratamiento, db, consultorio_id)
    return {
        "tratamiento": tratamiento,
        "total": len(doctores),
        "doctores": [{"id": d["id"], "nombre": d["nombre"] or "Odontólogo"} for d in doctores],
    }


@router.get("/disponibles")
async def turnos_disponibles(
    fecha: str,
    tratamiento: str = "consulta",
    usuario_id: Optional[str] = None,
    consultorio_id: int = Depends(resolve_consultorio_publico),
    db: Client = Depends(get_db),
):
    """
    Devuelve slots disponibles para una fecha, tratamiento y opcionalmente un doctor.
    Si no se pasa usuario_id, se auto-detecta si hay 1 solo doctor para ese tratamiento.
    """
    try:
        fecha_date = date.fromisoformat(fecha)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido. Usar YYYY-MM-DD")

    hoy = date.today()
    if fecha_date < hoy:
        raise HTTPException(status_code=400, detail="No se puede agendar en fechas pasadas")

    if fecha_date.weekday() == 6:
        return {"fecha": fecha, "slots": [], "mensaje": "Cerrado los domingos"}

    duracion = DURACION_POR_TRATAMIENTO.get(tratamiento, 30)
    slots = generar_slots(fecha_date, duracion)

    if fecha_date.weekday() == 5:  # sábado
        slots = [s for s in slots if int(s.split(":")[0]) < 13]

    # Resolver el doctor a usar para filtrar slots ocupados
    doctor_id_filtro = usuario_id
    if not doctor_id_filtro:
        doctores = get_doctores_para_tratamiento(tratamiento, db, consultorio_id)
        if len(doctores) == 1:
            doctor_id_filtro = doctores[0]["id"]
        # Si hay 0 o múltiples doctores sin usuario_id, no filtramos por doctor

    ocupados = slots_ocupados_por_doctor(fecha_date, db, consultorio_id, doctor_id_filtro)

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
        "usuario_id": doctor_id_filtro,
        "slots": disponibles,
    }


class SolicitarTurnoRequest(BaseModel):
    nombre: str
    telefono: Optional[str] = None  # Optional if email is provided
    fecha_hora: datetime
    tipo_tratamiento: str
    notas: Optional[str] = None
    email: Optional[str] = None  # Email del paciente
    usuario_id: Optional[str] = None  # UUID del odontólogo; se auto-asigna si hay 1 solo
    consentimiento_aceptado: bool = False  # Checkbox de privacidad
    consentimiento_version_texto: Optional[str] = None  # Snapshot del texto al momento de aceptar


@router.post("")
async def solicitar_turno(
    req: SolicitarTurnoRequest,
    consultorio_id: int = Depends(resolve_consultorio_publico),
    db: Client = Depends(get_db),
):
    """Solicita un turno — crea el paciente si no existe."""

    # Validar que al menos telefono o email esté presente
    if not req.telefono and not req.email:
        raise HTTPException(status_code=400, detail="Se requiere al menos teléfono o email")

    # Verificar consentimiento informado (PDPA AR / LGPD BR / HIPAA US)
    if not req.consentimiento_aceptado:
        raise HTTPException(status_code=400, detail="Debe aceptar la política de privacidad para continuar")

    duracion = DURACION_POR_TRATAMIENTO.get(req.tipo_tratamiento, 30)

    # Resolver doctor (filtrado por consultorio)
    doctor_id = req.usuario_id
    if not doctor_id:
        doctores = get_doctores_para_tratamiento(req.tipo_tratamiento, db, consultorio_id)
        if len(doctores) == 1:
            doctor_id = doctores[0]["id"]

    # Normalización + hash para búsqueda determinística
    tel_norm = normalize_phone(req.telefono)
    email_norm = normalize_email(req.email)
    tel_hash = hash_for_search(tel_norm) if tel_norm else None
    email_hash = hash_for_search(email_norm) if email_norm else None

    # Buscar paciente DENTRO del mismo consultorio (multi-tenant)
    paciente_res = None
    if tel_hash:
        paciente_res = db.table("pacientes").select("id, score") \
            .eq("consultorio_id", consultorio_id) \
            .eq("telefono_hash", tel_hash).execute()
        if not paciente_res.data and tel_norm:
            paciente_res = db.table("pacientes").select("id, score") \
                .eq("consultorio_id", consultorio_id) \
                .eq("telefono", tel_norm).execute()
    elif email_hash:
        paciente_res = db.table("pacientes").select("id, score") \
            .eq("consultorio_id", consultorio_id) \
            .eq("email_hash", email_hash).execute()
        if not paciente_res.data and email_norm:
            paciente_res = db.table("pacientes").select("id, score") \
                .eq("consultorio_id", consultorio_id) \
                .eq("email", email_norm).execute()

    if paciente_res and paciente_res.data:
        paciente_id = paciente_res.data[0]["id"]
        score_actual = paciente_res.data[0].get("score", 0)
        update_data = {
            "score": score_actual + 30,
            "estado": "turno_agendado",
            "nombre": req.nombre,
            "updated_at": datetime.now(tz=AR_TZ).isoformat(),
        }
        if email_norm:
            update_data["email_enc"] = encrypt(email_norm)
            update_data["email_hash"] = email_hash
            update_data["email"] = None  # purgar plano si existía
        db.table("pacientes").update(update_data).eq("id", paciente_id).execute()
    else:
        nuevo_data = {
            "nombre": req.nombre,
            "estado": "turno_agendado",
            "score": 30,
            "consultorio_id": consultorio_id,
        }
        if tel_norm:
            nuevo_data["telefono_enc"] = encrypt(tel_norm)
            nuevo_data["telefono_hash"] = tel_hash
        if email_norm:
            nuevo_data["email_enc"] = encrypt(email_norm)
            nuevo_data["email_hash"] = email_hash
        nuevo = db.table("pacientes").insert(nuevo_data).execute()
        paciente_id = nuevo.data[0]["id"]

    # Insertar turno (notas encriptadas)
    turno_data = {
        "paciente_id": paciente_id,
        "fecha_hora": req.fecha_hora.isoformat(),
        "duracion_minutos": duracion,
        "tipo_tratamiento": req.tipo_tratamiento,
        "notas_enc": encrypt(req.notas) if req.notas else None,
        "estado": "solicitado",
        "consultorio_id": consultorio_id,
    }
    if doctor_id:
        turno_data["usuario_id"] = doctor_id

    turno_res = db.table("turnos").insert(turno_data).execute()
    turno_id = turno_res.data[0]["id"]

    # Alarma para admin del consultorio
    db.table("alarmas").insert({
        "tipo": "nuevo_turno",
        "paciente_id": paciente_id,
        "titulo": f"Nuevo turno solicitado — {req.nombre}",
        "descripcion": f"{req.tipo_tratamiento} el {req.fecha_hora.strftime('%d/%m/%Y %H:%M')}",
        "prioridad": "alta",
        "consultorio_id": consultorio_id,
    }).execute()

    # Registrar consentimiento de tratamiento de datos (snapshot del texto)
    try:
        db.table("consentimientos").insert({
            "paciente_id": paciente_id,
            "consultorio_id": consultorio_id,
            "tipo": "tratamiento_datos",
            "version_texto": req.consentimiento_version_texto or "Política de privacidad aceptada al agendar turno (texto no capturado)",
        }).execute()
    except Exception:
        # No bloquear el turno si falla el registro del consentimiento
        pass

    return {
        "turno_id": turno_id,
        "paciente_id": paciente_id,
        "estado": "solicitado",
        "duracion_minutos": duracion,
        "usuario_id": doctor_id,
    }


@router.get("/{turno_id}")
async def get_turno(turno_id: int, db: Client = Depends(get_db)):
    res = db.table("turnos").select(
        "*, pacientes(id, nombre, telefono, telefono_enc, telefono_hash, email, email_enc, email_hash)"
    ).eq("id", turno_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    return hidratar_turno(res.data)
