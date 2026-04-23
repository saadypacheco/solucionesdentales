from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from app.db.client import get_supabase_client
from app.services.agente import get_respuesta, stream_respuesta
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


@router.post("/mensaje-stream")
async def recibir_mensaje_stream(
    req: MensajeRequest,
    consultorio_id: int = Depends(resolve_consultorio_publico),
):
    """Versión streaming: devuelve trozos de texto plano a medida que Gemini los genera.
    El frontend lee el body como ReadableStream y los va concatenando.
    Al finalizar, persiste el mensaje completo."""
    db = get_supabase_client()

    # Sesión (igual que /mensaje)
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

    db.table("mensajes_agente").insert({
        "sesion_id": sesion_id,
        "rol": "user",
        "contenido": req.mensaje,
        "es_bot": False,
    }).execute()

    msgs = db.table("mensajes_agente") \
        .select("rol, contenido") \
        .eq("sesion_id", sesion_id) \
        .order("created_at", desc=True) \
        .limit(MAX_HISTORIAL) \
        .execute()
    historial = list(reversed(msgs.data or []))
    if not historial or historial[-1]["contenido"] != req.mensaje:
        historial.append({"rol": "user", "contenido": req.mensaje})

    def generar():
        completo = []
        try:
            for chunk in stream_respuesta(historial):
                if chunk:
                    completo.append(chunk)
                    yield chunk
        finally:
            # Persistir la respuesta completa al cerrar el stream
            try:
                texto_final = "".join(completo).strip()
                if texto_final:
                    db.table("mensajes_agente").insert({
                        "sesion_id": sesion_id,
                        "rol": "model",
                        "contenido": texto_final,
                        "es_bot": True,
                    }).execute()
            except Exception:
                pass

    return StreamingResponse(
        generar(),
        media_type="text/plain; charset=utf-8",
        headers={"X-Sesion-Id": str(sesion_id), "Cache-Control": "no-cache, no-transform"},
    )
