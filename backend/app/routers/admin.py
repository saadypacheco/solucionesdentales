from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from app.db.client import get_supabase_client
from app.routers.auth import require_admin
from supabase import Client

router = APIRouter(prefix="/admin", tags=["admin"])


def get_db() -> Client:
    return get_supabase_client()


@router.get("/pacientes")
async def listar_pacientes(db: Client = Depends(get_db), _: None = Depends(require_admin)):
    return db.table("pacientes").select("*").order("created_at", desc=True).execute().data or []


@router.get("/turnos")
async def listar_turnos(
    fecha: Optional[str] = None,
    db: Client = Depends(get_db),
    _: None = Depends(require_admin),
):
    """Lista turnos. Si se pasa fecha (YYYY-MM-DD), filtra ese día."""
    query = db.table("turnos").select("*, pacientes(nombre, telefono)")
    if fecha:
        query = query.gte("fecha_hora", f"{fecha}T00:00:00") \
                     .lte("fecha_hora", f"{fecha}T23:59:59")
    return query.order("fecha_hora").execute().data or []


@router.patch("/turnos/{turno_id}")
async def actualizar_turno(turno_id: int, estado: str,
                            db: Client = Depends(get_db), _: None = Depends(require_admin)):
    estados_validos = ("solicitado", "confirmado", "realizado", "cancelado", "ausente")
    if estado not in estados_validos:
        raise HTTPException(status_code=400, detail=f"Estado inválido. Opciones: {estados_validos}")
    res = db.table("turnos").update({"estado": estado}).eq("id", turno_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    return res.data[0]


@router.get("/casos")
async def listar_casos_admin(db: Client = Depends(get_db), _: None = Depends(require_admin)):
    return db.table("casos_galeria").select("*").order("created_at", desc=True).execute().data or []


@router.patch("/casos/{caso_id}")
async def aprobar_caso(caso_id: int, aprobado: bool,
                       db: Client = Depends(get_db), _: None = Depends(require_admin)):
    res = db.table("casos_galeria").update({"aprobado": aprobado}).eq("id", caso_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    return res.data[0]


@router.patch("/alarmas/{alarma_id}/resolver")
async def resolver_alarma(alarma_id: int,
                           db: Client = Depends(get_db), _: None = Depends(require_admin)):
    res = db.table("alarmas").update({"resuelta": True}).eq("id", alarma_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Alarma no encontrada")
    return res.data[0]
