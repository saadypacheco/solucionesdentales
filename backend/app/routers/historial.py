"""
M6 — Historia clínica del paciente.

Estructura: 1:1 paciente ↔ historial. Una sola fila con alergias,
medicación, antecedentes. Si el paciente cambia de consultorio (Modelo C
multi-tenant), tiene una historia distinta por consultorio.

Acceso:
- Admin/odontologo: ve y edita el historial de pacientes de su consultorio
- Recepcionista: NO accede al historial clínico (solo agendar/ver turnos)
- Paciente con OTP: ve SU propio historial (read-only)
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from supabase import Client

from app.db.client import get_supabase_client
from app.routers.auth import require_paciente, require_staff_context
from app.services.audit import log_action

router = APIRouter(prefix="/historial", tags=["historial"], redirect_slashes=False)

# Recepcionista NO accede a historial clínico
ROLES_HISTORIAL = ("admin", "odontologo", "superadmin")


def get_db() -> Client:
    return get_supabase_client()


# ── Schemas ──────────────────────────────────────────────────────────────────

class HistorialUpsert(BaseModel):
    alergias: Optional[list[str]] = None
    medicacion: Optional[list[str]] = None
    antecedentes: Optional[str] = None


# ── Admin ────────────────────────────────────────────────────────────────────

@router.get("/admin/{paciente_id}")
async def obtener_historial(
    paciente_id: int,
    request: Request,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Devuelve el historial clínico de un paciente. Solo admin/odontologo."""
    if ctx["rol"] not in ROLES_HISTORIAL:
        raise HTTPException(status_code=403, detail="Solo odontólogo o admin pueden ver historia clínica")

    # Validar paciente del consultorio
    pac = db.table("pacientes").select("id, consultorio_id, nombre").eq("id", paciente_id).single().execute()
    if not pac.data:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    if not ctx["es_superadmin"] and pac.data["consultorio_id"] != ctx["consultorio_id"]:
        raise HTTPException(status_code=403, detail="Paciente de otro consultorio")

    res = db.table("historial_clinico").select("*").eq("paciente_id", paciente_id).execute()
    historial = res.data[0] if res.data else None

    log_action(
        consultorio_id=pac.data["consultorio_id"],
        usuario_id=ctx["usuario_id"],
        paciente_id=paciente_id,
        accion="view_historial",
        recurso_tipo="historial_clinico",
        recurso_id=historial["id"] if historial else None,
        request=request,
    )

    return historial or {
        "paciente_id": paciente_id,
        "alergias": [],
        "medicacion": [],
        "antecedentes": None,
    }


@router.patch("/admin/{paciente_id}")
async def upsert_historial(
    paciente_id: int,
    req: HistorialUpsert,
    request: Request,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Upsert del historial clínico. Solo admin/odontologo."""
    if ctx["rol"] not in ROLES_HISTORIAL:
        raise HTTPException(status_code=403, detail="Solo odontólogo o admin pueden editar historia clínica")

    pac = db.table("pacientes").select("id, consultorio_id").eq("id", paciente_id).single().execute()
    if not pac.data:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    if not ctx["es_superadmin"] and pac.data["consultorio_id"] != ctx["consultorio_id"]:
        raise HTTPException(status_code=403, detail="Paciente de otro consultorio")

    consultorio_id = pac.data["consultorio_id"]
    payload = {"paciente_id": paciente_id, "consultorio_id": consultorio_id}
    if req.alergias is not None:
        payload["alergias"] = req.alergias
    if req.medicacion is not None:
        payload["medicacion"] = req.medicacion
    if req.antecedentes is not None:
        payload["antecedentes"] = req.antecedentes

    from datetime import datetime, timezone
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()

    res = db.table("historial_clinico").upsert(payload, on_conflict="paciente_id").execute()

    log_action(
        consultorio_id=consultorio_id,
        usuario_id=ctx["usuario_id"],
        paciente_id=paciente_id,
        accion="edit_historial",
        recurso_tipo="historial_clinico",
        recurso_id=res.data[0]["id"] if res.data else None,
        request=request,
    )

    return res.data[0] if res.data else payload


# ── Paciente (JWT OTP) ───────────────────────────────────────────────────────

@router.get("/paciente")
async def mi_historial(
    payload: dict = Depends(require_paciente),
    db: Client = Depends(get_db),
):
    """Paciente ve su propio historial."""
    paciente_id = int(payload["sub"])
    res = db.table("historial_clinico").select("*").eq("paciente_id", paciente_id).execute()
    return res.data[0] if res.data else {
        "paciente_id": paciente_id,
        "alergias": [],
        "medicacion": [],
        "antecedentes": None,
    }
