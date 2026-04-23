"""
M12 Notificaciones — helper para crear notificaciones in-app.

Uso:
    from app.services.notificaciones import notificar

    notificar(
        consultorio_id=1,
        usuario_id="uuid-del-admin",
        tipo="nuevo_turno",
        titulo="Nuevo turno solicitado",
        mensaje="Juan García agendó para mañana 10:00",
        link="/admin/agenda",
        metadata={"turno_id": 42},
    )
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from app.db.client import get_supabase_client

log = logging.getLogger(__name__)


def notificar(
    consultorio_id: int,
    *,
    tipo: str,
    titulo: str,
    usuario_id: Optional[str] = None,
    paciente_id: Optional[int] = None,
    mensaje: Optional[str] = None,
    link: Optional[str] = None,
    metadata: Optional[dict] = None,
    prioridad: str = "normal",
) -> None:
    """
    Crea una notificación. Fail-safe: si falla, loguea warning y sigue
    (no debe romper el endpoint que la dispara).

    Validaciones:
    - usuario_id XOR paciente_id (exactamente uno)
    - prioridad in {baja, normal, alta, critica}
    """
    if (usuario_id is None) == (paciente_id is None):
        log.warning("notificar(): debe pasar exactamente uno de usuario_id o paciente_id")
        return

    if prioridad not in ("baja", "normal", "alta", "critica"):
        prioridad = "normal"

    try:
        entry: dict[str, Any] = {
            "consultorio_id": consultorio_id,
            "tipo": tipo,
            "titulo": titulo,
            "prioridad": prioridad,
        }
        if usuario_id:
            entry["usuario_id"] = usuario_id
        if paciente_id is not None:
            entry["paciente_id"] = paciente_id
        if mensaje:
            entry["mensaje"] = mensaje
        if link:
            entry["link"] = link
        if metadata:
            entry["metadata"] = metadata

        db = get_supabase_client()
        db.table("notificaciones").insert(entry).execute()
    except Exception as e:
        log.warning("notificar() falló: %s (tipo=%s, consultorio=%s)", e, tipo, consultorio_id)


def notificar_a_admins(
    consultorio_id: int,
    *,
    tipo: str,
    titulo: str,
    mensaje: Optional[str] = None,
    link: Optional[str] = None,
    metadata: Optional[dict] = None,
    prioridad: str = "normal",
) -> int:
    """
    Notifica a TODOS los admins activos de un consultorio.
    Devuelve la cantidad de admins notificados.
    """
    try:
        db = get_supabase_client()
        admins = (
            db.table("usuarios")
            .select("id")
            .eq("consultorio_id", consultorio_id)
            .eq("rol", "admin")
            .eq("activo", True)
            .execute()
        )
        count = 0
        for admin in (admins.data or []):
            notificar(
                consultorio_id=consultorio_id,
                usuario_id=admin["id"],
                tipo=tipo,
                titulo=titulo,
                mensaje=mensaje,
                link=link,
                metadata=metadata,
                prioridad=prioridad,
            )
            count += 1
        return count
    except Exception as e:
        log.warning("notificar_a_admins() falló: %s", e)
        return 0
