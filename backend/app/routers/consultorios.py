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
from app.routers.auth import require_staff_context, require_superadmin
from app.services.audit import log_action
from app.services.compliance import obtener_checklist, recalcular_estado_compliance
from app.core.tenant import normalizar_hostname, resolver_consultorio_por_hostname

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


class MiConsultorioPatch(BaseModel):
    """Datos editables por el admin del propio consultorio.
    No incluye `pais_codigo`, `estado_compliance` ni `identificacion_fiscal` —
    cambios ahí los hace solo superadmin."""
    nombre: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    wa_numero: Optional[str] = None
    matricula_titular: Optional[str] = None
    idioma_override: Optional[str] = None
    timezone_override: Optional[str] = None


# ── Endpoints públicos / paciente / staff ────────────────────────────────────

@router.get("/paises")
async def listar_paises(db: Client = Depends(get_db)):
    """Catálogo público de países soportados (para wizard onboarding)."""
    res = db.table("paises").select("codigo, nombre, idioma_default, moneda").eq("activo", True).order("nombre").execute()
    return res.data or []


# ── Resolución pública por hostname ─────────────────────────────────────────

@router.get("/resolver-hostname")
async def resolver_hostname(host: str, db: Client = Depends(get_db)):
    """Resuelve hostname → consultorio_id + datos básicos para que el frontend
    cachée el tenant sin tener que hardcodear NEXT_PUBLIC_CONSULTORIO_ID.

    Endpoint público — el browser lo llama con su window.location.host al
    arrancar la app. Si el host no matchea, devuelve el consultorio default
    (preserva el comportamiento del cliente único actual)."""
    cid = resolver_consultorio_por_hostname(host)
    fallback = cid is None
    if cid is None:
        from app.core.tenant import DEFAULT_CONSULTORIO_ID
        cid = DEFAULT_CONSULTORIO_ID

    cons = (
        db.table("consultorios")
        .select("id, nombre, pais_codigo, idioma_override, paises(idioma_default, moneda, timezone_default)")
        .eq("id", cid)
        .single()
        .execute()
    )
    if not cons.data:
        raise HTTPException(status_code=404, detail="Consultorio no encontrado")

    paises = cons.data.get("paises") or {}
    idioma = cons.data.get("idioma_override") or paises.get("idioma_default") or "es"
    return {
        "consultorio_id": cid,
        "nombre": cons.data.get("nombre"),
        "pais_codigo": cons.data.get("pais_codigo"),
        "idioma": idioma,
        "moneda": paises.get("moneda"),
        "timezone": paises.get("timezone_default"),
        "hostname_resuelto": normalizar_hostname(host),
        "fallback_aplicado": fallback,
    }


# ── Gestión de dominios (admin del propio consultorio + superadmin) ─────────

class DominioCreate(BaseModel):
    hostname: str
    es_default: bool = False
    notas: Optional[str] = None


