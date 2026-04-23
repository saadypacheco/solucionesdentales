"""
M5 — Disponibilidad horaria configurable por doctor.

Cada doctor (admin/odontologo) puede definir un bloque horario por día de
semana. Si no hay filas para un día, se aplican los defaults del backend.

dia_semana: 0=lunes ... 6=domingo (alineado con datetime.weekday()).
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from supabase import Client

from app.db.client import get_supabase_client
from app.routers.auth import require_staff_context
from app.services.audit import log_action

router = APIRouter(prefix="/horarios", tags=["horarios"], redirect_slashes=False)


def get_db() -> Client:
    return get_supabase_client()


class HorarioDia(BaseModel):
    dia_semana: int = Field(ge=0, le=6)
    hora_inicio: str  # "HH:MM"
    hora_fin: str
    activo: bool = True


class HorariosBulkPatch(BaseModel):
    """Reemplaza completo el set de horarios de un doctor."""
    horarios: list[HorarioDia]


def _validar_hora(hora: str) -> str:
    parts = hora.split(":")
    if len(parts) < 2:
        raise HTTPException(status_code=400, detail=f"Hora inválida: {hora}. Formato HH:MM")
    try:
        h, m = int(parts[0]), int(parts[1])
        if not (0 <= h <= 23 and 0 <= m <= 59):
            raise ValueError
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Hora inválida: {hora}")
    return f"{h:02d}:{m:02d}:00"


def _validar_acceso_doctor(doctor_id: str, ctx: dict, db: Client) -> int:
    """Valida que ctx puede gestionar horarios de doctor_id. Devuelve consultorio_id."""
    if ctx["es_superadmin"]:
        u = db.table("usuarios").select("consultorio_id").eq("id", doctor_id).single().execute()
        if not u.data:
            raise HTTPException(status_code=404, detail="Doctor no encontrado")
        return u.data["consultorio_id"]

    # admin: puede gestionar cualquier doctor del mismo consultorio
    # odontologo: puede gestionar SOLO su propio horario
    if ctx["rol"] == "odontologo" and doctor_id != ctx["usuario_id"]:
        raise HTTPException(status_code=403, detail="Un odontólogo solo puede editar su propio horario")
    if ctx["rol"] not in ("admin", "odontologo"):
        raise HTTPException(status_code=403, detail="Sin permisos")

    u = db.table("usuarios").select("consultorio_id").eq("id", doctor_id).single().execute()
    if not u.data:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")
    if u.data["consultorio_id"] != ctx["consultorio_id"]:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")
    return u.data["consultorio_id"]


@router.get("/{doctor_id}")
async def obtener_horarios_doctor(
    doctor_id: str,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Lista los 0-7 bloques horarios configurados para un doctor."""
    _validar_acceso_doctor(doctor_id, ctx, db)
    res = (
        db.table("horarios_doctor")
        .select("*")
        .eq("usuario_id", doctor_id)
        .order("dia_semana")
        .execute()
    )
    return res.data or []


@router.put("/{doctor_id}")
async def reemplazar_horarios_doctor(
    doctor_id: str,
    req: HorariosBulkPatch,
    request: Request,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Reemplaza el set completo de horarios del doctor.

    Estrategia simple: borra los actuales y reinserta. Si querés borrar
    solo un día, mandalo con activo=false en lugar de omitirlo.
    """
    consultorio_id = _validar_acceso_doctor(doctor_id, ctx, db)

    # Validar que no haya dos filas para el mismo día
    dias_vistos: set[int] = set()
    for h in req.horarios:
        if h.dia_semana in dias_vistos:
            raise HTTPException(status_code=400, detail=f"Día {h.dia_semana} duplicado")
        dias_vistos.add(h.dia_semana)
        # Validar orden hora_inicio < hora_fin
        if h.hora_inicio >= h.hora_fin:
            raise HTTPException(
                status_code=400,
                detail=f"Día {h.dia_semana}: hora_inicio ({h.hora_inicio}) debe ser anterior a hora_fin ({h.hora_fin})",
            )

    # Borrar existentes y reinsertar (transacción light)
    db.table("horarios_doctor").delete().eq("usuario_id", doctor_id).execute()

    nuevos = []
    if req.horarios:
        nuevos = [
            {
                "usuario_id": doctor_id,
                "consultorio_id": consultorio_id,
                "dia_semana": h.dia_semana,
                "hora_inicio": _validar_hora(h.hora_inicio),
                "hora_fin": _validar_hora(h.hora_fin),
                "activo": h.activo,
            }
            for h in req.horarios
        ]
        db.table("horarios_doctor").insert(nuevos).execute()

    log_action(
        consultorio_id=consultorio_id,
        usuario_id=ctx["usuario_id"],
        accion="update_horarios_doctor",
        recurso_tipo="usuario",
        recurso_id=None,
        request=request,
        metadata={"doctor_id": doctor_id, "dias_configurados": sorted(dias_vistos)},
    )

    return {"ok": True, "total": len(nuevos)}
