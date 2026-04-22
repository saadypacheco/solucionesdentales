"""
Multi-tenant: resolución del consultorio_id en cada request.

Estrategia (Fase 3):
- Staff (admin/odontologo/recepcionista) → consultorio_id viene de usuarios.consultorio_id
- Paciente con JWT OTP → consultorio_id viene del paciente (vía pacientes.consultorio_id)
- Endpoints públicos (sin auth) → fallback al header X-Consultorio-ID, sino 1 (default)
- Superadmin → puede operar sobre cualquier consultorio (no se filtra)

En Fase 4 el frontend va a mandar X-Consultorio-ID explícitamente para públicos
basado en el dominio/onboarding. Hasta entonces, default 1 mantiene compatibilidad
con el cliente actual (Soluciones Dentales original).
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.db.client import get_supabase_client

log = logging.getLogger(__name__)
DEFAULT_CONSULTORIO_ID = 1

_security_optional = HTTPBearer(auto_error=False)


def get_consultorio_id_from_staff(usuario_id: str) -> int:
    """Resuelve consultorio_id leyendo usuarios.consultorio_id."""
    db = get_supabase_client()
    res = db.table("usuarios").select("consultorio_id").eq("id", usuario_id).single().execute()
    if not res.data or not res.data.get("consultorio_id"):
        return DEFAULT_CONSULTORIO_ID
    return int(res.data["consultorio_id"])


def get_consultorio_id_from_paciente(paciente_id: int) -> int:
    """Resuelve consultorio_id leyendo pacientes.consultorio_id."""
    db = get_supabase_client()
    res = db.table("pacientes").select("consultorio_id").eq("id", paciente_id).single().execute()
    if not res.data or not res.data.get("consultorio_id"):
        return DEFAULT_CONSULTORIO_ID
    return int(res.data["consultorio_id"])


def resolve_consultorio_publico(
    x_consultorio_id: Optional[str] = Header(default=None),
) -> int:
    """
    Para endpoints públicos: resuelve consultorio_id del header X-Consultorio-ID.
    Si no viene el header, usa el default (compat con cliente único actual).

    En Fase 4, el frontend manda este header siempre basado en el contexto.
    """
    if x_consultorio_id:
        try:
            return int(x_consultorio_id)
        except ValueError:
            log.warning("X-Consultorio-ID inválido: %s", x_consultorio_id)
    return DEFAULT_CONSULTORIO_ID


def get_consultorio_info(consultorio_id: int) -> Optional[dict]:
    """Trae datos del consultorio + país. Útil para idioma, moneda, timezone."""
    db = get_supabase_client()
    res = (
        db.table("consultorios")
        .select("*, paises(codigo, nombre, idioma_default, moneda, timezone_default, modelo_ia_default, requiere_audit_log, requiere_consentimiento_explicito)")
        .eq("id", consultorio_id)
        .single()
        .execute()
    )
    return res.data if res.data else None


def es_superadmin(rol: Optional[str]) -> bool:
    """Superadmin opera sobre todos los consultorios (rol del SaaS, no del consultorio)."""
    return rol == "superadmin"
