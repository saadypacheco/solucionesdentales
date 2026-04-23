"""
M6 — Tratamientos del paciente.

Cada tratamiento tiene: descripción, fecha, estado (planificado/en_curso/
completado), costo opcional, imágenes opcionales (radiografías, antes/después),
notas internas del odontólogo.

Acceso:
- Admin/odontologo: CRUD completo
- Recepcionista: solo lectura (para presupuestos)
- Paciente: ve los suyos sin notas internas (read-only)
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from supabase import Client

from app.db.client import get_supabase_client
from app.routers.auth import require_paciente, require_staff_context
from app.services.audit import log_action

router = APIRouter(prefix="/tratamientos", tags=["tratamientos"], redirect_slashes=False)

ROLES_EDIT_TRATAMIENTO = ("admin", "odontologo", "superadmin")
ESTADOS_VALIDOS = ("planificado", "en_curso", "completado")


def get_db() -> Client:
    return get_supabase_client()


class TratamientoCreate(BaseModel):
    paciente_id: int
    descripcion: str
    fecha: str  # YYYY-MM-DD
    estado: str = "planificado"
    costo: Optional[float] = None
    notas: Optional[str] = None


class TratamientoUpdate(BaseModel):
    descripcion: Optional[str] = None
    fecha: Optional[str] = None
    estado: Optional[str] = None
    costo: Optional[float] = None
    notas: Optional[str] = None


# ── Admin ────────────────────────────────────────────────────────────────────

@router.get("/admin")
async def listar_admin(
    paciente_id: Optional[int] = None,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Lista tratamientos del consultorio. Filtro opcional por paciente."""
    query = db.table("tratamientos").select("*, pacientes(id, nombre), usuarios(id, nombre)")
    if not ctx["es_superadmin"]:
        query = query.eq("consultorio_id", ctx["consultorio_id"])
    if paciente_id:
        query = query.eq("paciente_id", paciente_id)
    res = query.order("fecha", desc=True).execute()
    return res.data or []


@router.post("/admin")
async def crear_tratamiento(
    req: TratamientoCreate,
    request: Request,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    if ctx["rol"] not in ROLES_EDIT_TRATAMIENTO:
        raise HTTPException(status_code=403, detail="Solo odontólogo o admin pueden crear tratamientos")
    if req.estado not in ESTADOS_VALIDOS:
        raise HTTPException(status_code=400, detail=f"Estado inválido. Opciones: {ESTADOS_VALIDOS}")

    # Validar paciente
    pac = db.table("pacientes").select("id, consultorio_id").eq("id", req.paciente_id).single().execute()
    if not pac.data:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    if not ctx["es_superadmin"] and pac.data["consultorio_id"] != ctx["consultorio_id"]:
        raise HTTPException(status_code=403, detail="Paciente de otro consultorio")

    consultorio_id = pac.data["consultorio_id"]
    data = {
        "paciente_id": req.paciente_id,
        "usuario_id": ctx["usuario_id"],
        "descripcion": req.descripcion,
        "fecha": req.fecha,
        "estado": req.estado,
        "consultorio_id": consultorio_id,
    }
    if req.costo is not None:
        data["costo"] = req.costo
    if req.notas:
        data["notas"] = req.notas

    res = db.table("tratamientos").insert(data).execute()
    tratamiento = res.data[0]

    log_action(
        consultorio_id=consultorio_id,
        usuario_id=ctx["usuario_id"],
        paciente_id=req.paciente_id,
        accion="create_tratamiento",
        recurso_tipo="tratamiento",
        recurso_id=tratamiento["id"],
        request=request,
    )
    return tratamiento


@router.patch("/admin/{tratamiento_id}")
async def actualizar_tratamiento(
    tratamiento_id: int,
    req: TratamientoUpdate,
    request: Request,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    if ctx["rol"] not in ROLES_EDIT_TRATAMIENTO:
        raise HTTPException(status_code=403, detail="Solo odontólogo o admin pueden editar tratamientos")

    existing = db.table("tratamientos").select("consultorio_id, paciente_id").eq("id", tratamiento_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado")
    if not ctx["es_superadmin"] and existing.data["consultorio_id"] != ctx["consultorio_id"]:
        raise HTTPException(status_code=403, detail="Tratamiento de otro consultorio")

    update = {}
    if req.descripcion is not None: update["descripcion"] = req.descripcion
    if req.fecha is not None: update["fecha"] = req.fecha
    if req.estado is not None:
        if req.estado not in ESTADOS_VALIDOS:
            raise HTTPException(status_code=400, detail=f"Estado inválido. Opciones: {ESTADOS_VALIDOS}")
        update["estado"] = req.estado
    if req.costo is not None: update["costo"] = req.costo
    if req.notas is not None: update["notas"] = req.notas

    if not update:
        raise HTTPException(status_code=400, detail="Nada para actualizar")

    res = db.table("tratamientos").update(update).eq("id", tratamiento_id).execute()

    log_action(
        consultorio_id=existing.data["consultorio_id"],
        usuario_id=ctx["usuario_id"],
        paciente_id=existing.data["paciente_id"],
        accion="edit_tratamiento",
        recurso_tipo="tratamiento",
        recurso_id=tratamiento_id,
        request=request,
    )
    return res.data[0] if res.data else update


@router.delete("/admin/{tratamiento_id}")
async def eliminar_tratamiento(
    tratamiento_id: int,
    request: Request,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Hard delete (los tratamientos no tienen 'activo'). Soft alternative: estado='cancelado'."""
    if ctx["rol"] not in ROLES_EDIT_TRATAMIENTO:
        raise HTTPException(status_code=403, detail="Solo odontólogo o admin pueden eliminar tratamientos")

    existing = db.table("tratamientos").select("consultorio_id, paciente_id").eq("id", tratamiento_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado")
    if not ctx["es_superadmin"] and existing.data["consultorio_id"] != ctx["consultorio_id"]:
        raise HTTPException(status_code=403, detail="Tratamiento de otro consultorio")

    db.table("tratamientos").delete().eq("id", tratamiento_id).execute()

    log_action(
        consultorio_id=existing.data["consultorio_id"],
        usuario_id=ctx["usuario_id"],
        paciente_id=existing.data["paciente_id"],
        accion="delete_tratamiento",
        recurso_tipo="tratamiento",
        recurso_id=tratamiento_id,
        request=request,
    )
    return {"ok": True}


# ── Paciente (JWT OTP) ───────────────────────────────────────────────────────

@router.get("/paciente")
async def mis_tratamientos(
    payload: dict = Depends(require_paciente),
    db: Client = Depends(get_db),
):
    """Paciente ve sus tratamientos sin notas internas del odontólogo."""
    paciente_id = int(payload["sub"])
    res = (
        db.table("tratamientos")
        .select("id, descripcion, fecha, estado, costo, imagen_urls, created_at, usuarios(id, nombre)")
        .eq("paciente_id", paciente_id)
        .order("fecha", desc=True)
        .execute()
    )
    return res.data or []
