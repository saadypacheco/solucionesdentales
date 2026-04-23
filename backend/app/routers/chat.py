"""
M11 Fase B — chat asincrónico paciente ↔ odontólogo.

Notas:
- No es realtime (usa polling como notificaciones — Realtime queda para más adelante).
- Las conversaciones son entre 1 paciente y 1 odontólogo. Si el paciente se
  atendió con 2 odontólogos, va a tener 2 conversaciones distintas.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from supabase import Client

from app.db.client import get_supabase_client
from app.routers.auth import require_paciente, require_staff_context
from app.services.notificaciones import notificar

router = APIRouter(prefix="/chat", tags=["chat"], redirect_slashes=False)


def get_db() -> Client:
    return get_supabase_client()


# ── Schemas ──────────────────────────────────────────────────────────────────

class MensajeStaff(BaseModel):
    paciente_id: int
    mensaje: str
    archivo_url: Optional[str] = None


class MensajePaciente(BaseModel):
    odontologo_id: str
    mensaje: str
    archivo_url: Optional[str] = None


# ── Lado staff (odontólogo / admin / recepcionista) ──────────────────────────

@router.get("/admin/conversaciones")
async def listar_conversaciones_staff(
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """
    Lista las conversaciones del odontólogo logueado.
    Devuelve un resumen por paciente (último mensaje + count no leídos).
    """
    consultorio_id = ctx["consultorio_id"]
    odontologo_id = ctx["usuario_id"]

    # Traer todos los mensajes del odontólogo, agrupar en cliente
    res = (
        db.table("chat_paciente_odontologo")
        .select("id, paciente_id, autor, mensaje, leido, created_at, pacientes(id, nombre)")
        .eq("consultorio_id", consultorio_id)
        .eq("odontologo_id", odontologo_id)
        .order("created_at", desc=True)
        .limit(500)
        .execute()
    )

    # Agrupar por paciente_id manteniendo el más reciente y contando no leídos
    convos: dict[int, dict] = {}
    for m in (res.data or []):
        pid = m["paciente_id"]
        if pid not in convos:
            convos[pid] = {
                "paciente_id": pid,
                "paciente_nombre": (m.get("pacientes") or {}).get("nombre") or "Paciente",
                "ultimo_mensaje": m["mensaje"],
                "ultimo_autor": m["autor"],
                "ultimo_at": m["created_at"],
                "no_leidos": 0,
            }
        # Solo contamos como "no leídos" los que el paciente envió y no se han marcado
        if m["autor"] == "paciente" and not m["leido"]:
            convos[pid]["no_leidos"] += 1

    return sorted(convos.values(), key=lambda c: c["ultimo_at"], reverse=True)


@router.get("/admin/{paciente_id}")
async def listar_mensajes_staff(
    paciente_id: int,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Mensajes de la conversación con un paciente. Marca leídos del paciente."""
    consultorio_id = ctx["consultorio_id"]
    odontologo_id = ctx["usuario_id"]

    # Marcar mensajes del paciente como leídos
    db.table("chat_paciente_odontologo") \
        .update({"leido": True}) \
        .eq("paciente_id", paciente_id) \
        .eq("odontologo_id", odontologo_id) \
        .eq("autor", "paciente") \
        .eq("leido", False) \
        .execute()

    res = (
        db.table("chat_paciente_odontologo")
        .select("*")
        .eq("consultorio_id", consultorio_id)
        .eq("paciente_id", paciente_id)
        .eq("odontologo_id", odontologo_id)
        .order("created_at")
        .execute()
    )
    return res.data or []


