"""
M11 Telemedicina — generación de salas Jitsi (meet.jit.si hosted).

Estrategia (decisión 2026-04-21):
- Hosted en meet.jit.si — cero infra propia
- Lobby activado para que el odontólogo apruebe entrada del paciente
- Password generado al verificar el pago para mitigar guessing
- Room name = UUID v4 (no adivinable)

URL de la sala:
    https://meet.jit.si/{room_name}#config.requireDisplayName=true

Para activar lobby + password se hace desde el iframe del frontend con
jitsi-meet-external-api (ver components/JitsiSala.tsx).
"""
from __future__ import annotations

import secrets
import uuid

JITSI_BASE_URL = "https://meet.jit.si"
ROOM_PREFIX = "soluciones-dentales"


def generar_room_name(turno_id: int) -> str:
    """
    Genera un room name único e impredecible.
    Formato: soluciones-dentales-{turno_id}-{uuid_short}
    """
    short = uuid.uuid4().hex[:12]
    return f"{ROOM_PREFIX}-{turno_id}-{short}"


def generar_password() -> str:
    """Password de 8 caracteres alfanuméricos para la sala."""
    return secrets.token_urlsafe(6)[:8]


def construir_url(room_name: str) -> str:
    """URL pública de la sala (el password se setea desde el iframe)."""
    return f"{JITSI_BASE_URL}/{room_name}"
