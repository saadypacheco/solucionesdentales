"""Tests del agente IA.

Sin API key, todas las funciones deben devolver fallback texts sin crashear.
Esto protege contra el caso donde un consultorio nuevo aún no configuró
GEMINI_API_KEY o Gemini está caído.
"""
import os

import pytest


@pytest.fixture(autouse=True)
def _sin_api_key(monkeypatch):
    """Desactiva GEMINI_API_KEY para todos los tests de este módulo."""
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)


def test_llamar_gemini_sin_key_devuelve_fallback():
    from app.services.agente import _llamar_gemini, _FALLBACK_SIN_KEY
    resultado = _llamar_gemini("system prompt", [{"rol": "user", "contenido": "hola"}])
    assert resultado == _FALLBACK_SIN_KEY


def test_analizar_imagen_sin_key_devuelve_fallback():
    from app.services.agente import analizar_imagen, _FALLBACK_SIN_KEY
    resultado = analizar_imagen(b"fake-bytes", "image/jpeg", "¿qué ves?")
    assert resultado == _FALLBACK_SIN_KEY


def test_stream_respuesta_sin_key_yieldea_fallback(monkeypatch):
    """Cuando no hay API key, el generator debe yieldear el fallback de una
    y terminar — sin explotar por falta de DB tampoco."""
    # Stub de _construir_contexto para evitar la llamada a Supabase
    import app.services.agente as agente_mod

    monkeypatch.setattr(agente_mod, "_construir_contexto", lambda db, m: "")
    monkeypatch.setattr(agente_mod, "_get_system_prompt", lambda db: "stub prompt")
    monkeypatch.setattr(agente_mod, "get_supabase_client", lambda: None)

    chunks = list(agente_mod.stream_respuesta([{"rol": "user", "contenido": "hola"}]))
    assert chunks == [agente_mod._FALLBACK_SIN_KEY]
