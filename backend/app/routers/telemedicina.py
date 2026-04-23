"""
M11 Telemedicina (Fase A) — turnos virtuales con pago previo + sala Jitsi.

Flujo:
1. Paciente agenda turno virtual → POST /telemedicina/turnos
   - Crea turno con modalidad='virtual', estado_pago='pendiente'
   - Devuelve datos del QR de pago (qr_pago_url, datos_transferencia)
2. Paciente sube comprobante → POST /telemedicina/turnos/{id}/comprobante
   - estado_pago='comprobante_subido'
   - Notifica a admins
3. Admin verifica → PATCH /admin/turnos/{id}/verificar-pago
   - estado_pago='verificado' o 'rechazado'
   - Genera jitsi_room + jitsi_password si verifica
   - Notifica al paciente
4. Paciente entra a la sala → GET /telemedicina/turnos/{id}/sala
   - Devuelve URL Jitsi + password si pago verificado
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel
from supabase import Client

from app.core.encryption import (
    encrypt,
    hash_for_search,
    normalize_email,
    normalize_phone,
)
from app.core.tenant import resolve_consultorio_publico
from app.db.client import get_supabase_client
from app.routers.auth import require_paciente, require_staff_context
from app.services.audit import log_action
from app.services.jitsi import construir_url, generar_password, generar_room_name
from app.services.notificaciones import notificar, notificar_a_admins

router = APIRouter(prefix="/telemedicina", tags=["telemedicina"], redirect_slashes=False)


def get_db() -> Client:
    return get_supabase_client()


# ── Schemas ──────────────────────────────────────────────────────────────────

class TurnoVirtualRequest(BaseModel):
    nombre: str
    telefono: Optional[str] = None
    email: Optional[str] = None
    fecha_hora: datetime
    odontologo_id: str               # virtual SIEMPRE requiere doctor seleccionado
    es_primera_consulta: bool = True
    notas: Optional[str] = None
    consentimiento_aceptado: bool = False


# ── Endpoints públicos (paciente) ────────────────────────────────────────────

@router.get("/odontologos-virtual")
async def listar_odontologos_virtual(
    consultorio_id: int = Depends(resolve_consultorio_publico),
    db: Client = Depends(get_db),
):
    """Devuelve odontólogos del consultorio que tienen precios de telemedicina configurados."""
    res = (
        db.table("precios_telemedicina")
        .select("odontologo_id, precio_primera_consulta, precio_seguimiento, moneda, qr_pago_url, datos_transferencia, usuarios(id, nombre, especialidades)")
        .eq("consultorio_id", consultorio_id)
        .eq("activo", True)
        .execute()
    )
    items = []
    for p in (res.data or []):
        u = p.get("usuarios")
        if not u:
            continue
        items.append({
            "id": u["id"],
            "nombre": u["nombre"],
            "especialidades": u.get("especialidades") or [],
            "precio_primera_consulta": p["precio_primera_consulta"],
            "precio_seguimiento": p["precio_seguimiento"],
            "moneda": p["moneda"],
        })
    return items


@router.get("/precio")
async def obtener_precio(
    odontologo_id: str,
    es_primera_consulta: bool = True,
    consultorio_id: int = Depends(resolve_consultorio_publico),
    db: Client = Depends(get_db),
):
    """Devuelve el precio + datos de pago para un odontólogo y tipo de consulta."""
    res = (
        db.table("precios_telemedicina")
        .select("*")
        .eq("consultorio_id", consultorio_id)
        .eq("odontologo_id", odontologo_id)
        .eq("activo", True)
        .single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Odontólogo sin telemedicina configurada")
    p = res.data
    return {
        "precio": p["precio_primera_consulta"] if es_primera_consulta else p["precio_seguimiento"],
        "moneda": p["moneda"],
        "qr_pago_url": p.get("qr_pago_url"),
        "datos_transferencia": p.get("datos_transferencia"),
    }


@router.post("/turnos")
async def crear_turno_virtual(
    req: TurnoVirtualRequest,
    consultorio_id: int = Depends(resolve_consultorio_publico),
    db: Client = Depends(get_db),
):
    """Crea un turno virtual con estado_pago='pendiente'."""
    if not req.telefono and not req.email:
        raise HTTPException(status_code=400, detail="Se requiere al menos teléfono o email")
    if not req.consentimiento_aceptado:
        raise HTTPException(status_code=400, detail="Debe aceptar la política de privacidad")

    # Obtener precio del odontólogo
    precio_res = (
        db.table("precios_telemedicina")
        .select("precio_primera_consulta, precio_seguimiento")
        .eq("consultorio_id", consultorio_id)
        .eq("odontologo_id", req.odontologo_id)
        .eq("activo", True)
        .single()
        .execute()
    )
    if not precio_res.data:
        raise HTTPException(status_code=400, detail="Odontólogo sin telemedicina configurada")
    precio = precio_res.data["precio_primera_consulta" if req.es_primera_consulta else "precio_seguimiento"]

    # Buscar/crear paciente (mismo flow que turnos.py)
    tel_norm = normalize_phone(req.telefono)
    email_norm = normalize_email(req.email)
    tel_hash = hash_for_search(tel_norm) if tel_norm else None
    email_hash = hash_for_search(email_norm) if email_norm else None

    paciente_res = None
    if tel_hash:
        paciente_res = db.table("pacientes").select("id").eq("consultorio_id", consultorio_id).eq("telefono_hash", tel_hash).execute()
    elif email_hash:
        paciente_res = db.table("pacientes").select("id").eq("consultorio_id", consultorio_id).eq("email_hash", email_hash).execute()

    if paciente_res and paciente_res.data:
        paciente_id = paciente_res.data[0]["id"]
        update_data = {"nombre": req.nombre, "estado": "turno_agendado"}
        db.table("pacientes").update(update_data).eq("id", paciente_id).execute()
    else:
        nuevo_data = {
            "nombre": req.nombre,
            "estado": "turno_agendado",
            "score": 30,
            "consultorio_id": consultorio_id,
        }
        if tel_norm:
            nuevo_data["telefono_enc"] = encrypt(tel_norm)
            nuevo_data["telefono_hash"] = tel_hash
        if email_norm:
            nuevo_data["email_enc"] = encrypt(email_norm)
            nuevo_data["email_hash"] = email_hash
        nuevo = db.table("pacientes").insert(nuevo_data).execute()
        paciente_id = nuevo.data[0]["id"]

    # Crear turno virtual
    turno_data = {
        "paciente_id": paciente_id,
        "usuario_id": req.odontologo_id,
        "fecha_hora": req.fecha_hora.isoformat(),
        "duracion_minutos": 30,
        "tipo_tratamiento": "consulta",
        "notas_enc": encrypt(req.notas) if req.notas else None,
        "estado": "solicitado",
        "consultorio_id": consultorio_id,
        "modalidad": "virtual",
        "es_primera_consulta": req.es_primera_consulta,
        "precio": float(precio),
        "estado_pago": "pendiente",
    }
    turno_res = db.table("turnos").insert(turno_data).execute()
    turno_id = turno_res.data[0]["id"]

    # Registrar consentimiento
    try:
        db.table("consentimientos").insert({
            "paciente_id": paciente_id,
            "consultorio_id": consultorio_id,
            "tipo": "telemedicina",
            "version_texto": "Política de privacidad + telemedicina aceptada al agendar",
        }).execute()
    except Exception:
        pass

    # Devolver datos para QR de pago
    pago = (
        db.table("precios_telemedicina")
        .select("qr_pago_url, datos_transferencia, moneda")
        .eq("consultorio_id", consultorio_id)
        .eq("odontologo_id", req.odontologo_id)
        .single()
        .execute()
    )

    return {
        "turno_id": turno_id,
        "paciente_id": paciente_id,
        "estado": "solicitado",
        "estado_pago": "pendiente",
        "precio": float(precio),
        "moneda": pago.data.get("moneda", "ARS"),
        "qr_pago_url": pago.data.get("qr_pago_url"),
        "datos_transferencia": pago.data.get("datos_transferencia"),
    }


@router.post("/turnos/{turno_id}/comprobante")
async def subir_comprobante(
    turno_id: int,
    request: Request,
    archivo: UploadFile = File(...),
    db: Client = Depends(get_db),
):
    """
    Sube comprobante de pago. Endpoint público — el paciente identifica el turno
    por su ID que recibió al crear. (En F5b agregaremos token de turno.)
    """
    turno = db.table("turnos").select("id, consultorio_id, paciente_id, modalidad, estado_pago").eq("id", turno_id).single().execute()
    if not turno.data:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    if turno.data["modalidad"] != "virtual":
        raise HTTPException(status_code=400, detail="Solo turnos virtuales aceptan comprobante")
    if turno.data["estado_pago"] not in ("pendiente", "rechazado"):
        raise HTTPException(status_code=400, detail=f"El turno está en estado {turno.data['estado_pago']}")

    contenido = await archivo.read()
    ext = archivo.filename.rsplit(".", 1)[-1] if archivo.filename and "." in archivo.filename else "jpg"
    consultorio_id = turno.data["consultorio_id"]
    storage_path = f"{consultorio_id}/{turno_id}/{uuid.uuid4()}.{ext}"

    try:
        db.storage.from_("comprobantes").upload(
            storage_path,
            contenido,
            {"content-type": archivo.content_type or "image/jpeg"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir comprobante: {e}")

    archivo_url = db.storage.from_("comprobantes").get_public_url(storage_path)

    db.table("turnos").update({
        "comprobante_url": archivo_url,
        "estado_pago": "comprobante_subido",
    }).eq("id", turno_id).execute()

    log_action(
        consultorio_id=consultorio_id,
        accion="upload_comprobante",
        paciente_id=turno.data["paciente_id"],
        recurso_tipo="turno",
        recurso_id=turno_id,
        request=request,
    )

    notificar_a_admins(
        consultorio_id=consultorio_id,
        tipo="comprobante_recibido",
        titulo="Comprobante de pago recibido",
        mensaje=f"Turno virtual #{turno_id} — verificar y aprobar pago",
        link="/admin/pagos",
        metadata={"turno_id": turno_id},
        prioridad="alta",
    )

    return {"ok": True, "estado_pago": "comprobante_subido"}


@router.get("/turnos/{turno_id}/sala")
async def obtener_sala(
    turno_id: int,
    payload: dict = Depends(require_paciente),
    db: Client = Depends(get_db),
):
    """Devuelve URL + password de la sala Jitsi. Solo si pago verificado."""
    paciente_id = int(payload["sub"])
    turno = (
        db.table("turnos")
        .select("id, paciente_id, modalidad, estado_pago, jitsi_room, jitsi_password, fecha_hora")
        .eq("id", turno_id)
        .eq("paciente_id", paciente_id)
        .single()
        .execute()
    )
    if not turno.data:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    if turno.data["modalidad"] != "virtual":
        raise HTTPException(status_code=400, detail="No es un turno virtual")
    if turno.data["estado_pago"] != "verificado":
        raise HTTPException(status_code=403, detail=f"Pago no verificado (estado: {turno.data['estado_pago']})")
    if not turno.data.get("jitsi_room"):
        raise HTTPException(status_code=500, detail="Sala no generada — contactar al consultorio")

    return {
        "turno_id": turno_id,
        "fecha_hora": turno.data["fecha_hora"],
        "url": construir_url(turno.data["jitsi_room"]),
        "room_name": turno.data["jitsi_room"],
        "password": turno.data["jitsi_password"],
    }


# ── Endpoints admin ──────────────────────────────────────────────────────────

@router.get("/admin/pagos-pendientes")
async def listar_pagos_pendientes(
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Turnos virtuales con comprobante subido esperando verificación."""
    query = (
        db.table("turnos")
        .select("*, pacientes(id, nombre, telefono, telefono_enc, telefono_hash)")
        .eq("modalidad", "virtual")
        .eq("estado_pago", "comprobante_subido")
    )
    if not ctx["es_superadmin"]:
        query = query.eq("consultorio_id", ctx["consultorio_id"])
    res = query.order("fecha_hora").execute()

    from app.core.paciente_helpers import hidratar_lista_turnos
    return hidratar_lista_turnos(res.data or [])


