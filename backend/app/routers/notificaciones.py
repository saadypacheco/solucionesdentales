"""
M12: endpoints de notificaciones in-app.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.db.client import get_supabase_client
from app.routers.auth import require_paciente, require_staff_context

router = APIRouter(prefix="/notificaciones", tags=["notificaciones"], redirect_slashes=False)


def get_db() -> Client:
    return get_supabase_client()


# ── Para staff ──────────────────────────────────────────────────────────────

@router.get("/staff")
async def listar_staff(
    solo_no_leidas: bool = False,
    limit: int = 50,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Lista las notificaciones del usuario staff logueado."""
    limit = min(limit, 200)
    query = (
        db.table("notificaciones")
        .select("*")
        .eq("usuario_id", ctx["usuario_id"])
        .eq("consultorio_id", ctx["consultorio_id"])
    )
    if solo_no_leidas:
        query = query.eq("leida", False)
    res = query.order("created_at", desc=True).limit(limit).execute()
    return res.data or []


@router.get("/staff/count")
async def count_no_leidas_staff(
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Devuelve solo el count de no leídas del staff (para badge en navbar)."""
    res = (
        db.table("notificaciones")
        .select("id", count="exact")
        .eq("usuario_id", ctx["usuario_id"])
        .eq("consultorio_id", ctx["consultorio_id"])
        .eq("leida", False)
        .execute()
    )
    return {"no_leidas": res.count or 0}


@router.patch("/staff/{notif_id}/leida")
async def marcar_leida_staff(
    notif_id: int,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Marca una notificación como leída (verifica ownership)."""
    from datetime import datetime, timezone
    res = (
        db.table("notificaciones")
        .update({"leida": True, "leida_at": datetime.now(timezone.utc).isoformat()})
        .eq("id", notif_id)
        .eq("usuario_id", ctx["usuario_id"])
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    return res.data[0]


@router.patch("/staff/marcar-todas-leidas")
async def marcar_todas_leidas_staff(
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Marca TODAS las notificaciones del staff como leídas."""
    from datetime import datetime, timezone
    res = (
        db.table("notificaciones")
        .update({"leida": True, "leida_at": datetime.now(timezone.utc).isoformat()})
        .eq("usuario_id", ctx["usuario_id"])
        .eq("leida", False)
        .execute()
    )
    return {"marcadas": len(res.data or [])}


# ── Para paciente (con JWT OTP) ──────────────────────────────────────────────

@router.get("/paciente")
async def listar_paciente(
    solo_no_leidas: bool = False,
    limit: int = 50,
    payload: dict = Depends(require_paciente),
    db: Client = Depends(get_db),
):
    """Lista las notificaciones del paciente logueado."""
    limit = min(limit, 200)
    paciente_id = int(payload["sub"])
    query = (
        db.table("notificaciones")
        .select("*")
        .eq("paciente_id", paciente_id)
    )
    if solo_no_leidas:
        query = query.eq("leida", False)
    res = query.order("created_at", desc=True).limit(limit).execute()
    return res.data or []


@router.patch("/paciente/{notif_id}/leida")
async def marcar_leida_paciente(
    notif_id: int,
    payload: dict = Depends(require_paciente),
    db: Client = Depends(get_db),
):
    from datetime import datetime, timezone
    paciente_id = int(payload["sub"])
    res = (
        db.table("notificaciones")
        .update({"leida": True, "leida_at": datetime.now(timezone.utc).isoformat()})
        .eq("id", notif_id)
        .eq("paciente_id", paciente_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    return res.data[0]
