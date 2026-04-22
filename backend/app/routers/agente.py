from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from app.db.client import get_supabase_client
from app.services.agente import get_respuesta
from app.core.tenant import resolve_consultorio_publico

router = APIRouter(prefix="/agente", tags=["agente"], redirect_slashes=False)

MAX_HISTORIAL = 10


class MensajeRequest(BaseModel):
    session_id: str
    mensaje: str
    paciente_id: Optional[int] = None


@router.post("/mensaje")
async def recibir_mensaje(
    req: MensajeRequest,
    consultorio_id: int = Depends(resolve_consultorio_publico),
):
    db = get_supabase_client()

    # Obtener o crear sesión (filtrada por consultorio)
    sesion = (
        db.table("sesiones_agente")
        .select("id")
        .eq("session_id", req.session_id)
        .eq("consultorio_id", consultorio_id)
        .execute()
    )
    if sesion.data:
        sesion_id = sesion.data[0]["id"]
    else:
        nueva = db.table("sesiones_agente").insert({
            "session_id": req.session_id,
            "paciente_id": req.paciente_id,
            "consultorio_id": consultorio_id,
        }).execute()
        sesion_id = nueva.data[0]["id"]

    # Guardar mensaje del usuario
    db.table("mensajes_agente").insert({
        "sesion_id": sesion_id,
        "rol": "user",
        "contenido": req.mensaje,
        "es_bot": False,
    }).execute()

    # Cargar historial reciente
    msgs = db.table("mensajes_agente") \
        .select("rol, contenido") \
        .eq("sesion_id", sesion_id) \
        .order("created_at", desc=True) \
        .limit(MAX_HISTORIAL) \
        .execute()

    historial = list(reversed(msgs.data or []))

    # Si el último no es el mensaje actual, agregarlo
    if not historial or historial[-1]["contenido"] != req.mensaje:
        historial.append({"rol": "user", "contenido": req.mensaje})

    # Llamar al agente (TODO Fase 3+: pasar config_ia del consultorio)
    respuesta = get_respuesta(historial)

    # Guardar respuesta del bot
    db.table("mensajes_agente").insert({
        "sesion_id": sesion_id,
        "rol": "model",
        "contenido": respuesta,
        "es_bot": True,
    }).execute()

    return {"respuesta": respuesta, "sesion_id": sesion_id}