class VerificarPagoRequest(BaseModel):
    aprobado: bool
    motivo_rechazo: Optional[str] = None


@router.patch("/admin/turnos/{turno_id}/verificar-pago")
async def verificar_pago(
    turno_id: int,
    req: VerificarPagoRequest,
    request: Request,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Admin aprueba o rechaza el comprobante. Si aprueba, genera la sala Jitsi."""
    turno = db.table("turnos").select("id, consultorio_id, paciente_id, modalidad, estado_pago, jitsi_room").eq("id", turno_id).single().execute()
    if not turno.data:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    if not ctx["es_superadmin"] and turno.data["consultorio_id"] != ctx["consultorio_id"]:
        raise HTTPException(status_code=403, detail="Turno de otro consultorio")
    if turno.data["modalidad"] != "virtual":
        raise HTTPException(status_code=400, detail="No es un turno virtual")

    if req.aprobado:
        # Generar sala Jitsi
        room = turno.data.get("jitsi_room") or generar_room_name(turno_id)
        password = generar_password()
        update = {
            "estado_pago": "verificado",
            "fecha_pago_verificado": datetime.now(timezone.utc).isoformat(),
            "estado": "confirmado",
            "jitsi_room": room,
            "jitsi_password": password,
        }
        accion = "verificar_pago"
    else:
        update = {
            "estado_pago": "rechazado",
        }
        accion = "rechazar_pago"

    db.table("turnos").update(update).eq("id", turno_id).execute()

    log_action(
        consultorio_id=turno.data["consultorio_id"],
        usuario_id=ctx["usuario_id"],
        paciente_id=turno.data["paciente_id"],
        accion=accion,
        recurso_tipo="turno",
        recurso_id=turno_id,
        request=request,
        metadata={"motivo": req.motivo_rechazo} if req.motivo_rechazo else None,
    )

    # Notificar al paciente
    notificar(
        consultorio_id=turno.data["consultorio_id"],
        paciente_id=turno.data["paciente_id"],
        tipo="pago_verificado" if req.aprobado else "comprobante_recibido",
        titulo="Pago verificado ✓" if req.aprobado else "Comprobante rechazado",
        mensaje="Tu turno virtual está confirmado. Podés entrar a la sala el día y hora indicados." if req.aprobado else (req.motivo_rechazo or "Por favor subí un comprobante válido."),
        link="/mis-turnos",
        metadata={"turno_id": turno_id},
        prioridad="alta",
    )

    return {"ok": True, "estado_pago": update["estado_pago"]}


# ── Configuración de precios (admin) ─────────────────────────────────────────

class PrecioRequest(BaseModel):
    odontologo_id: str
    precio_primera_consulta: float
    precio_seguimiento: float
    moneda: str = "ARS"
    qr_pago_url: Optional[str] = None
    datos_transferencia: Optional[str] = None


@router.get("/admin/precios")
async def listar_precios(
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Precios de telemedicina por odontólogo del consultorio."""
    res = (
        db.table("precios_telemedicina")
        .select("*, usuarios(id, nombre)")
        .eq("consultorio_id", ctx["consultorio_id"])
        .order("created_at", desc=True)
        .execute()
    )
    return res.data or []


@router.post("/admin/precios")
async def crear_o_actualizar_precio(
    req: PrecioRequest,
    request: Request,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Upsert de precio para un odontólogo. Solo admin del consultorio."""
    payload = {
        "consultorio_id": ctx["consultorio_id"],
        "odontologo_id": req.odontologo_id,
        "precio_primera_consulta": req.precio_primera_consulta,
        "precio_seguimiento": req.precio_seguimiento,
        "moneda": req.moneda,
        "qr_pago_url": req.qr_pago_url,
        "datos_transferencia": req.datos_transferencia,
        "activo": True,
    }
    res = (
        db.table("precios_telemedicina")
        .upsert(payload, on_conflict="consultorio_id,odontologo_id")
        .execute()
    )

    log_action(
        consultorio_id=ctx["consultorio_id"],
        usuario_id=ctx["usuario_id"],
        accion="upsert_precio_telemedicina",
        recurso_tipo="precio_telemedicina",
        recurso_id=req.odontologo_id,
        request=request,
    )

    return res.data[0] if res.data else {}
