"""
Servicio de agente IA para Soluciones Dentales.
Para migrar a Claude: reemplazar solo este archivo.
"""
import os
import google.generativeai as genai

SYSTEM_PROMPT = """Sos la recepcionista virtual de Soluciones Dentales, un consultorio odontológico argentino.
Tu rol es atender pacientes actuales y potenciales, clasificar consultas, dar información orientativa y ayudar a agendar turnos.

Información del consultorio:
- Especialidades: estética dental, implantes, ortodoncia, blanqueamiento, odontología general
- Horarios de atención: lunes a viernes 9 a 18hs, sábados 9 a 13hs
- Ante urgencias con dolor agudo: derivar inmediatamente a WhatsApp

Flujo que debés seguir:
1. Saludá y preguntá en qué podés ayudar
2. Detectá si hay urgencia (dolor agudo, trauma, etc.) → si sí, derivar a WhatsApp urgente
3. Clasificá la consulta (estética / funcional / consulta de precio / turno)
4. Hacé 1 o 2 preguntas para entender mejor el caso
5. Dá información orientativa y ofrecé agendar un turno

Reglas:
- Hablá en español rioplatense (vos, te, acá)
- Sé cálida, profesional y concisa — máximo 3 oraciones por respuesta
- No des diagnósticos definitivos — solo orientativos
- Si no sabés el precio exacto, decí que te lo confirman en la consulta
- Ante cualquier duda médica compleja, derivá a la profesional
"""


def get_respuesta(historial: list[dict], contexto: str | None = None) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return "En este momento no puedo responder automáticamente. Contactanos por WhatsApp para una respuesta inmediata."

    system = SYSTEM_PROMPT
    if contexto:
        system += f"\n\nContexto adicional:\n{contexto}"

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        system_instruction=system,
    )

    history = []
    for msg in historial[:-1]:
        history.append({
            "role": msg["rol"],
            "parts": [msg["contenido"]],
        })

    chat = model.start_chat(history=history)

    try:
        response = chat.send_message(
            historial[-1]["contenido"],
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=300,
                temperature=0.7,
            ),
        )
        return response.text.strip()
    except Exception:
        return "En este momento no puedo responder. Contactanos por WhatsApp."
