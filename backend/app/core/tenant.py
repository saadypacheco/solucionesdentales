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


def normalizar_hostname(host: str) -> str:
    """Normaliza un hostname: lowercase, sin protocolo, sin trailing slash, sin puerto.
    El puerto se preserva solo para 'localhost' porque es el único caso donde el seed
    diferencia 'localhost' de 'localhost:3000' (dev local + dev local con puerto)."""
    if not host:
        return ""
    h = host.strip().lower()
    if "://" in h:
        h = h.split("://", 1)[1]
    h = h.rstrip("/")
    # Si tiene puerto y no es localhost, lo sacamos
    if ":" in h:
        nombre, puerto = h.rsplit(":", 1)
        if nombre != "localhost":
            h = nombre
    return h


def resolver_consultorio_por_hostname(host: str) -> Optional[int]:
    """Busca el consultorio_id que matchea ese hostname en dominios_consultorio.
    Devuelve None si no hay match (caller decide el fallback)."""
    h = normalizar_hostname(host)
    if not h:
        return None
    db = get_supabase_client()
    res = (
        db.table("dominios_consultorio")
        .select("consultorio_id")
        .eq("hostname", h)
        .limit(1)
        .execute()
    )
    if res.data:
        return int(res.data[0]["consultorio_id"])
    return None


def resolve_consultorio_publico(
    x_consultorio_id: Optional[str] = Header(default=None),
    x_forwarded_host: Optional[str] = Header(default=None),
    host: Optional[str] = Header(default=None),
) -> int:
    """
    Para endpoints públicos resuelve consultorio_id en este orden:
    1. Header X-Consultorio-ID explícito (mayor prioridad — frontend lo manda
       cuando ya cacheó la resolución).
    2. Header X-Forwarded-Host o Host (resolución por hostname vía
       dominios_consultorio). Útil para dev/testing donde el frontend aún
       no resolvió y para llamadas server-side.
    3. Fallback al DEFAULT_CONSULTORIO_ID.
    """
    if x_consultorio_id:
        try:
            return int(x_consultorio_id)
        except ValueError:
            log.warning("X-Consultorio-ID inválido: %s", x_consultorio_id)

    # Resolución por hostname (X-Forwarded-Host gana sobre Host porque
    # estamos detrás de Traefik / Vercel / nginx)
    candidate = x_forwarded_host or host
    if candidate:
        cid = resolver_consultorio_por_hostname(candidate)
        if cid is not None:
            return cid

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
