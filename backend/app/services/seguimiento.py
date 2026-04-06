"""
M7 — Seguimiento automático.
Detecta situaciones que requieren acción del admin y genera alarmas.
Se ejecuta manualmente desde admin o puede conectarse a un cron externo.
"""
from datetime import datetime, timedelta, timezone
from app.db.client import get_supabase_client


def _ya_tiene_alarma(db, tipo: str, paciente_id: int | None) -> bool:
    """Evita duplicar alarmas activas del mismo tipo para el mismo paciente."""
    q = db.table("alarmas").select("id").eq("tipo", tipo).eq("resuelta", False)
    if paciente_id is not None:
        q = q.eq("paciente_id", paciente_id)
    return bool(q.execute().data)


def _crear_alarma(db, tipo: str, titulo: str, descripcion: str,
                  prioridad: str, paciente_id: int | None = None):
    if _ya_tiene_alarma(db, tipo, paciente_id):
        return
    db.table("alarmas").insert({
        "tipo": tipo,
        "titulo": titulo,
        "descripcion": descripcion,
        "prioridad": prioridad,
        "paciente_id": paciente_id,
        "resuelta": False,
    }).execute()


def ejecutar_seguimiento() -> dict:
    """
    Corre todas las reglas de seguimiento y devuelve un resumen.
    """
    db = get_supabase_client()
    ahora = datetime.now(timezone.utc)
    resultados = {
        "inactivos": 0,
        "turnos_sin_confirmar": 0,
        "leads_sin_seguimiento": 0,
        "tratamientos_incompletos": 0,
    }

    # ── Regla 1: Pacientes inactivos > 6 meses ──
    # Busca pacientes activos cuyo último turno fue hace más de 6 meses
    limite_inactividad = (ahora - timedelta(days=180)).isoformat()
    pacientes_activos = db.table("pacientes") \
        .select("id, nombre, telefono") \
        .eq("estado", "paciente_activo") \
        .execute().data or []

    for p in pacientes_activos:
        ultimo_turno = db.table("turnos") \
            .select("fecha_hora") \
            .eq("paciente_id", p["id"]) \
            .in_("estado", ["realizado", "confirmado"]) \
            .order("fecha_hora", desc=True) \
            .limit(1) \
            .execute().data

        if not ultimo_turno or ultimo_turno[0]["fecha_hora"] < limite_inactividad:
            _crear_alarma(
                db,
                tipo="reactivacion",
                titulo=f"Paciente inactivo: {p['nombre'] or p['telefono']}",
                descripcion="Sin turno realizado en más de 6 meses. Candidato a campaña de reactivación.",
                prioridad="media",
                paciente_id=p["id"],
            )
            resultados["inactivos"] += 1

    # ── Regla 2: Turnos sin confirmar a menos de 48hs ──
    en_48hs = (ahora + timedelta(hours=48)).isoformat()
    turnos_sin_confirmar = db.table("turnos") \
        .select("id, paciente_id, fecha_hora, tipo_tratamiento, pacientes(nombre)") \
        .eq("estado", "solicitado") \
        .lte("fecha_hora", en_48hs) \
        .gte("fecha_hora", ahora.isoformat()) \
        .execute().data or []

    for t in turnos_sin_confirmar:
        nombre = (t.get("pacientes") or {}).get("nombre") or "paciente"
        _crear_alarma(
            db,
            tipo="turno_sin_confirmar",
            titulo=f"Turno sin confirmar: {nombre}",
            descripcion=f"{t['tipo_tratamiento']} el {t['fecha_hora'][:10]} — faltan menos de 48hs.",
            prioridad="alta",
            paciente_id=t.get("paciente_id"),
        )
        resultados["turnos_sin_confirmar"] += 1

    # ── Regla 3: Leads sin seguimiento hace > 24hs ──
    # Pacientes en estado 'nuevo' o 'contactado' sin actividad reciente
    limite_lead = (ahora - timedelta(hours=24)).isoformat()
    leads = db.table("pacientes") \
        .select("id, nombre, telefono, updated_at, created_at") \
        .in_("estado", ["nuevo", "interesado"]) \
        .execute().data or []

    for p in leads:
        ultima_actividad = p.get("updated_at") or p.get("created_at") or ""
        if ultima_actividad < limite_lead:
            _crear_alarma(
                db,
                tipo="lead_sin_seguimiento",
                titulo=f"Lead sin seguimiento: {p['nombre'] or p['telefono']}",
                descripcion="Más de 24hs sin actividad. Contactar para no perder el interés.",
                prioridad="alta",
                paciente_id=p["id"],
            )
            resultados["leads_sin_seguimiento"] += 1

    # ── Regla 4: Turnos realizados sin turno siguiente en 30 días ──
    # Si el tratamiento fue 'ortodoncia' o 'implante', necesita seguimiento
    tratamientos_seguimiento = ["ortodoncia", "implante", "endodoncia"]
    limite_seguimiento = (ahora - timedelta(days=30)).isoformat()

    turnos_realizados = db.table("turnos") \
        .select("paciente_id, tipo_tratamiento, pacientes(nombre)") \
        .eq("estado", "realizado") \
        .in_("tipo_tratamiento", tratamientos_seguimiento) \
        .gte("fecha_hora", limite_seguimiento) \
        .lte("fecha_hora", ahora.isoformat()) \
        .execute().data or []

    for t in turnos_realizados:
        pid = t.get("paciente_id")
        if not pid:
            continue
        # ¿tiene turno futuro?
        turno_futuro = db.table("turnos") \
            .select("id") \
            .eq("paciente_id", pid) \
            .gte("fecha_hora", ahora.isoformat()) \
            .not_.in_("estado", ["cancelado", "ausente"]) \
            .execute().data
        if not turno_futuro:
            nombre = (t.get("pacientes") or {}).get("nombre") or "paciente"
            _crear_alarma(
                db,
                tipo="tratamiento_incompleto",
                titulo=f"Tratamiento sin seguimiento: {nombre}",
                descripcion=f"{t['tipo_tratamiento'].capitalize()} realizado hace menos de 30 días sin próximo turno agendado.",
                prioridad="media",
                paciente_id=pid,
            )
            resultados["tratamientos_incompletos"] += 1

    return resultados
