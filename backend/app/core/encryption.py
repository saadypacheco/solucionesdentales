"""
Encriptación de datos sensibles.

Estrategia:
- Fernet (AES-128-CBC + HMAC-SHA256) para encriptar valores en reposo.
- SHA-256(valor + HASH_SALT) para hashes determinísticos que permiten
  búsqueda por igualdad sin desencriptar (ej. login OTP por teléfono).

Si ENCRYPTION_KEY no está definida, las funciones devuelven el valor
plano y loguean warning. Esto permite arrancar sin clave en dev, pero
en producción la app debe abortar si falta — ver core/config.py.
"""
from __future__ import annotations

import hashlib
import logging
import os
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

log = logging.getLogger(__name__)

_cipher: Optional[Fernet] = None
_hash_salt: Optional[str] = None


def _get_cipher() -> Optional[Fernet]:
    global _cipher
    if _cipher is None:
        key = os.getenv("ENCRYPTION_KEY")
        if not key:
            return None
        _cipher = Fernet(key.encode() if isinstance(key, str) else key)
    return _cipher


def _get_salt() -> str:
    global _hash_salt
    if _hash_salt is None:
        _hash_salt = os.getenv("HASH_SALT", "")
    return _hash_salt


def encrypt(value: Optional[str]) -> Optional[str]:
    """Encripta un string. Devuelve el token Fernet (ASCII safe) o None."""
    if value is None or value == "":
        return None
    cipher = _get_cipher()
    if cipher is None:
        log.warning("ENCRYPTION_KEY no configurada — guardando valor plano")
        return value
    return cipher.encrypt(value.encode("utf-8")).decode("ascii")


def decrypt(token: Optional[str]) -> Optional[str]:
    """Desencripta un token Fernet. Si falla, devuelve None y loguea."""
    if token is None or token == "":
        return None
    cipher = _get_cipher()
    if cipher is None:
        # Sin clave configurada — el valor probablemente está plano
        return token
    try:
        return cipher.decrypt(token.encode("ascii")).decode("utf-8")
    except (InvalidToken, ValueError, UnicodeDecodeError) as e:
        log.warning("No se pudo desencriptar token: %s", type(e).__name__)
        return None


def hash_for_search(value: Optional[str]) -> Optional[str]:
    """
    Hash determinístico SHA-256 con sal fija. Permite búsqueda por
    igualdad sin desencriptar. Mismo input → mismo output.

    NOTA: no usar para passwords (no es resistente a fuerza bruta).
    Solo para identificadores como teléfonos cuya entropía es alta y
    el atacante necesitaría también HASH_SALT del backend.
    """
    if value is None or value == "":
        return None
    salt = _get_salt()
    if not salt:
        log.warning("HASH_SALT no configurada — los hashes no serán seguros")
    h = hashlib.sha256()
    h.update(salt.encode("utf-8"))
    h.update(value.encode("utf-8"))
    return h.hexdigest()


def normalize_phone(value: Optional[str]) -> Optional[str]:
    """
    Normaliza teléfono antes de hashear/encriptar para que el hash sea
    estable: sin espacios, sin guiones, sin paréntesis, sin '+' inicial.
    """
    if not value:
        return None
    return "".join(c for c in value if c.isdigit())


def normalize_email(value: Optional[str]) -> Optional[str]:
    """Normaliza email a lowercase + trim."""
    if not value:
        return None
    return value.strip().lower()
