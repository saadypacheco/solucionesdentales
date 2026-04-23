from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import uuid
from app.db.client import get_supabase_client
from app.routers.auth import require_admin, require_staff_context
from app.services.seguimiento import ejecutar_seguimiento
from app.services.audit import log_action
from app.core.paciente_helpers import (
    hidratar_lista_pacientes,
    hidratar_lista_turnos,
)
from supabase import Client

router = APIRouter(prefix="/admin", tags=["admin"], redirect_slashes=False)


def get_db() -> Client:
    return get_supabase_client()


def _filtrar_consultorio(query, ctx: dict):
    """Aplica filtro consultorio_id salvo que sea superadmin (que ve todos)."""
    if not ctx["es_superadmin"]:
        query = query.eq("consultorio_id", ctx["consultorio_id"])
    return query


@router.get("/pacientes")
async def listar_pacientes(
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    query = db.table("pacientes").select("*")
    query = _filtrar_consultorio(query, ctx)
    res = query.order("created_at", desc=True).execute()
    return hidratar_lista_pacientes(res.data or [])


@router.patch("/pacientes/{paciente_id}/estado")
async def actualizar_estado_paciente(
    paciente_id: int,
    estado: str,
    request: Request,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    estados_validos = ("nuevo", "contactado", "interesado", "turno_agendado", "paciente_activo", "inactivo", "perdido")
    if estado not in estados_validos:
        raise HTTPException(status_code=400, detail=f"Estado inválido: {estado}")

    # Verificar que el paciente pertenece al consultorio del staff
    if not ctx["es_superadmin"]:
        check = db.table("pacientes").select("consultorio_id").eq("id", paciente_id).single().execute()
        if not check.data or check.data.get("consultorio_id") != ctx["consultorio_id"]:
            raise HTTPException(status_code=404, detail="Paciente no encontrado")

    res = db.table("pacientes").update({"estado": estado}).eq("id", paciente_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    log_action(
        consultorio_id=ctx["consultorio_id"],
        usuario_id=ctx["usuario_id"],
        paciente_id=paciente_id,
        accion="update_paciente_estado",
        recurso_tipo="paciente",
        recurso_id=paciente_id,
        request=request,
        metadata={"nuevo_estado": estado},
    )

    return res.data[0]


@router.get("/turnos")
async def listar_turnos(
    fecha: Optional[str] = None,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Lista turnos. Si se pasa fecha (YYYY-MM-DD), filtra ese día."""
    query = db.table("turnos").select(
        "*, pacientes(id, nombre, telefono, telefono_enc, telefono_hash, email, email_enc, email_hash)"
    )
    query = _filtrar_consultorio(query, ctx)
    if fecha:
        query = query.gte("fecha_hora", f"{fecha}T00:00:00") \
                     .lte("fecha_hora", f"{fecha}T23:59:59")
    res = query.order("fecha_hora").execute()
    return hidratar_lista_turnos(res.data or [])


@router.patch("/turnos/{turno_id}")
async def actualizar_turno(
    turno_id: int,
    estado: str,
    request: Request,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    estados_validos = ("solicitado", "confirmado", "realizado", "cancelado", "ausente")
    if estado not in estados_validos:
        raise HTTPException(status_code=400, detail=f"Estado inválido. Opciones: {estados_validos}")

    if not ctx["es_superadmin"]:
        check = db.table("turnos").select("consultorio_id").eq("id", turno_id).single().execute()
        if not check.data or check.data.get("consultorio_id") != ctx["consultorio_id"]:
            raise HTTPException(status_code=404, detail="Turno no encontrado")

    res = db.table("turnos").update({"estado": estado}).eq("id", turno_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Turno no encontrado")

    log_action(
        consultorio_id=ctx["consultorio_id"],
        usuario_id=ctx["usuario_id"],
        accion="update_turno_estado",
        recurso_tipo="turno",
        recurso_id=turno_id,
        request=request,
        metadata={"nuevo_estado": estado},
    )

    return res.data[0]


@router.get("/casos")
async def listar_casos_admin(
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    query = db.table("casos_galeria").select("*")
    query = _filtrar_consultorio(query, ctx)
    return query.order("created_at", desc=True).execute().data or []


async def _upload_imagen(db: Client, archivo: UploadFile, prefijo: str) -> str:
    """Sube una imagen a Supabase Storage y devuelve la URL pública."""
    contenido = await archivo.read()
    ext = archivo.filename.rsplit(".", 1)[-1] if archivo.filename and "." in archivo.filename else "jpg"
    nombre = f"{prefijo}/{uuid.uuid4()}.{ext}"
    db.storage.from_("galeria").upload(
        nombre,
        contenido,
        {"content-type": archivo.content_type or "image/jpeg"},
    )
    url = db.storage.from_("galeria").get_public_url(nombre)
    return url


@router.post("/casos")
async def crear_caso(
    request: Request,
    tipo_tratamiento: str = Form(...),
    descripcion: str = Form(...),
    duracion_tratamiento: str = Form(""),
    imagen_antes: UploadFile = File(...),
    imagen_despues: UploadFile = File(...),
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Crea un caso en galería (pendiente de aprobación)."""
    url_antes = await _upload_imagen(db, imagen_antes, "antes")
    url_despues = await _upload_imagen(db, imagen_despues, "despues")
    res = db.table("casos_galeria").insert({
        "tipo_tratamiento": tipo_tratamiento,
        "descripcion": descripcion,
        "duracion_tratamiento": duracion_tratamiento,
        "imagen_antes_url": url_antes,
        "imagen_despues_url": url_despues,
        "aprobado": False,
        "consultorio_id": ctx["consultorio_id"],
    }).execute()

    caso = res.data[0]
    log_action(
        consultorio_id=ctx["consultorio_id"],
        usuario_id=ctx["usuario_id"],
        accion="create_caso",
        recurso_tipo="caso_galeria",
        recurso_id=caso["id"],
        request=request,
    )
    return caso


@router.patch("/casos/{caso_id}")
async def aprobar_caso(
    caso_id: int,
    aprobado: bool,
    request: Request,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    if not ctx["es_superadmin"]:
        check = db.table("casos_galeria").select("consultorio_id").eq("id", caso_id).single().execute()
        if not check.data or check.data.get("consultorio_id") != ctx["consultorio_id"]:
            raise HTTPException(status_code=404, detail="Caso no encontrado")

    res = db.table("casos_galeria").update({"aprobado": aprobado}).eq("id", caso_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    log_action(
        consultorio_id=ctx["consultorio_id"],
        usuario_id=ctx["usuario_id"],
        accion="approve_caso" if aprobado else "unapprove_caso",
        recurso_tipo="caso_galeria",
        recurso_id=caso_id,
        request=request,
    )
    return res.data[0]


@router.delete("/casos/{caso_id}")
async def eliminar_caso(
    caso_id: int,
    request: Request,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Soft delete — marca como no aprobado."""
    if not ctx["es_superadmin"]:
        check = db.table("casos_galeria").select("consultorio_id").eq("id", caso_id).single().execute()
        if not check.data or check.data.get("consultorio_id") != ctx["consultorio_id"]:
            raise HTTPException(status_code=404, detail="Caso no encontrado")

    res = db.table("casos_galeria").update({"aprobado": False}).eq("id", caso_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    log_action(
        consultorio_id=ctx["consultorio_id"],
        usuario_id=ctx["usuario_id"],
        accion="delete_caso",
        recurso_tipo="caso_galeria",
        recurso_id=caso_id,
        request=request,
    )
    return {"ok": True}


@router.get("/config-ia")
async def listar_config_ia(
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    query = db.table("config_ia").select("clave, valor, updated_at")
    query = _filtrar_consultorio(query, ctx)
    return query.order("clave").execute().data or []


@router.patch("/config-ia/{clave}")
async def actualizar_config_ia(
    clave: str,
    valor: str,
    request: Request,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    claves_permitidas = ("system_prompt", "rangos_precios", "mensaje_recordatorio",
                        "wa_numero", "horario_atencion")
    if clave not in claves_permitidas:
        raise HTTPException(status_code=400, detail=f"Clave no permitida: {clave}")
    from datetime import datetime, timezone
    res = db.table("config_ia").upsert({
        "clave": clave,
        "valor": valor,
        "consultorio_id": ctx["consultorio_id"],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }, on_conflict="clave").execute()

    log_action(
        consultorio_id=ctx["consultorio_id"],
        usuario_id=ctx["usuario_id"],
        accion="update_config_ia",
        recurso_tipo="config_ia",
        recurso_id=clave,
        request=request,
    )

    return res.data[0] if res.data else {"clave": clave, "valor": valor}


@router.post("/seguimiento/ejecutar")
async def ejecutar_seguimiento_manual(
    request: Request,
    ctx: dict = Depends(require_staff_context),
):
    """
    Ejecuta todas las reglas de seguimiento automático y devuelve un resumen.
    Puede llamarse manualmente desde el admin o conectarse a un cron externo.
    """
    try:
        # TODO Fase 5: pasar consultorio_id al servicio para filtrar
        resultado = ejecutar_seguimiento()
        total = sum(resultado.values())
        log_action(
            consultorio_id=ctx["consultorio_id"],
            usuario_id=ctx["usuario_id"],
            accion="run_seguimiento",
            metadata={"alarmas_generadas": total},
            request=request,
        )
        return {"ok": True, "alarmas_generadas": total, "detalle": resultado}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/alarmas/{alarma_id}/resolver")
async def resolver_alarma(
    alarma_id: int,
    request: Request,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    if not ctx["es_superadmin"]:
        check = db.table("alarmas").select("consultorio_id").eq("id", alarma_id).single().execute()
        if not check.data or check.data.get("consultorio_id") != ctx["consultorio_id"]:
            raise HTTPException(status_code=404, detail="Alarma no encontrada")

    res = db.table("alarmas").update({"resuelta": True}).eq("id", alarma_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Alarma no encontrada")
    log_action(
        consultorio_id=ctx["consultorio_id"],
        usuario_id=ctx["usuario_id"],
        accion="resolve_alarma",
        recurso_tipo="alarma",
        recurso_id=alarma_id,
        request=request,
    )
    return res.data[0]


# ── Métricas avanzadas ──────────────────────────────────────────────────────

@router.get("/metricas")
async def metricas_avanzadas(
    dias: int = 30,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Métricas del consultorio en los últimos N días.

    Devuelve:
    - funnel: pacientes → con_chat → con_turno → asistidos
    - turnos_por_estado: counts agrupados
    - turnos_por_dia: serie temporal
    - chat_engagement: sesiones, mensajes, abandono
    - seguimiento: alarmas generadas vs resueltas
    - telemedicina: pagos por estado
    """
    from datetime import datetime, timedelta, timezone

    dias = max(1, min(dias, 365))
    desde = (datetime.now(timezone.utc) - timedelta(days=dias)).isoformat()
    cid = ctx["consultorio_id"]
    es_super = ctx["es_superadmin"]

    def _scope(query):
        return query if es_super else query.eq("consultorio_id", cid)

    # ── Pacientes nuevos en el período ──
    pacientes_q = _scope(db.table("pacientes").select("id, created_at, estado")).gte("created_at", desde).execute()
    pacientes = pacientes_q.data or []
    pacientes_ids = [p["id"] for p in pacientes]

    # ── Sesiones de agente IA en el período ──
    sesiones_q = _scope(db.table("sesiones_agente").select("session_id, paciente_id, created_at")).gte("created_at", desde).execute()
    sesiones = sesiones_q.data or []
    sesiones_con_paciente = [s for s in sesiones if s.get("paciente_id")]

    # ── Turnos en el período ──
    turnos_q = _scope(db.table("turnos").select("id, paciente_id, estado, fecha_hora, modalidad, created_at")).gte("created_at", desde).execute()
    turnos = turnos_q.data or []

    # Funnel
    pacientes_con_chat = len({s["paciente_id"] for s in sesiones_con_paciente})
    pacientes_con_turno = len({t["paciente_id"] for t in turnos if t.get("paciente_id")})
    pacientes_asistidos = len({t["paciente_id"] for t in turnos if t["estado"] == "realizado" and t.get("paciente_id")})

    funnel = {
        "pacientes_nuevos": len(pacientes),
        "con_chat": pacientes_con_chat,
        "con_turno": pacientes_con_turno,
        "asistidos": pacientes_asistidos,
    }

    # Turnos por estado
    estados = {}
    for t in turnos:
        e = t["estado"]
        estados[e] = estados.get(e, 0) + 1

    # Turnos por día (serie temporal — agrupada por fecha de creación)
    serie = {}
    for t in turnos:
        try:
            d = (t.get("created_at") or "")[:10]
            if d:
                serie[d] = serie.get(d, 0) + 1
        except Exception:
            continue
    turnos_por_dia = sorted(
        [{"fecha": d, "count": c} for d, c in serie.items()],
        key=lambda x: x["fecha"],
    )

    # Tasa de asistencia
    realizados = estados.get("realizado", 0)
    ausentes = estados.get("ausente", 0) + estados.get("cancelado", 0)
    tasa_asistencia = round(realizados / max(1, realizados + ausentes) * 100, 1)

    # Chat engagement: sesiones sin paciente asociado = lead que se fue
    chat_engagement = {
        "sesiones_total": len(sesiones),
        "sesiones_convertidas": pacientes_con_chat,
        "sesiones_abandonadas": len(sesiones) - pacientes_con_chat,
        "tasa_conversion": round(pacientes_con_chat / max(1, len(sesiones)) * 100, 1),
    }

    # Seguimiento: alarmas en el período
    alarmas_q = _scope(db.table("alarmas").select("id, resuelta, prioridad, created_at")).gte("created_at", desde).execute()
    alarmas = alarmas_q.data or []
    seguimiento = {
        "alarmas_generadas": len(alarmas),
        "alarmas_resueltas": sum(1 for a in alarmas if a.get("resuelta")),
        "alarmas_alta_prioridad": sum(1 for a in alarmas if a.get("prioridad") == "alta"),
        "efectividad": round(
            sum(1 for a in alarmas if a.get("resuelta")) / max(1, len(alarmas)) * 100,
            1,
        ),
    }

    # Telemedicina
    virtuales = [t for t in turnos if t.get("modalidad") == "virtual"]
    pagos_q = _scope(db.table("turnos").select("estado_pago")).eq("modalidad", "virtual").gte("created_at", desde).execute()
    pagos = pagos_q.data or []
    estados_pago = {}
    for p in pagos:
        ep = p.get("estado_pago") or "no_aplica"
        estados_pago[ep] = estados_pago.get(ep, 0) + 1

    telemedicina = {
        "turnos_virtuales": len(virtuales),
        "porcentaje_virtual": round(len(virtuales) / max(1, len(turnos)) * 100, 1),
        "pagos_por_estado": estados_pago,
    }

    return {
        "ok": True,
        "periodo": {"dias": dias, "desde": desde},
        "consultorio_id": cid if not es_super else None,
        "funnel": funnel,
        "turnos": {
            "total": len(turnos),
            "por_estado": estados,
            "por_dia": turnos_por_dia,
            "tasa_asistencia": tasa_asistencia,
        },
        "chat_engagement": chat_engagement,
        "seguimiento": seguimiento,
        "telemedicina": telemedicina,
    }
