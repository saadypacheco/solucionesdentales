"""Tests unitarios de app.core.encryption.

Cubrimos lo crítico:
- encrypt/decrypt roundtrip (si se rompe, se pierden todos los datos PHI)
- Hash determinístico estable (si cambia, no podemos loguear OTPs)
- Normalización robusta (errores acá crean duplicados de pacientes)
"""
from app.core.encryption import (
    encrypt,
    decrypt,
    hash_for_search,
    normalize_phone,
    normalize_email,
)


# ── encrypt / decrypt roundtrip ──────────────────────────────────────────────

def test_encrypt_decrypt_roundtrip():
    original = "5491155551234"
    token = encrypt(original)
    assert token is not None
    assert token != original, "el token cifrado no debe parecerse al plano"
    assert decrypt(token) == original


def test_encrypt_decrypt_unicode():
    """El backend encripta nombres y emails con tildes / caracteres especiales."""
    for original in ["María García", "josé.martínez@clínica.com", "Niño Pequeño"]:
        token = encrypt(original)
        assert decrypt(token) == original


def test_encrypt_different_outputs_same_input():
    """Fernet incluye IV aleatorio → mismo input produce tokens distintos.
    Importante porque si fuera determinístico, el atacante podría correlacionar."""
    a = encrypt("1155551234")
    b = encrypt("1155551234")
    assert a != b
    # Pero ambos desencriptan al mismo valor
    assert decrypt(a) == decrypt(b) == "1155551234"


def test_encrypt_none_and_empty():
    assert encrypt(None) is None
    assert encrypt("") is None
    assert decrypt(None) is None
    assert decrypt("") is None


def test_decrypt_garbage_returns_none():
    """No explota si el token está corrupto. Importante porque una fila
    puede quedar inválida y no debe tirar 500 al endpoint."""
    assert decrypt("not-a-real-token") is None
    assert decrypt("xxxx" * 10) is None


# ── hash_for_search ──────────────────────────────────────────────────────────

def test_hash_is_deterministic():
    """Mismo input → mismo hash. Si se rompe, OTP no encuentra al paciente."""
    h1 = hash_for_search("5491155551234")
    h2 = hash_for_search("5491155551234")
    assert h1 == h2
    assert h1 is not None
    assert len(h1) == 64  # SHA-256 hexadecimal


def test_hash_different_inputs_different_outputs():
    assert hash_for_search("1155551234") != hash_for_search("1155551235")


def test_hash_none_and_empty():
    assert hash_for_search(None) is None
    assert hash_for_search("") is None


def test_hash_not_equal_to_plain():
    """Obvio pero crítico: el hash no debe ser el valor plano concatenado
    con el salt, ni contener el valor original."""
    plano = "5491155551234"
    h = hash_for_search(plano)
    assert plano not in h


# ── normalize_phone ──────────────────────────────────────────────────────────

def test_normalize_phone_variants_same_output():
    """Todas estas formas del mismo número deben normalizar igual, para que
    el hash sea estable y no se creen pacientes duplicados."""
    variantes = [
        "+54 9 11 5555-1234",
        "5491155551234",
        "(54) 911 5555 1234",
        "54.9.11.5555.1234",
    ]
    normalizadas = [normalize_phone(v) for v in variantes]
    assert len(set(normalizadas)) == 1, f"esperaba 1 único valor, tengo {normalizadas}"
    assert normalizadas[0] == "5491155551234"


def test_normalize_phone_none_and_empty():
    assert normalize_phone(None) is None
    assert normalize_phone("") is None


def test_normalize_phone_only_letters_returns_empty_string():
    """Sólo letras → string vacío. No crashea."""
    assert normalize_phone("sin-numeros") == ""


# ── normalize_email ──────────────────────────────────────────────────────────

def test_normalize_email_lowercase_and_trim():
    assert normalize_email("  JUAN@CLINICA.COM  ") == "juan@clinica.com"
    assert normalize_email("Maria@Example.Com") == "maria@example.com"


def test_normalize_email_none_and_empty():
    assert normalize_email(None) is None
    assert normalize_email("") is None


def test_normalize_email_stable_for_hash():
    """Dos variantes del mismo email → hash idéntico."""
    h1 = hash_for_search(normalize_email(" JUAN@clinica.com "))
    h2 = hash_for_search(normalize_email("juan@CLINICA.COM"))
    assert h1 == h2
