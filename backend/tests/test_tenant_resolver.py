"""Tests de resolución de hostname → consultorio_id.

Probamos solo `normalizar_hostname()` (puro, sin DB). El otro flujo
(`resolver_consultorio_por_hostname`) requiere Supabase real y se cubre
en tests de integración."""
from app.core.tenant import normalizar_hostname


def test_normaliza_lowercase():
    assert normalizar_hostname("MiClinica.COM.AR") == "miclinica.com.ar"


def test_quita_protocolo():
    assert normalizar_hostname("https://miclinica.com") == "miclinica.com"
    assert normalizar_hostname("http://miclinica.com") == "miclinica.com"


def test_quita_trailing_slash():
    assert normalizar_hostname("miclinica.com/") == "miclinica.com"
    assert normalizar_hostname("https://miclinica.com/") == "miclinica.com"


def test_quita_puerto_excepto_localhost():
    """En dominios reales el puerto no aporta tenant. En localhost sí
    porque dev usa puertos distintos en paralelo."""
    assert normalizar_hostname("miclinica.com:8080") == "miclinica.com"
    assert normalizar_hostname("api.solucionesdentales.com:443") == "api.solucionesdentales.com"
    # localhost preserva puerto
    assert normalizar_hostname("localhost:3000") == "localhost:3000"
    assert normalizar_hostname("localhost") == "localhost"


def test_string_vacio_o_none():
    assert normalizar_hostname("") == ""
    assert normalizar_hostname("   ") == ""


def test_combo_protocolo_puerto_slash():
    """Caso real: lo que viene del header X-Forwarded-Host con todo junto."""
    assert normalizar_hostname("https://Bosques.SolucionesDentales.COM:443/") == "bosques.solucionesdentales.com"


def test_subdominio_se_preserva():
    """El subdominio sí importa porque cada subdominio es un consultorio distinto
    en el modelo multi-tenant."""
    assert normalizar_hostname("bosques.solucionesdentales.com") == "bosques.solucionesdentales.com"
    # No es lo mismo que el dominio raíz
    assert normalizar_hostname("solucionesdentales.com") != "bosques.solucionesdentales.com"
