"""
Audit log universal. Obligatorio para US (HIPAA Security Rule), útil para todos.

Se llena desde routers en acciones sensibles (acceso a historial clínico,
cambios de estado, eliminaciones, login, etc).
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import Request

from app.db.client import get_supabase_client

log = logging.getLogger(__name__)


def log_action(
    consultorio_id: Optional[int],
    accion: str,
    *,
    usuario_id: Optional[str] = None,
    paciente_id: Optional[int] = None,
    recurso_tipo: Optional[str] = None,
    recurso_id: Optional[Any] = None,
    request: Optional[Request] = None,
    metadata: Optional[dict] = None,
) -> None:
    """
    Registra una entrada en audit_log. Fail-safe: si falla, loguea warning
    y sigue (no debe romper el endpoint que lo llama).

    Acciones sugeridas:
    - 'view_historial', 'edit_historial', 'create_historial'
    - 'view_paciente', 'edit_paciente', 'delete_paciente'
    - 'create_turno', 'cancel_turno', 'update_turno_estado'
    - 'login_staff', 'login_paciente_otp', 'logout'
    - 'upload_documento', 'aprobar_documento', 'rechazar_documento'
    - 'download_receta'
    """
    try:
        ip_address = None
        user_agent = None
        if request is not None:
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent")

        entry: dict[str, Any] = {
            "consultorio_id": consultorio_id,
            "usuario_id": usuario_id,
            "paciente_id": paciente_id,
            "accion": accion,
            "recurso_tipo": recurso_tipo,
            "recurso_id": str(recurso_id) if recurso_id is not None else None,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "metadata": metadata,
        }
        # Limpiar None para que defaults de DB tomen
        entry = {k: v for k, v in entry.items() if v is not None}

        db = get_supabase_client()
        db.table("audit_log").insert(entry).execute()
    except Exception as e:
        log.warning("audit_log fallo: %s (accion=%s, consultorio_id=%s)", e, accion, consultorio_id)
