"""
M13: gestión de consultorios. Onboarding y compliance del cliente.
"""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel, EmailStr
from supabase import Client

from app.db.client import get_supabase_client
from app.routers.auth import require_staff_context
from app.services.audit import log_action
from app.services.compliance import obtener_checklist, recalcular_estado_compliance

router = APIRouter(prefix="/consultorios", tags=["consultorios"], redirect_slashes=False)


def get_db() -> Client:
    return get_supabase_client()


# ── Schemas ─────────────────────────────────────────────────────────────────

class OnboardingRequest(BaseModel):
    nombre: str
    pais_codigo: str
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    wa_numero: Optional[str] = None
    identificacion_fiscal: Optional[str] = None
    matricula_titular: Optional[str] = None
    odontologo_titular_id: Optional[str] = None
    idioma_override: Optional[str] = None
    timezone_override: Optional[str] = None


# ── Endpoints públicos / paciente / staff ────────────────────────────────────

@router.get("/paises")
async def listar_paises(db: Client = Depends(get_db)):
    """Catálogo público de países soportados (para wizard onboarding)."""
    res = db.table("paises").select("codigo, nombre, idioma_default, moneda").eq("activo", True).order("nombre").execute()
    return res.data or []


# ── Política de privacidad por país (texto template) ────────────────────────

POLITICA_PRIVACIDAD: dict[str, dict[str, str]] = {
    "AR": {
        "es": """
**Política de Privacidad — {nombre_consultorio}**

En cumplimiento de la **Ley Nacional 25.326** de Protección de Datos Personales y la Disposición 11/2006 de la AAIP, informamos:

**1. Responsable del tratamiento**
{nombre_consultorio}, con domicilio en {direccion}, es responsable de la base de datos personales registrada ante la AAIP.

**2. Datos que recopilamos**
- Nombre, teléfono y email para identificarte y contactarte.
- Datos clínicos (alergias, antecedentes, tratamientos) si así lo informás durante una consulta.
- Mensajes intercambiados con el asistente virtual.
- Datos de tus turnos.

**3. Finalidad**
- Prestar el servicio odontológico solicitado.
- Coordinar y recordarte tus turnos.
- Mantener tu historia clínica.
- Comunicarte ofertas y novedades del consultorio (podés oponerte en cualquier momento).

**4. Seguridad**
Tus datos están encriptados en reposo (AES-128 con HMAC-SHA256) y la conexión es por HTTPS. Solo el personal autorizado del consultorio puede acceder a tu historia clínica.

**5. Tus derechos (ARCO)**
Podés solicitar en cualquier momento:
- **Acceso**: ver todos los datos que tenemos sobre vos. Disponible en `/mis-turnos` → "Descargar mis datos".
- **Rectificación**: corregir datos incorrectos.
- **Cancelación**: que eliminemos tus datos. Disponible en `/mis-turnos` → "Eliminar mi cuenta".
- **Oposición**: que dejemos de procesarlos para ciertos fines (marketing).

**6. Conservación**
Conservamos tus datos por **5 años** desde tu último turno, según la normativa argentina.

**7. Contacto**
Para ejercer tus derechos o consultas: {email_contacto}

La AAIP, como autoridad de aplicación, recibe denuncias en aaip.gob.ar.
""",
        "en": "Privacy Policy template (English) — translation pending. Use the Spanish version as reference.",
        "pt-BR": "Política de Privacidade (português) — tradução pendente. Use a versão em espanhol como referência.",
    },
    "BO": {
        "es": """
**Política de Privacidad — {nombre_consultorio}**

En cumplimiento de la Constitución Política del Estado (Art. 21 y 130) y normativas vigentes en Bolivia, informamos:

**1. Responsable**
{nombre_consultorio}, con domicilio en {direccion}.

**2. Datos que recopilamos**
- Nombre, teléfono y email para identificarte.
- Datos clínicos durante la consulta.
- Mensajes con el asistente virtual.
- Tus turnos.

**3. Finalidad**
- Prestar atención odontológica.
- Coordinar turnos.
- Mantener historia clínica.

**4. Seguridad**
Datos encriptados en reposo y conexión por HTTPS. Solo personal autorizado accede a tu historia clínica.

**5. Tus derechos**
- Acceder a tus datos: `/mis-turnos` → "Descargar mis datos".
- Eliminar tu cuenta: `/mis-turnos` → "Eliminar mi cuenta".

**6. Conservación**
5 años desde tu último turno.

**7. Contacto**
{email_contacto}
""",
        "en": "Privacy Policy template (English) — translation pending.",
        "pt-BR": "Política de Privacidade (português) — tradução pendente.",
    },
    "US": {
        "en": """
**Notice of Privacy Practices — {nombre_consultorio}**

This notice describes how medical information about you may be used and disclosed and how you can get access to this information. **Please review it carefully.**

**1. Effective Date**
This notice is effective as of {fecha_actual}.

**2. Our Pledge**
{nombre_consultorio} is required by HIPAA (45 CFR Parts 160 and 164) to protect your Protected Health Information (PHI).

**3. How We Use and Disclose Your PHI**
- **Treatment**: to provide dental care.
- **Payment**: to bill insurance or you directly.
- **Operations**: to manage the practice.
- **Without your authorization**: we may disclose PHI as required by law.
- **With your authorization**: for marketing or any other purpose not listed.

**4. Your Rights Under HIPAA**
- **Right to Access**: download your PHI at `/my-appointments` → "Download my data".
- **Right to Amend**: request corrections to incorrect data.
- **Right to Deletion**: request anonymization at `/my-appointments` → "Delete my account".
- **Right to Restrict**: request limits on how we use/disclose your PHI.
- **Right to an Accounting of Disclosures**: list of who we have shared your PHI with.

**5. Security**
PHI is encrypted at rest (AES-128 + HMAC-SHA256) and in transit (TLS 1.2+). Audit logs track all access. We have a Business Associate Agreement (BAA) with our cloud providers.

**6. Breach Notification**
If your PHI is compromised, we will notify you within **60 days** as required by HIPAA Breach Notification Rule.

**7. Complaints**
You may file a complaint with us or with the U.S. Department of Health and Human Services, Office for Civil Rights:
- HHS OCR: 1-877-696-6775
- {email_contacto}

We will not retaliate against you for filing a complaint.
""",
        "es": "Privacy Policy template (Spanish) — translation pending. Use the English version as reference.",
        "pt-BR": "Política de Privacidade (português) — tradução pendente.",
    },
}