@router.post("/admin")
async def enviar_mensaje_staff(
    req: MensajeStaff,
    request: Request,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Odontólogo envía mensaje al paciente."""
    consultorio_id = ctx["consultorio_id"]
    odontologo_id = ctx["usuario_id"]

    # Validar paciente del consultorio
    pac = db.table("pacientes").select("id, consultorio_id").eq("id", req.paciente_id).single().execute()
    if not pac.data:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    if not ctx["es_superadmin"] and pac.data["consultorio_id"] != consultorio_id:
        raise HTTPException(status_code=403, detail="Paciente de otro consultorio")

    res = db.table("chat_paciente_odontologo").insert({
        "consultorio_id": consultorio_id,
        "paciente_id": req.paciente_id,
        "odontologo_id": odontologo_id,
        "autor": "odontologo",
        "mensaje": req.mensaje,
        "archivo_url": req.archivo_url,
    }).execute()

    # Notificar al paciente
    notificar(
        consultorio_id=consultorio_id,
        paciente_id=req.paciente_id,
        tipo="nuevo_chat",
        titulo="Nuevo mensaje de tu odontólogo",
        mensaje=req.mensaje[:80] + ('…' if len(req.mensaje) > 80 else ''),
        link="/mi-chat",
        metadata={"odontologo_id": odontologo_id},
        prioridad="normal",
    )

    return res.data[0] if res.data else {}


# ── Lado paciente (JWT OTP) ──────────────────────────────────────────────────

@router.get("/paciente/conversaciones")
async def listar_conversaciones_paciente(
    payload: dict = Depends(require_paciente),
    db: Client = Depends(get_db),
):
    """Conversaciones que el paciente tuvo con odontólogos."""
    paciente_id = int(payload["sub"])

    res = (
        db.table("chat_paciente_odontologo")
        .select("id, odontologo_id, autor, mensaje, leido, created_at, usuarios(id, nombre)")
        .eq("paciente_id", paciente_id)
        .order("created_at", desc=True)
        .limit(500)
        .execute()
    )

    convos: dict[str, dict] = {}
    for m in (res.data or []):
        oid = m["odontologo_id"]
        if oid not in convos:
            convos[oid] = {
                "odontologo_id": oid,
                "odontologo_nombre": (m.get("usuarios") or {}).get("nombre") or "Odontólogo",
                "ultimo_mensaje": m["mensaje"],
                "ultimo_autor": m["autor"],
                "ultimo_at": m["created_at"],
                "no_leidos": 0,
            }
        if m["autor"] == "odontologo" and not m["leido"]:
            convos[oid]["no_leidos"] += 1

    return sorted(convos.values(), key=lambda c: c["ultimo_at"], reverse=True)


@router.get("/paciente/{odontologo_id}")
async def listar_mensajes_paciente(
    odontologo_id: str,
    payload: dict = Depends(require_paciente),
    db: Client = Depends(get_db),
):
    """Mensajes de la conversación. Marca leídos los del odontólogo."""
    paciente_id = int(payload["sub"])

    db.table("chat_paciente_odontologo") \
        .update({"leido": True}) \
        .eq("paciente_id", paciente_id) \
        .eq("odontologo_id", odontologo_id) \
        .eq("autor", "odontologo") \
        .eq("leido", False) \
        .execute()

    res = (
        db.table("chat_paciente_odontologo")
        .select("*")
        .eq("paciente_id", paciente_id)
        .eq("odontologo_id", odontologo_id)
        .order("created_at")
        .execute()
    )
    return res.data or []


@router.post("/paciente")
async def enviar_mensaje_paciente(
    req: MensajePaciente,
    payload: dict = Depends(require_paciente),
    db: Client = Depends(get_db),
):
    """Paciente envía mensaje al odontólogo."""
    paciente_id = int(payload["sub"])

    # Sacar consultorio_id del paciente
    pac = db.table("pacientes").select("consultorio_id").eq("id", paciente_id).single().execute()
    if not pac.data:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    consultorio_id = pac.data["consultorio_id"]

    res = db.table("chat_paciente_odontologo").insert({
        "consultorio_id": consultorio_id,
        "paciente_id": paciente_id,
        "odontologo_id": req.odontologo_id,
        "autor": "paciente",
        "mensaje": req.mensaje,
        "archivo_url": req.archivo_url,
    }).execute()

    # Notificar al odontólogo
    notificar(
        consultorio_id=consultorio_id,
        usuario_id=req.odontologo_id,
        tipo="nuevo_chat",
        titulo="Nuevo mensaje de paciente",
        mensaje=req.mensaje[:80] + ('…' if len(req.mensaje) > 80 else ''),
        link="/admin/chat",
        metadata={"paciente_id": paciente_id},
        prioridad="normal",
    )

    return res.data[0] if res.data else {}
