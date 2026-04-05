from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.db.client import get_supabase_client
from supabase import Client

router = APIRouter(prefix="/turnos", tags=["turnos"])


def get_db() -> Client:
    return get_supabase_client()


class SolicitarTurnoRequest(BaseModel):
    nombre: str
    telefono: str
    fecha_hora: datetime
    tipo_tratamiento: str
    notas: Optional[str] = None


@router.get("/disponibles")
async def turnos_disponibles(fecha: str, db: Client = Depends(get_db)):
    """Devuelve slots disponibles para una fecha dada."""
    # TODO: lógica de slots según configuración
    return {"fecha": fecha, "slots": []}


@router.post("/")
async def solicitar_turno(req: SolicitarTurnoRequest, db: Client = Depends(get_db)):
    """Solicita un turno — crea el paciente si no existe."""
    # Buscar o crear paciente
    paciente = db.table("pacientes").select("id").eq("telefono", req.telefono).execute()

    if paciente.data:
        paciente_id = paciente.data[0]["id"]
    else:
        nuevo = db.table("pacientes").insert({
            "telefono": req.telefono,
            "nombre": req.nombre,
            "estado": "nuevo",
            "score": 0,
        }).execute()
        paciente_id = nuevo.data[0]["id"]
        # Sumar score por solicitar turno
        db.table("pacientes").update({"score": 30}).eq("id", paciente_id).execute()

    turno = db.table("turnos").insert({
        "paciente_id": paciente_id,
        "fecha_hora": req.fecha_hora.isoformat(),
        "tipo_tratamiento": req.tipo_tratamiento,
        "notas": req.notas,
        "estado": "solicitado",
    }).execute()

    # Alarma para admin
    db.table("alarmas").insert({
        "tipo": "nuevo_turno",
        "paciente_id": paciente_id,
        "titulo": f"Nuevo turno solicitado — {req.nombre}",
        "descripcion": f"{req.tipo_tratamiento} el {req.fecha_hora.strftime('%d/%m %H:%M')}",
        "prioridad": "alta",
    }).execute()

    return {"turno_id": turno.data[0]["id"], "estado": "solicitado"}


@router.get("/{turno_id}")
async def get_turno(turno_id: int, db: Client = Depends(get_db)):
    res = db.table("turnos").select("*, pacientes(nombre, telefono)").eq("id", turno_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    return res.data
