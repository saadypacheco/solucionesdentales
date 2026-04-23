"""
M6 — Radiografías e imágenes médicas asociadas al historial clínico.

Tipos: panoramica, periapical, bitewing, lateral, cefalometrica, otra.

Acceso:
- Admin/odontologo: ve/sube/elimina radiografías de pacientes del consultorio
- Recepcionista: NO accede
- Paciente con OTP: ve SUS radiografías (activas)
"""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from supabase import Client

from app.db.client import get_supabase_client
from app.routers.auth import require_paciente, require_staff_context
from app.services.audit import log_action

router = APIRouter(prefix="/radiografias", tags=["radiografias"], redirect_slashes=False)

ROLES_RADIOGRAFIA = ("admin", "odontologo", "superadmin")
TIPOS_VALIDOS = {"panoramica", "periapical", "bitewing", "lateral", "cefalometrica", "otra"}
_ALLOWED_EXTS = {"jpg", "jpeg", "png", "webp", "pdf", "dcm"}
_MAX_BYTES = 15 * 1024 * 1024  # 15 MB — radiografías pueden ser grandes


def get_db() -> Client:
    return get_supabase_client()


# ── Admin ────────────────────────────────────────────────────────────────────

@router.get("/admin")
async def listar_radiografias_paciente(
    paciente_id: int,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Lista radiografías activas de un paciente."""
    if ctx["rol"] not in ROLES_RADIOGRAFIA:
        raise HTTPException(status_code=403, detail="Sin permisos para ver radiografías")

    pac = db.table("pacientes").select("id, consultorio_id").eq("id", paciente_id).single().execute()
    if not pac.data:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    if not ctx["es_superadmin"] and pac.data["consultorio_id"] != ctx["consultorio_id"]:
        raise HTTPException(status_code=403, detail="Paciente de otro consultorio")

    res = (
        db.table("radiografias")
        .select("*, usuarios:uploaded_by(id, nombre)")
        .eq("paciente_id", paciente_id)
        .eq("activa", True)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data or []


@router.post("/admin")
async def subir_radiografia(
    request: Request,
    paciente_id: int = Form(...),
    tipo: str = Form("panoramica"),
    fecha_toma: Optional[str] = Form(default=None),
    notas: Optional[str] = Form(default=None),
    archivo: UploadFile = File(...),
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Sube una radiografía al bucket `radiografias` y crea el registro."""
    if ctx["rol"] not in ROLES_RADIOGRAFIA:
        raise HTTPException(status_code=403, detail="Sin permisos para subir radiografías")

    if tipo not in TIPOS_VALIDOS:
        raise HTTPException(status_code=400, detail=f"Tipo inválido. Opciones: {sorted(TIPOS_VALIDOS)}")

    pac = db.table("pacientes").select("id, consultorio_id").eq("id", paciente_id).single().execute()
    if not pac.data:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    if not ctx["es_superadmin"] and pac.data["consultorio_id"] != ctx["consultorio_id"]:
        raise HTTPException(status_code=403, detail="Paciente de otro consultorio")

    contenido = await archivo.read()
    if len(contenido) > _MAX_BYTES:
        raise HTTPException(status_code=413, detail="Archivo demasiado grande (máx 15 MB)")
    ext = (archivo.filename or "file").rsplit(".", 1)[-1].lower() if archivo.filename and "." in archivo.filename else ""
    if ext not in _ALLOWED_EXTS:
        raise HTTPException(
            status_code=400,
            detail=f"Extensión no permitida. Soportadas: {', '.join(sorted(_ALLOWED_EXTS))}",
        )

    consultorio_id = pac.data["consultorio_id"]
    path = f"{consultorio_id}/{paciente_id}/{uuid.uuid4()}.{ext}"

    try:
        db.storage.from_("radiografias").upload(
            path,
            contenido,
            {"content-type": archivo.content_type or "application/octet-stream"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir: {e}")

    archivo_url = db.storage.from_("radiografias").get_public_url(path)

    res = db.table("radiografias").insert({
        "paciente_id": paciente_id,
        "consultorio_id": consultorio_id,
        "archivo_url": archivo_url,
        "tipo": tipo,
        "fecha_toma": fecha_toma,
        "notas": notas,
        "uploaded_by": ctx["usuario_id"],
    }).execute()

    log_action(
        consultorio_id=consultorio_id,
        usuario_id=ctx["usuario_id"],
        paciente_id=paciente_id,
        accion="upload_radiografia",
        recurso_tipo="radiografia",
        recurso_id=res.data[0]["id"] if res.data else None,
        request=request,
        metadata={"tipo": tipo, "tamano_bytes": len(contenido)},
    )

    return res.data[0] if res.data else {}


@router.delete("/admin/{radiografia_id}")
async def eliminar_radiografia(
    radiografia_id: int,
    request: Request,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Soft delete: marca `activa=False`. El archivo en Storage queda para auditoría."""
    if ctx["rol"] not in ROLES_RADIOGRAFIA:
        raise HTTPException(status_code=403, detail="Sin permisos")

    r = db.table("radiografias").select("consultorio_id, paciente_id").eq("id", radiografia_id).single().execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Radiografía no encontrada")
    if not ctx["es_superadmin"] and r.data["consultorio_id"] != ctx["consultorio_id"]:
        raise HTTPException(status_code=403, detail="Radiografía de otro consultorio")

    db.table("radiografias").update({"activa": False}).eq("id", radiografia_id).execute()

    log_action(
        consultorio_id=r.data["consultorio_id"],
        usuario_id=ctx["usuario_id"],
        paciente_id=r.data["paciente_id"],
        accion="delete_radiografia",
        recurso_tipo="radiografia",
        recurso_id=radiografia_id,
        request=request,
    )
    return {"ok": True}


# ── Paciente (JWT OTP) ───────────────────────────────────────────────────────

@router.get("/paciente")
async def mis_radiografias(
    payload: dict = Depends(require_paciente),
    db: Client = Depends(get_db),
):
    """Paciente ve sus propias radiografías activas."""
    paciente_id = int(payload["sub"])
    res = (
        db.table("radiografias")
        .select("id, archivo_url, tipo, fecha_toma, notas, created_at")
        .eq("paciente_id", paciente_id)
        .eq("activa", True)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data or []
