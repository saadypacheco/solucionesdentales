"""
Helpers para serializar pacientes con campos encriptados.

Política durante la transición:
- Si telefono_enc/email_enc existen → usarlos como fuente de verdad.
- Si no → fallback a telefono/email plano (registros pre-encriptación).
- En la respuesta JSON el campo `telefono` siempre va en plano (lo que el
  frontend espera). El cliente nunca ve los _enc/_hash.
"""
from __future__ import annotations

from typing import Any, Optional

from app.core.encryption import decrypt


def hidratar_paciente(row: Optional[dict]) -> Optional[dict]:
    """Reemplaza telefono y email con su valor desencriptado, oculta _enc/_hash."""
    if not row:
        return row

    out = dict(row)

    # Teléfono
    enc = out.pop("telefono_enc", None)
    out.pop("telefono_hash", None)
    if enc:
        plain = decrypt(enc)
        if plain is not None:
            out["telefono"] = plain
    # else: out["telefono"] queda como vino (plano)

    # Email
    enc_e = out.pop("email_enc", None)
    out.pop("email_hash", None)
    if enc_e:
        plain_e = decrypt(enc_e)
        if plain_e is not None:
            out["email"] = plain_e

    return out


def hidratar_lista_pacientes(rows: list[dict]) -> list[dict]:
    return [hidratar_paciente(r) for r in (rows or [])]


def hidratar_turno(row: Optional[dict]) -> Optional[dict]:
    """Desencripta notas y, si vienen pacientes anidados, los hidrata."""
    if not row:
        return row
    out = dict(row)

    # notas
    enc_n = out.pop("notas_enc", None)
    if enc_n:
        plain = decrypt(enc_n)
        if plain is not None:
            out["notas"] = plain

    # pacientes anidado (JOIN de Supabase)
    if "pacientes" in out and out["pacientes"]:
        out["pacientes"] = hidratar_paciente(out["pacientes"])

    return out


def hidratar_lista_turnos(rows: list[dict]) -> list[dict]:
    return [hidratar_turno(r) for r in (rows or [])]


def campos_select_paciente(extra: str = "") -> str:
    """
    Devuelve los campos que hay que pedir a Supabase para que la hidratación
    funcione. Siempre incluye los _enc/_hash además de los planos.
    """
    base = "id, nombre, telefono, telefono_enc, telefono_hash, email, email_enc, email_hash, estado, score"
    if extra:
        return f"{base}, {extra}"
    return base
