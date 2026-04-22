"""
M13: gestión de consultorios. Onboarding y compliance del cliente.
"""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel, EmailStr
from supabase import Client

from app.db.client import get_supabase_client
from app.routers.auth import require_staff_context
from app.services.audit import log_action
from app.services.compliance import obtener_checklist, recalcular_estado_compliance

router = APIRouter(prefix="/consultorios", tags=["consultorios"], redirect_slashes=False)


def get_db() -> Client:
    return get_supabase_client()


# ── Schemas ─────────────────────────────────────────────────────────────────

class OnboardingRequest(BaseModel):
    nombre: str
    pais_codigo: str
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    wa_numero: Optional[str] = None
    identificacion_fiscal: Optional[str] = None
    matricula_titular: Optional[str] = None
    odontologo_titular_id: Optional[str] = None
    idioma_override: Optional[str] = None
    timezone_override: Optional[str] = None


# ── Endpoints públicos / paciente / staff ────────────────────────────────────

@router.get("/paises")
async def listar_paises(db: Client = Depends(get_db)):
    """Catálogo público de países soportados (para wizard onboarding)."""
    res = db.table("paises").select("codigo, nombre, idioma_default, moneda").eq("activo", True).order("nombre").execute()
    return res.data or []


@router.get("/mi-consultorio")
async def mi_consultorio(ctx: dict = Depends(require_staff_context), db: Client = Depends(get_db)):
    """Datos del consultorio del staff logueado."""
    res = (
        db.table("consultorios")
        .select("*, paises(codigo, nombre, idioma_default, moneda, timezone_default, modelo_ia_default, requiere_audit_log, requiere_consentimiento_explicito, requiere_firma_receta)")
        .eq("id", ctx["consultorio_id"])
        .single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Consultorio no encontrado")
    return res.data


@router.get("/mi-consultorio/checklist")
async def mi_consultorio_checklist(
    idioma: str = "es",
    ctx: dict = Depends(require_staff_context),
):
    """Checklist de compliance del consultorio del staff."""
    return obtener_checklist(ctx["consultorio_id"], idioma=idioma)


# ── Onboarding (creación de un consultorio nuevo) ───────────────────────────

@router.post("/onboarding")
async def onboarding(
    req: OnboardingRequest,
    request: Request,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """
    Crea un consultorio nuevo. Solo superadmin (creación de cliente del SaaS).
    Para que un staff existente cree un nuevo consultorio (multi-sede en el futuro)
    también se puede permitir, pero por ahora restringido a superadmin.
    """
    if not ctx["es_superadmin"]:
        raise HTTPException(status_code=403, detail="Solo superadmin puede crear consultorios")

    # Validar país existe
    pais = db.table("paises").select("codigo").eq("codigo", req.pais_codigo).single().execute()
    if not pais.data:
        raise HTTPException(status_code=400, detail=f"País {req.pais_codigo} no soportado")

    data = req.model_dump(exclude_none=True)
    data["estado_compliance"] = "onboarding"

    res = db.table("consultorios").insert(data).execute()
    consultorio = res.data[0]

    log_action(
        consultorio_id=consultorio["id"],
        accion="create_consultorio",
        usuario_id=ctx["usuario_id"],
        recurso_tipo="consultorio",
        recurso_id=consultorio["id"],
        request=request,
    )

    return consultorio


# ── Documentos de compliance ────────────────────────────────────────────────

@router.post("/mi-consultorio/documentos")
async def subir_documento(
    request: Request,
    tipo_documento: str = Form(...),
    archivo: UploadFile = File(...),
    fecha_vencimiento: Optional[str] = Form(default=None),
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Sube (o reemplaza) un documento de compliance del consultorio del staff."""
    consultorio_id = ctx["consultorio_id"]

    # Validar que el tipo es uno de los requeridos para el país del consultorio
    cons = db.table("consultorios").select("pais_codigo").eq("id", consultorio_id).single().execute()
    if not cons.data:
        raise HTTPException(status_code=404, detail="Consultorio no encontrado")
    pais_codigo = cons.data["pais_codigo"]

    req_doc = (
        db.table("documentos_requeridos_pais")
        .select("tipo_documento, vencimiento_meses")
        .eq("pais_codigo", pais_codigo)
        .eq("tipo_documento", tipo_documento)
        .execute()
    )
    if not req_doc.data:
        raise HTTPException(
            status_code=400,
            detail=f"El tipo de documento '{tipo_documento}' no es requerido para {pais_codigo}",
        )

    # Upload a Supabase Storage (bucket documentos_compliance, privado)
    contenido = await archivo.read()
    ext = archivo.filename.rsplit(".", 1)[-1] if archivo.filename and "." in archivo.filename else "pdf"
    storage_path = f"{consultorio_id}/{tipo_documento}/{uuid.uuid4()}.{ext}"

    try:
        db.storage.from_("documentos_compliance").upload(
            storage_path,
            contenido,
            {"content-type": archivo.content_type or "application/octet-stream"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir archivo: {e}")

    # URL pública (se cambiará a signed URL en frontend cuando se vea)
    archivo_url = db.storage.from_("documentos_compliance").get_public_url(storage_path)

    # Upsert en documentos_consultorio (reemplaza si ya existe)
    payload = {
        "consultorio_id": consultorio_id,
        "tipo_documento": tipo_documento,
        "archivo_url": archivo_url,
        "fecha_vencimiento": fecha_vencimiento,
        "estado": "pendiente_revision",
        "observaciones": None,
        "revisado_por": None,
        "revisado_at": None,
    }
    res = (
        db.table("documentos_consultorio")
        .upsert(payload, on_conflict="consultorio_id,tipo_documento")
        .execute()
    )

    log_action(
        consultorio_id=consultorio_id,
        accion="upload_documento",
        usuario_id=ctx["usuario_id"],
        recurso_tipo="documento_consultorio",
        recurso_id=res.data[0]["id"] if res.data else None,
        request=request,
        metadata={"tipo_documento": tipo_documento},
    )

    # Recalcular estado compliance del consultorio
    recalcular_estado_compliance(consultorio_id)

    return res.data[0] if res.data else {}
