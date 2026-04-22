"""
Panel del SaaS: rol superadmin que opera sobre todos los consultorios.
Para revisar onboarding, aprobar/rechazar docs, suspender, etc.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from supabase import Client

from app.db.client import get_supabase_client
from app.routers.auth import require_superadmin
from app.services.audit import log_action
from app.services.compliance import recalcular_estado_compliance

router = APIRouter(prefix="/superadmin", tags=["superadmin"], redirect_slashes=False)


def get_db() -> Client:
    return get_supabase_client()


# ── Listados ────────────────────────────────────────────────────────────────

@router.get("/consultorios")
async def listar_consultorios(
    estado: Optional[str] = None,
    pais: Optional[str] = None,
    _: None = Depends(require_superadmin),
    db: Client = Depends(get_db),
):
    """Lista todos los consultorios del SaaS, filtrable por estado y país."""
    query = db.table("consultorios").select("*, paises(codigo, nombre)")
    if estado:
        query = query.eq("estado_compliance", estado)
    if pais:
        query = query.eq("pais_codigo", pais)
    res = query.order("created_at", desc=True).execute()
    return res.data or []


@router.get("/consultorios/{consultorio_id}")
async def obtener_consultorio(
    consultorio_id: int,
    _: None = Depends(require_superadmin),
    db: Client = Depends(get_db),
):
    res = (
        db.table("consultorios")
        .select("*, paises(codigo, nombre, idioma_default, moneda, timezone_default, modelo_ia_default)")
        .eq("id", consultorio_id)
        .single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Consultorio no encontrado")
    return res.data


@router.get("/consultorios/{consultorio_id}/documentos")
async def listar_documentos(
    consultorio_id: int,
    _: None = Depends(require_superadmin),
    db: Client = Depends(get_db),
):
    """Documentos subidos por un consultorio."""
    res = (
        db.table("documentos_consultorio")
        .select("*")
        .eq("consultorio_id", consultorio_id)
        .order("fecha_subida", desc=True)
        .execute()
    )
    return res.data or []


# ── Aprobar / rechazar documentos ────────────────────────────────────────────

class RevisionRequest(BaseModel):
    estado: str  # 'aprobado' | 'rechazado'
    observaciones: Optional[str] = None


@router.patch("/documentos/{documento_id}")
async def revisar_documento(
    documento_id: int,
    req: RevisionRequest,
    request: Request,
    _: None = Depends(require_superadmin),
    db: Client = Depends(get_db),
):
    """Aprueba o rechaza un documento de compliance."""
    if req.estado not in ("aprobado", "rechazado"):
        raise HTTPException(status_code=400, detail="estado debe ser 'aprobado' o 'rechazado'")

    # Obtener consultorio_id antes de actualizar (para log)
    doc = db.table("documentos_consultorio").select("consultorio_id, tipo_documento").eq("id", documento_id).single().execute()
    if not doc.data:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    consultorio_id = doc.data["consultorio_id"]

    # Quien revisó (sub del JWT del superadmin)
    # No accedemos a credentials acá, lo dejamos NULL por ahora — se completa en metadata
    update = {
        "estado": req.estado,
        "observaciones": req.observaciones,
        "revisado_at": datetime.now(timezone.utc).isoformat(),
    }
    res = db.table("documentos_consultorio").update(update).eq("id", documento_id).execute()

    log_action(
        consultorio_id=consultorio_id,
        accion=f"{req.estado}_documento",
        recurso_tipo="documento_consultorio",
        recurso_id=documento_id,
        request=request,
        metadata={"tipo_documento": doc.data["tipo_documento"], "observaciones": req.observaciones},
    )

    # Recalcular estado del consultorio
    recalcular_estado_compliance(consultorio_id)

    return res.data[0] if res.data else {}


# ── Suspender / reactivar consultorio ───────────────────────────────────────

@router.patch("/consultorios/{consultorio_id}/suspender")
async def suspender_consultorio(
    consultorio_id: int,
    request: Request,
    _: None = Depends(require_superadmin),
    db: Client = Depends(get_db),
):
    res = db.table("consultorios").update({"estado_compliance": "suspendido"}).eq("id", consultorio_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Consultorio no encontrado")
    log_action(
        consultorio_id=consultorio_id,
        accion="suspend_consultorio",
        recurso_tipo="consultorio",
        recurso_id=consultorio_id,
        request=request,
    )
    return res.data[0]


@router.patch("/consultorios/{consultorio_id}/reactivar")
async def reactivar_consultorio(
    consultorio_id: int,
    request: Request,
    _: None = Depends(require_superadmin),
    db: Client = Depends(get_db),
):
    nuevo_estado = recalcular_estado_compliance(consultorio_id)
    log_action(
        consultorio_id=consultorio_id,
        accion="reactivate_consultorio",
        recurso_tipo="consultorio",
        recurso_id=consultorio_id,
        request=request,
        metadata={"nuevo_estado": nuevo_estado},
    )
    return {"consultorio_id": consultorio_id, "estado_compliance": nuevo_estado}


# ── Audit log ───────────────────────────────────────────────────────────────

@router.get("/audit-log")
async def listar_audit_log(
    consultorio_id: Optional[int] = None,
    accion: Optional[str] = None,
    limit: int = 100,
    _: None = Depends(require_superadmin),
    db: Client = Depends(get_db),
):
    """Audit log filtrable por consultorio y acción. Limitado a 1000 entries por query."""
    limit = min(limit, 1000)
    query = db.table("audit_log").select("*").order("created_at", desc=True).limit(limit)
    if consultorio_id is not None:
        query = query.eq("consultorio_id", consultorio_id)
    if accion:
        query = query.eq("accion", accion)
    res = query.execute()
    return res.data or []
