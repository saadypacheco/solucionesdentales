"""
Servicio de agente IA — Soluciones Dentales.
Para migrar a Claude: reemplazar solo la función _llamar_gemini.
"""
import os
import google.generativeai as genai
from app.db.client import get_supabase_client

# ── System prompt base (puede sobreescribirse desde config_ia en DB) ──
SYSTEM_PROMPT_DEFAULT = """Sos la recepcionista virtual de Soluciones Dentales, un consultorio odontológico argentino.
Tu rol es atender pacientes actuales y potenciales, orientarlos, dar presupuestos aproximados y ayudar a agendar turnos.

Información del consultorio:
- Especialidades: estética dental, implantes, ortodoncia, blanqueamiento, odontología general, urgencias
- Horarios: lunes a viernes 9 a 18hs, sábados 9 a 13hs

Flujo de atención:
1. Saludá cálidamente
2. Detectá urgencia (dolor agudo, trauma) → si sí, derivar INMEDIATAMENTE a WhatsApp
3. Clasificá la consulta (estética / funcional / precio / turno)
4. Hacé 1 pregunta específica para entender el caso
5. Dá orientación + rango de precio aproximado si lo tenés en el contexto
6. Ofrecé agendar turno con frases como "¿Querés que te busque un turno?" o "Puedo agendar una consulta sin compromiso"

Reglas CRÍTICAS:
- Español rioplatense (vos, te, acá)
- Máximo 3 oraciones por respuesta — sé concisa
- Nunca des diagnósticos definitivos — solo orientativos
- Si el sistema te provee precios, usá esos rangos
- Si el agente puede mostrar una foto de caso similar, mencionalo
- Ante duda médica compleja → derivar a la profesional
- Si el paciente dice "quiero turno" o "agendar" → respondé con "¡Perfecto! Podés agendar directo acá:" seguido de un enlace
"""


def _get_system_prompt(db) -> str:
    """Lee el system prompt desde config_ia en DB. Si no existe, usa el default."""
    try:
        res = db.table("config_ia").select("valor").eq("clave", "system_prompt").execute()
        if res.data:
            return res.data[0]["valor"]
    except Exception:
        pass
    return SYSTEM_PROMPT_DEFAULT


def _get_rangos_precios(db) -> str:
    """Lee los rangos de precios desde config_ia en DB."""
    try:
        res = db.table("config_ia").select("valor").eq("clave", "rangos_precios").execute()
        if res.data:
            return res.data[0]["valor"]
    except Exception:
        pass
    return ""


def _get_casos_relevantes(db, mensaje: str) -> str:
    """Busca casos de galería aprobados relevantes al mensaje del paciente."""
    keywords = {
        "estetica": ["estétic", "sonris", "carilla", "veneer"],
        "blanqueamiento": ["blanc", "amarill", "oscur", "color"],
        "ortodoncia": ["bracket", "ortodo", "diente torcid", "alinear"],
        "implante": ["implant", "perdí", "falta", "molar", "extracción"],
        "limpieza": ["limpieza", "sarro", "placa", "higiene"],
    }
    tipo_detectado = None
    msg_lower = mensaje.lower()
    for tipo, kw_list in keywords.items():
        if any(kw in msg_lower for kw in kw_list):
            tipo_detectado = tipo
            break

    if not tipo_detectado:
        return ""

    try:
        casos = db.table("casos_galeria") \
            .select("tipo_tratamiento, descripcion, duracion_tratamiento") \
            .eq("aprobado", True) \
            .eq("tipo_tratamiento", tipo_detectado) \
            .limit(2) \
            .execute().data or []

        if not casos:
            return ""

        lineas = [f"Casos de galería disponibles para {tipo_detectado}:"]
        for c in casos:
            lineas.append(f"- {c['descripcion']} (duración: {c.get('duracion_tratamiento', 'a consultar')})")
        lineas.append("Podés mencionar que tenemos fotos de antes/después disponibles en /galeria")
        return "\n".join(lineas)
    except Exception:
        return ""


def _construir_contexto(db, mensaje: str) -> str:
    """Construye contexto dinámico: precios + casos relevantes."""
    partes = []

    rangos = _get_rangos_precios(db)
    if rangos:
        partes.append(f"Rangos de precios actuales:\n{rangos}")

    casos = _get_casos_relevantes(db, mensaje)
    if casos:
        partes.append(casos)

    return "\n\n".join(partes)


_FALLBACK_SIN_KEY = "En este momento no puedo responder automáticamente. Contactanos por WhatsApp para una respuesta inmediata. 💬"
_FALLBACK_ERROR = "En este momento no puedo responder. Contactanos directo por WhatsApp. 💬"


def _build_chat(system: str, historial: list[dict]):
    """Configura modelo + historial. Devuelve (chat, ultimo_mensaje) o (None, fallback)."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None, _FALLBACK_SIN_KEY

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        system_instruction=system,
    )
    history = [{"role": msg["rol"], "parts": [msg["contenido"]]} for msg in historial[:-1]]
    chat = model.start_chat(history=history)
    return chat, historial[-1]["contenido"]


def _llamar_gemini(system: str, historial: list[dict]) -> str:
    chat, ultimo = _build_chat(system, historial)
    if chat is None:
        return ultimo  # fallback
    try:
        response = chat.send_message(
            ultimo,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=350,
                temperature=0.75,
            ),
        )
        return response.text.strip()
    except Exception:
        return _FALLBACK_ERROR


def stream_respuesta(historial: list[dict], contexto_extra: str | None = None):
    """Generador que yieldea trozos de texto a medida que Gemini los produce.
    Para servir como Server-Sent Events o como ReadableStream."""
    db = get_supabase_client()
    system_prompt = _get_system_prompt(db)
    ultimo_mensaje = historial[-1]["contenido"] if historial else ""
    contexto_db = _construir_contexto(db, ultimo_mensaje)

    system_final = system_prompt
    if contexto_db:
        system_final += f"\n\n---\nContexto del sistema:\n{contexto_db}"
    if contexto_extra:
        system_final += f"\n\n{contexto_extra}"

    chat, ultimo = _build_chat(system_final, historial)
    if chat is None:
        yield ultimo  # fallback completo de una
        return

    try:
        response = chat.send_message(
            ultimo,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=350,
                temperature=0.75,
            ),
            stream=True,
        )
        for chunk in response:
            if chunk.text:
                yield chunk.text
    except Exception:
        yield _FALLBACK_ERROR


def get_respuesta(historial: list[dict], contexto_extra: str | None = None) -> str:
    """
    Genera una respuesta del agente dado el historial de mensajes.
    Enriquece el contexto con precios y casos de galería desde la DB.
    """
    db = get_supabase_client()

    system_prompt = _get_system_prompt(db)

    # Mensaje actual del usuario (el último del historial)
    ultimo_mensaje = historial[-1]["contenido"] if historial else ""

    contexto_db = _construir_contexto(db, ultimo_mensaje)

    system_final = system_prompt
    if contexto_db:
        system_final += f"\n\n---\nContexto del sistema:\n{contexto_db}"
    if contexto_extra:
        system_final += f"\n\n{contexto_extra}"

    return _llamar_gemini(system_final, historial)