@router.get("/mi-consultorio/dominios")
async def listar_mis_dominios(
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Lista los dominios mapeados al consultorio del staff."""
    res = (
        db.table("dominios_consultorio")
        .select("*")
        .eq("consultorio_id", ctx["consultorio_id"])
        .order("es_default", desc=True)
        .order("created_at")
        .execute()
    )
    return res.data or []


@router.post("/mi-consultorio/dominios")
async def agregar_dominio(
    req: DominioCreate,
    request: Request,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Agrega un hostname al consultorio. Solo admin del consultorio o superadmin."""
    if ctx["rol"] != "admin" and not ctx["es_superadmin"]:
        raise HTTPException(status_code=403, detail="Solo admin puede gestionar dominios")

    hostname = normalizar_hostname(req.hostname)
    if not hostname:
        raise HTTPException(status_code=400, detail="hostname inválido")

    # Si se marca como default, desmarcar el actual
    if req.es_default:
        db.table("dominios_consultorio") \
          .update({"es_default": False}) \
          .eq("consultorio_id", ctx["consultorio_id"]) \
          .execute()

    try:
        res = db.table("dominios_consultorio").insert({
            "consultorio_id": ctx["consultorio_id"],
            "hostname": hostname,
            "es_default": req.es_default,
            "notas": req.notas,
        }).execute()
    except Exception as e:
        # Manejo del UNIQUE: hostname ya está mapeado a otro consultorio
        raise HTTPException(status_code=409, detail=f"hostname ya en uso: {e}")

    log_action(
        consultorio_id=ctx["consultorio_id"],
        usuario_id=ctx["usuario_id"],
        accion="add_dominio",
        recurso_tipo="dominio_consultorio",
        recurso_id=res.data[0]["id"] if res.data else None,
        request=request,
        metadata={"hostname": hostname, "es_default": req.es_default},
    )
    return res.data[0] if res.data else {}


@router.delete("/mi-consultorio/dominios/{dominio_id}")
async def quitar_dominio(
    dominio_id: int,
    request: Request,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Elimina un hostname del consultorio. Solo admin / superadmin."""
    if ctx["rol"] != "admin" and not ctx["es_superadmin"]:
        raise HTTPException(status_code=403, detail="Solo admin puede gestionar dominios")

    check = db.table("dominios_consultorio").select("consultorio_id, hostname").eq("id", dominio_id).single().execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Dominio no encontrado")
    if not ctx["es_superadmin"] and check.data["consultorio_id"] != ctx["consultorio_id"]:
        raise HTTPException(status_code=403, detail="Dominio de otro consultorio")

    db.table("dominios_consultorio").delete().eq("id", dominio_id).execute()
    log_action(
        consultorio_id=check.data["consultorio_id"],
        usuario_id=ctx["usuario_id"],
        accion="delete_dominio",
        recurso_tipo="dominio_consultorio",
        recurso_id=dominio_id,
        request=request,
        metadata={"hostname": check.data["hostname"]},
    )
    return {"ok": True}


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
        "en": """
**Privacy Policy — {nombre_consultorio}**

In compliance with **Argentina's National Law 25.326** on Personal Data Protection and AAIP Provision 11/2006, we inform you:

**1. Data controller**
{nombre_consultorio}, located at {direccion}, is responsible for the personal database registered with the AAIP (Argentina's Data Protection Agency).

**2. Data we collect**
- Name, phone and email to identify and contact you.
- Clinical data (allergies, medical history, treatments) when you provide it during a visit.
- Messages exchanged with our virtual assistant.
- Your appointment data.

**3. Purpose**
- Providing the dental service you requested.
- Scheduling and reminding you about your appointments.
- Maintaining your clinical history.
- Sending offers and clinic news (you can opt out at any time).

**4. Security**
Your data is encrypted at rest (AES-128 with HMAC-SHA256) and the connection uses HTTPS. Only authorized clinic staff can access your clinical history.

**5. Your rights (ARCO)**
You may request at any time:
- **Access**: view all data we hold about you. Available at `/my-appointments` → "Download my data".
- **Rectification**: correct inaccurate data.
- **Cancellation**: have your data erased. Available at `/my-appointments` → "Delete my account".
- **Objection**: that we stop processing your data for certain purposes (e.g. marketing).

**6. Retention**
We keep your data for **5 years** from your last appointment, as required by Argentine regulations.

**7. Contact**
To exercise your rights or for inquiries: {email_contacto}

The AAIP, as the regulatory authority, receives complaints at aaip.gob.ar.
""",
        "pt-BR": """
**Política de Privacidade — {nombre_consultorio}**

Em cumprimento à **Lei Nacional 25.326** de Proteção de Dados Pessoais da Argentina e à Disposição 11/2006 da AAIP, informamos:

**1. Responsável pelo tratamento**
{nombre_consultorio}, com domicílio em {direccion}, é responsável pelo banco de dados pessoais registrado na AAIP (autoridade argentina).

**2. Dados que coletamos**
- Nome, telefone e e-mail para identificá-lo(a) e entrar em contato.
- Dados clínicos (alergias, antecedentes, tratamentos) quando informados durante uma consulta.
- Mensagens trocadas com o assistente virtual.
- Dados das suas consultas.

**3. Finalidade**
- Prestar o serviço odontológico solicitado.
- Coordenar e lembrar suas consultas.
- Manter sua história clínica.
- Enviar ofertas e novidades da clínica (você pode se opor a qualquer momento).

**4. Segurança**
Seus dados são criptografados em repouso (AES-128 com HMAC-SHA256) e a conexão é via HTTPS. Apenas a equipe autorizada da clínica pode acessar sua história clínica.

**5. Seus direitos (ARCO)**
Você pode solicitar a qualquer momento:
- **Acesso**: ver todos os dados que temos sobre você. Disponível em `/mis-turnos` → "Baixar meus dados".
- **Retificação**: corrigir dados incorretos.
- **Cancelamento**: que apaguemos seus dados. Disponível em `/mis-turnos` → "Excluir minha conta".
- **Oposição**: que paremos de processá-los para certas finalidades (marketing).

**6. Conservação**
Conservamos seus dados por **5 anos** desde sua última consulta, conforme a legislação argentina.

**7. Contato**
Para exercer seus direitos ou tirar dúvidas: {email_contacto}

A AAIP, como autoridade aplicadora, recebe denúncias em aaip.gob.ar.
""",
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
        "en": """
**Privacy Policy — {nombre_consultorio}**

In compliance with Bolivia's Political Constitution (Articles 21 and 130) and applicable regulations, we inform you:

**1. Data controller**
{nombre_consultorio}, located at {direccion}.

**2. Data we collect**
- Name, phone and email to identify you.
- Clinical data shared during your visit.
- Messages with the virtual assistant.
- Your appointments.

**3. Purpose**
- Providing dental care.
- Scheduling appointments.
- Maintaining clinical history.

**4. Security**
Data is encrypted at rest and the connection uses HTTPS. Only authorized staff can access your clinical history.

**5. Your rights**
- Access your data: `/my-appointments` → "Download my data".
- Delete your account: `/my-appointments` → "Delete my account".

**6. Retention**
5 years from your last appointment.

**7. Contact**
{email_contacto}
""",
        "pt-BR": """
**Política de Privacidade — {nombre_consultorio}**

Em cumprimento à Constituição Política do Estado boliviano (Arts. 21 e 130) e normas vigentes na Bolívia, informamos:

**1. Responsável**
{nombre_consultorio}, com domicílio em {direccion}.

**2. Dados que coletamos**
- Nome, telefone e e-mail para identificá-lo(a).
- Dados clínicos durante a consulta.
- Mensagens com o assistente virtual.
- Suas consultas.

**3. Finalidade**
- Prestar atendimento odontológico.
- Coordenar consultas.
- Manter história clínica.

**4. Segurança**
Dados criptografados em repouso e conexão via HTTPS. Apenas equipe autorizada acessa sua história clínica.

**5. Seus direitos**
- Acessar seus dados: `/mis-turnos` → "Baixar meus dados".
- Excluir sua conta: `/mis-turnos` → "Excluir minha conta".

**6. Conservação**
5 anos desde sua última consulta.

**7. Contato**
{email_contacto}
""",
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
        "es": """
**Aviso de Prácticas de Privacidad — {nombre_consultorio}**

Este aviso describe cómo puede usarse y divulgarse la información médica sobre ti y cómo puedes acceder a esta información. **Por favor revísalo con atención.**

**1. Fecha de vigencia**
Este aviso entra en vigencia el {fecha_actual}.

**2. Nuestro compromiso**
{nombre_consultorio} está obligado por HIPAA (45 CFR Partes 160 y 164) a proteger tu Información Médica Protegida (PHI).

**3. Cómo usamos y divulgamos tu PHI**
- **Tratamiento**: para brindar atención dental.
- **Pago**: para facturar al seguro o a ti directamente.
- **Operaciones**: para administrar la práctica.
- **Sin tu autorización**: podemos divulgar PHI cuando lo requiera la ley.
- **Con tu autorización**: para marketing o cualquier otro propósito no listado.

**4. Tus derechos bajo HIPAA**
- **Derecho de acceso**: descargá tu PHI en `/mis-turnos` → "Descargar mis datos".
- **Derecho a enmendar**: solicitar correcciones a datos incorrectos.
- **Derecho de eliminación**: solicitar anonimización en `/mis-turnos` → "Eliminar mi cuenta".
- **Derecho a restringir**: solicitar límites sobre cómo usamos/divulgamos tu PHI.
- **Derecho a un registro de divulgaciones**: lista de con quién compartimos tu PHI.

**5. Seguridad**
La PHI se cifra en reposo (AES-128 + HMAC-SHA256) y en tránsito (TLS 1.2+). Los logs de auditoría registran todos los accesos. Contamos con un Business Associate Agreement (BAA) con nuestros proveedores cloud.

**6. Notificación de brechas**
Si tu PHI se ve comprometida, te notificaremos dentro de **60 días** según la HIPAA Breach Notification Rule.

**7. Quejas**
Podés presentar una queja con nosotros o con el U.S. Department of Health and Human Services, Office for Civil Rights:
- HHS OCR: 1-877-696-6775
- {email_contacto}

No tomaremos represalias contra ti por presentar una queja.
""",
        "pt-BR": """
**Aviso de Práticas de Privacidade — {nombre_consultorio}**

Este aviso descreve como informações médicas sobre você podem ser usadas e divulgadas, e como você pode acessá-las. **Leia com atenção.**

**1. Data de vigência**
Este aviso entra em vigor em {fecha_actual}.

**2. Nosso compromisso**
{nombre_consultorio} é obrigado pela HIPAA (45 CFR Partes 160 e 164) a proteger suas Informações de Saúde Protegidas (PHI).

**3. Como usamos e divulgamos sua PHI**
- **Tratamento**: para prestar atendimento odontológico.
- **Pagamento**: para faturar ao seguro ou diretamente a você.
- **Operações**: para administrar a clínica.
- **Sem sua autorização**: podemos divulgar PHI quando exigido por lei.
- **Com sua autorização**: para marketing ou qualquer outra finalidade não listada.

**4. Seus direitos sob HIPAA**
- **Direito de acesso**: baixe sua PHI em `/mis-turnos` → "Baixar meus dados".
- **Direito de retificação**: solicitar correções de dados incorretos.
- **Direito de exclusão**: solicitar anonimização em `/mis-turnos` → "Excluir minha conta".
- **Direito de restrição**: solicitar limites sobre como usamos/divulgamos sua PHI.
- **Direito a um relatório de divulgações**: lista de com quem compartilhamos sua PHI.

**5. Segurança**
A PHI é criptografada em repouso (AES-128 + HMAC-SHA256) e em trânsito (TLS 1.2+). Logs de auditoria registram todos os acessos. Temos Business Associate Agreement (BAA) com nossos provedores cloud.

**6. Notificação de violações**
Se sua PHI for comprometida, notificaremos você em até **60 dias**, conforme a HIPAA Breach Notification Rule.

**7. Reclamações**
Você pode apresentar uma reclamação conosco ou ao U.S. Department of Health and Human Services, Office for Civil Rights:
- HHS OCR: 1-877-696-6775
- {email_contacto}

Não retaliaremos contra você por apresentar uma reclamação.
""",
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


@router.patch("/mi-consultorio")
async def actualizar_mi_consultorio(
    req: MiConsultorioPatch,
    request: Request,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """Permite al admin editar los datos básicos del consultorio (nombre, dirección, contacto, etc.).
    Restricciones: solo admin (no recepcionista ni odontólogo). Cambios de país o
    identificación fiscal son solo de superadmin."""
    if ctx["rol"] != "admin" and not ctx["es_superadmin"]:
        raise HTTPException(status_code=403, detail="Solo el admin puede editar el consultorio")

    cambios = req.model_dump(exclude_none=True)
    if not cambios:
        raise HTTPException(status_code=400, detail="Sin cambios para aplicar")

    res = (
        db.table("consultorios")
        .update(cambios)
        .eq("id", ctx["consultorio_id"])
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Consultorio no encontrado")

    log_action(
        consultorio_id=ctx["consultorio_id"],
        accion="update_consultorio",
        usuario_id=ctx["usuario_id"],
        recurso_tipo="consultorio",
        recurso_id=ctx["consultorio_id"],
        request=request,
        metadata={"campos_modificados": list(cambios.keys())},
    )

    return res.data[0]


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
