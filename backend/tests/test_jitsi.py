"""Tests de generación de salas Jitsi."""
from app.services.jitsi import (
    generar_room_name,
    generar_password,
    construir_url,
    JITSI_BASE_URL,
    ROOM_PREFIX,
)


def test_room_name_incluye_turno_id_y_prefijo():
    room = generar_room_name(42)
    assert room.startswith(f"{ROOM_PREFIX}-42-")


def test_room_name_es_impredecible():
    """Dos llamadas al mismo turno producen rooms distintos — un atacante
    que conoce el turno_id no puede adivinar la URL."""
    rooms = {generar_room_name(1) for _ in range(20)}
    assert len(rooms) == 20, "todas las llamadas deben generar rooms únicos"


def test_room_name_sufijo_tiene_12_chars_hex():
    room = generar_room_name(7)
    sufijo = room.rsplit("-", 1)[-1]
    assert len(sufijo) == 12
    assert all(c in "0123456789abcdef" for c in sufijo)


def test_password_length_and_charset():
    pwd = generar_password()
    assert len(pwd) == 8
    # token_urlsafe produce base64url → alfanumérico + '-' y '_'
    permitidos = set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_")
    assert all(c in permitidos for c in pwd)


def test_password_es_aleatorio():
    pwds = {generar_password() for _ in range(50)}
    assert len(pwds) > 40, "la entropía debería producir ~50 passwords únicos"


def test_url_es_meet_jit_si():
    url = construir_url("mi-sala-test")
    assert url == f"{JITSI_BASE_URL}/mi-sala-test"
    assert url.startswith("https://meet.jit.si/")