@router.get("/politica-privacidad")
async def politica_privacidad(
    consultorio_id: int = 1,
    idioma: str = "es",
    db: Client = Depends(get_db),
):
    """
    Devuelve el texto de política de privacidad personalizado para un consultorio.
    Endpoint público — no requiere auth.
    """
    cons = db.table("consultorios") \
        .select("nombre, direccion, email, pais_codigo") \
        .eq("id", consultorio_id).single().execute()

    if not cons.data:
        raise HTTPException(status_code=404, detail="Consultorio no encontrado")

    pais_codigo = cons.data["pais_codigo"]
    plantillas = POLITICA_PRIVACIDAD.get(pais_codigo, POLITICA_PRIVACIDAD["AR"])
    texto = plantillas.get(idioma) or plantillas.get("es") or plantillas.get("en", "")

    from datetime import date
    texto_renderizado = texto.format(
        nombre_consultorio=cons.data["nombre"] or "El consultorio",
        direccion=cons.data.get("direccion") or "[dirección no informada]",
        email_contacto=cons.data.get("email") or "[email no informado]",
        fecha_actual=date.today().isoformat(),
    )

    return {
        "consultorio_id": consultorio_id,
        "pais_codigo": pais_codigo,
        "idioma": idioma,
        "version": "1.0",
        "texto_markdown": texto_renderizado.strip(),
    }


