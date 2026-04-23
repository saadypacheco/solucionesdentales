"""
Endpoints disparables por cron externo (GitHub Actions, cron del VPS, Supabase Edge Functions).

Auth: token estático en header X-Cron-Token (env CRON_TOKEN).
No usan JWT de usuario porque corren sin sesión humana.

Tareas:
- Recordatorios 24h antes de turnos confirmados
- Marcado de turnos pasados como 'realizado' o 'ausente' (futuro)
- Re-cálculo de scores de pacientes (futuro)
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Header, HTTPException
from supabase import Client

from app.db.client import get_supabase_client
from app.services.notificaciones import notificar

router = APIRouter(prefix="/cron", tags=["cron"], redirect_slashes=False)
log = logging.getLogger(__name__)


def get_db() -> Client:
    return get_supabase_client()


def require_cron_token(x_cron_token: str = Header(default=None)):
    """Valida el token estático de cron. Configurar en .env como CRON_TOKEN=<algo-largo>."""
    expected = os.getenv("CRON_TOKEN")
    if not expected:
        raise HTTPException(status_code=503, detail="CRON_TOKEN no configurado en el backend")
    if not x_cron_token or x_cron_token != expected:
        raise HTTPException(status_code=401, detail="Token de cron inválido")


@router.post("/recordatorios-24h")
async def enviar_recordatorios_24h(
    _: None = Depends(require_cron_token),
    db: Client = Depends(get_db),
):
    """
    Para cada turno confirmado entre 23h y 25h en el futuro:
    - Si paciente_id existe, crea notif "turno_recordatorio_24h"
    - Marca metadata.recordatorio_24h_enviado para evitar duplicados

    Idempotente: si se corre 2 veces el mismo día, el segundo intento
    no genera notifs duplicadas (usa la metadata.recordatorio_24h_enviado
    en la propia tabla notificaciones).
    """
    ahora = datetime.now(timezone.utc)
    ventana_inicio = (ahora + timedelta(hours=23)).isoformat()
    ventana_fin = (ahora + timedelta(hours=25)).isoformat()

    # Turnos confirmados en la ventana
    turnos = (
        db.table("turnos")
        .select("id, paciente_id, consultorio_id, fecha_hora, tipo_tratamiento, modalidad, jitsi_room")
        .eq("estado", "confirmado")
        .gte("fecha_hora", ventana_inicio)
        .lte("fecha_hora", ventana_fin)
        .execute()
    )

    enviadas = 0
    omitidas_sin_paciente = 0
    omitidas_duplicadas = 0
    errores = 0

    for t in (turnos.data or []):
        try:
            pid = t.get("paciente_id")
            if not pid:
                omitidas_sin_paciente += 1
                continue

            # Idempotencia: ¿ya hay notif tipo recordatorio_24h para este turno?
            existing = (
                db.table("notificaciones")
                .select("id", count="exact")
                .eq("paciente_id", pid)
                .eq("tipo", "turno_recordatorio_24h")
                .contains("metadata", {"turno_id": t["id"]})
                .execute()
            )
            if (existing.count or 0) > 0:
                omitidas_duplicadas += 1
                continue

            # Formatear fecha
            try:
                fh = datetime.fromisoformat(t["fecha_hora"].replace("Z", "+00:00"))
                # Mostrar en hora AR (TODO: usar timezone del consultorio)
                fh_ar = fh.astimezone(ZoneInfo("America/Argentina/Buenos_Aires"))
                fecha_str = fh_ar.strftime("%d/%m a las %H:%M")
            except Exception:
                fecha_str = t["fecha_hora"][:16]

            es_virtual = t.get("modalidad") == "virtual"
            mensaje = (
                f"Mañana {fecha_str} tenés tu consulta de {t['tipo_tratamiento']}."
                + (" Recordá entrar a la sala virtual a horario." if es_virtual else "")
            )
            link = "/sala/" + str(t["id"]) if es_virtual and t.get("jitsi_room") else "/mis-turnos"

            notificar(
                consultorio_id=t["consultorio_id"],
                paciente_id=pid,
                tipo="turno_recordatorio_24h",
                titulo="Recordatorio: tu turno es mañana",
                mensaje=mensaje,
                link=link,
                metadata={"turno_id": t["id"], "modalidad": t.get("modalidad", "presencial")},
                prioridad="alta",
            )
            enviadas += 1
        except Exception as e:
            errores += 1
            log.warning("recordatorio_24h falló para turno %s: %s", t.get("id"), e)

    return {
        "ok": True,
        "ahora": ahora.isoformat(),
        "ventana": {"inicio": ventana_inicio, "fin": ventana_fin},
        "total_turnos_en_ventana": len(turnos.data or []),
        "enviadas": enviadas,
        "omitidas_sin_paciente": omitidas_sin_paciente,
        "omitidas_duplicadas": omitidas_duplicadas,
        "errores": errores,
    }
