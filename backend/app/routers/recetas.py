"""
M11 Fase B — recetas digitales (PDF simple sin firma certificada).
"""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from supabase import Client

from app.core.encryption import decrypt
from app.db.client import get_supabase_client
from app.routers.auth import require_paciente, require_staff_context
from app.services.audit import log_action
from app.services.notificaciones import notificar
from app.services.pdf_recetas import generar_receta_pdf

router = APIRouter(prefix="/recetas", tags=["recetas"], redirect_slashes=False)


def get_db() -> Client:
    return get_supabase_client()


# ── Crear receta (admin/odontólogo) ──────────────────────────────────────────

class RecetaCreate(BaseModel):
    paciente_id: int
    contenido: str
    turno_id: Optional[int] = None


@router.post("/admin")
async def crear_receta(
    req: RecetaCreate,
    request: Request,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """
    Crea una receta para un paciente del consultorio.
    El odontólogo logueado figura como autor.
    Genera el PDF, lo sube a Storage privado, y notifica al paciente.
    """
    consultorio_id = ctx["consultorio_id"]

    # Validar paciente del consultorio
    pac = (
        db.table("pacientes")
        .select("id, nombre, consultorio_id")
        .eq("id", req.paciente_id)
        .single()
        .execute()
    )
    if not pac.data:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    if not ctx["es_superadmin"] and pac.data["consultorio_id"] != consultorio_id:
        raise HTTPException(status_code=403, detail="Paciente de otro consultorio")

    # Datos para el PDF
    odontologo = (
        db.table("usuarios")
        .select("id, nombre, especialidades")
        .eq("id", ctx["usuario_id"])
        .single()
        .execute()
    )
    consultorio = (
        db.table("consultorios")
        .select("nombre, direccion")
        .eq("id", consultorio_id)
        .single()
        .execute()
    )

    pdf_bytes = generar_receta_pdf(
        contenido=req.contenido,
        paciente_nombre=pac.data.get("nombre") or "Paciente",
        odontologo_nombre=odontologo.data.get("nombre") if odontologo.data else "Odontólogo",
        consultorio_nombre=consultorio.data.get("nombre") if consultorio.data else "Consultorio",
        consultorio_direccion=(consultorio.data or {}).get("direccion"),
    )

    # Insertar fila para tener el id
    inserted = (
        db.table("recetas")
        .insert({
            "consultorio_id": consultorio_id,
            "turno_id": req.turno_id,
            "paciente_id": req.paciente_id,
            "odontologo_id": ctx["usuario_id"],
            "contenido": req.contenido,
        })
        .execute()
    )
    receta = inserted.data[0]

    # Subir PDF a bucket recetas (privado)
    storage_path = f"{consultorio_id}/{req.paciente_id}/{receta['id']}-{uuid.uuid4().hex[:8]}.pdf"
    try:
        db.storage.from_("recetas").upload(
            storage_path,
            pdf_bytes,
            {"content-type": "application/pdf"},
        )
        pdf_url = db.storage.from_("recetas").get_public_url(storage_path)
        db.table("recetas").update({"pdf_url": pdf_url}).eq("id", receta["id"]).execute()
        receta["pdf_url"] = pdf_url
    except Exception as e:
        # No bloqueamos la receta si el upload falla; queda sin PDF
        log_action(
            consultorio_id=consultorio_id,
            usuario_id=ctx["usuario_id"],
            accion="receta_pdf_upload_failed",
            recurso_tipo="receta",
            recurso_id=receta["id"],
            metadata={"error": str(e)},
        )

    log_action(
        consultorio_id=consultorio_id,
        usuario_id=ctx["usuario_id"],
        paciente_id=req.paciente_id,
        accion="create_receta",
        recurso_tipo="receta",
        recurso_id=receta["id"],
        request=request,
    )

    notificar(
        consultorio_id=consultorio_id,
        paciente_id=req.paciente_id,
        tipo="receta_disponible",
        titulo="Receta disponible",
        mensaje="Tu odontólogo te dejó una nueva receta.",
        link="/mis-recetas",
        metadata={"receta_id": receta["id"]},
        prioridad="normal",
    )

    return receta


# ── Listados ────────────────────────────────────────────────────────────────

@router.get("/admin")
async def listar_admin(
    paciente_id: Optional[int] = None,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Recetas del consultorio. Filtro opcional por paciente."""
    query = db.table("recetas").select("*, pacientes(id, nombre)").eq("activa", True)
    if not ctx["es_superadmin"]:
        query = query.eq("consultorio_id", ctx["consultorio_id"])
    if paciente_id:
        query = query.eq("paciente_id", paciente_id)
    res = query.order("created_at", desc=True).execute()
    return res.data or []


@router.get("/paciente")
async def listar_paciente(
    payload: dict = Depends(require_paciente),
    db: Client = Depends(get_db),
):
    """Recetas del paciente logueado (con JWT OTP)."""
    paciente_id = int(payload["sub"])
    res = (
        db.table("recetas")
        .select("*, usuarios(id, nombre)")
        .eq("paciente_id", paciente_id)
        .eq("activa", True)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data or []


@router.delete("/admin/{receta_id}")
async def archivar_receta(
    receta_id: int,
    request: Request,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Soft delete: marca la receta como inactiva."""
    rec = db.table("recetas").select("consultorio_id, paciente_id").eq("id", receta_id).single().execute()
    if not rec.data:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    if not ctx["es_superadmin"] and rec.data["consultorio_id"] != ctx["consultorio_id"]:
        raise HTTPException(status_code=403, detail="Receta de otro consultorio")

    db.table("recetas").update({"activa": False}).eq("id", receta_id).execute()
    log_action(
        consultorio_id=rec.data["consultorio_id"],
        usuario_id=ctx["usuario_id"],
        paciente_id=rec.data["paciente_id"],
        accion="archive_receta",
        recurso_tipo="receta",
        recurso_id=receta_id,
        request=request,
    )
    return {"ok": True}