@router.get("/mi-consultorio")
async def mi_consultorio(ctx: dict = Depends(require_staff_context), db: Client = Depends(get_db)):
    """Datos del consultorio del staff logueado."""
    res = (
        db.table("consultorios")
        .select("*, paises(codigo, nombre, idioma_default, moneda, timezone_default, modelo_ia_default, requiere_audit_log, requiere_consentimiento_explicito, requiere_firma_receta)")
        .eq("id", ctx["consultorio_id"])
        .single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Consultorio no encontrado")
    return res.data


@router.get("/mi-consultorio/checklist")
async def mi_consultorio_checklist(
    idioma: str = "es",
    ctx: dict = Depends(require_staff_context),
):
    """Checklist de compliance del consultorio del staff."""
    return obtener_checklist(ctx["consultorio_id"], idioma=idioma)


# ── Onboarding (creación de un consultorio nuevo) ───────────────────────────

@router.post("/onboarding")
async def onboarding(
    req: OnboardingRequest,
    request: Request,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """
    Crea un consultorio nuevo. Solo superadmin (creación de cliente del SaaS).
    Para que un staff existente cree un nuevo consultorio (multi-sede en el futuro)
    también se puede permitir, pero por ahora restringido a superadmin.
    """
    if not ctx["es_superadmin"]:
        raise HTTPException(status_code=403, detail="Solo superadmin puede crear consultorios")

    # Validar país existe
    pais = db.table("paises").select("codigo").eq("codigo", req.pais_codigo).single().execute()
    if not pais.data:
        raise HTTPException(status_code=400, detail=f"País {req.pais_codigo} no soportado")

    data = req.model_dump(exclude_none=True)
    data["estado_compliance"] = "onboarding"

    res = db.table("consultorios").insert(data).execute()
    consultorio = res.data[0]

    log_action(
        consultorio_id=consultorio["id"],
        accion="create_consultorio",
        usuario_id=ctx["usuario_id"],
        recurso_tipo="consultorio",
        recurso_id=consultorio["id"],
        request=request,
    )

    return consultorio


# ── Documentos de compliance ────────────────────────────────────────────────

@router.post("/mi-consultorio/documentos")
async def subir_documento(
    request: Request,
    tipo_documento: str = Form(...),
    archivo: UploadFile = File(...),
    fecha_vencimiento: Optional[str] = Form(default=None),
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Sube (o reemplaza) un documento de compliance del consultorio del staff."""
    consultorio_id = ctx["consultorio_id"]

    # Validar que el tipo es uno de los requeridos para el país del consultorio
    cons = db.table("consultorios").select("pais_codigo").eq("id", consultorio_id).single().execute()
    if not cons.data:
        raise HTTPException(status_code=404, detail="Consultorio no encontrado")
    pais_codigo = cons.data["pais_codigo"]

    req_doc = (
        db.table("documentos_requeridos_pais")
        .select("tipo_documento, vencimiento_meses")
        .eq("pais_codigo", pais_codigo)
        .eq("tipo_documento", tipo_documento)
        .execute()
    )
    if not req_doc.data:
        raise HTTPException(
            status_code=400,
            detail=f"El tipo de documento '{tipo_documento}' no es requerido para {pais_codigo}",
        )

    # Upload a Supabase Storage (bucket documentos_compliance, privado)
    contenido = await archivo.read()
    ext = archivo.filename.rsplit(".", 1)[-1] if archivo.filename and "." in archivo.filename else "pdf"
    storage_path = f"{consultorio_id}/{tipo_documento}/{uuid.uuid4()}.{ext}"

    try:
        db.storage.from_("documentos_compliance").upload(
            storage_path,
            contenido,
            {"content-type": archivo.content_type or "application/octet-stream"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir archivo: {e}")

    # URL pública (se cambiará a signed URL en frontend cuando se vea)
    archivo_url = db.storage.from_("documentos_compliance").get_public_url(storage_path)

    # Upsert en documentos_consultorio (reemplaza si ya existe)
    payload = {
        "consultorio_id": consultorio_id,
        "tipo_documento": tipo_documento,
        "archivo_url": archivo_url,
        "fecha_vencimiento": fecha_vencimiento,
        "estado": "pendiente_revision",
        "observaciones": None,
        "revisado_por": None,
        "revisado_at": None,
    }
    res = (
        db.table("documentos_consultorio")
        .upsert(payload, on_conflict="consultorio_id,tipo_documento")
        .execute()
    )

    log_action(
        consultorio_id=consultorio_id,
        accion="upload_documento",
        usuario_id=ctx["usuario_id"],
        recurso_tipo="documento_consultorio",
        recurso_id=res.data[0]["id"] if res.data else None,
        request=request,
        metadata={"tipo_documento": tipo_documento},
    )

    # Recalcular estado compliance del consultorio
    recalcular_estado_compliance(consultorio_id)

    return res.data[0] if res.data else {}
