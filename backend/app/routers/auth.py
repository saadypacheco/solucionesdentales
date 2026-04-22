from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
import random
import os
import jwt as pyjwt
from datetime import datetime, timedelta, timezone
from app.db.client import get_supabase_client
from app.core.encryption import (
    decrypt,
    encrypt,
    hash_for_search,
    normalize_email,
    normalize_phone,
)
from app.core.paciente_helpers import hidratar_paciente, hidratar_lista_pacientes
from supabase import Client

router = APIRouter(prefix="/auth", tags=["auth"], redirect_slashes=False)
security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-in-prod")
JWT_ALGORITHM = "HS256"
OTP_EXPIRY_MINUTES = 10


def get_db() -> Client:
    return get_supabase_client()


# ── Staff auth ────────────────────────────────────────────────────────────────

ROLES_STAFF = ("admin", "odontologo", "recepcionista", "superadmin")
ROLES_SUPERADMIN = ("superadmin",)


def _decode_jwt_sub(token: str) -> str:
    """Extrae el sub del JWT sin verificar firma. Para Supabase Auth tokens."""
    try:
        payload = pyjwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token inválido")
        return user_id
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")


def require_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Client = Depends(get_db),
):
    """Requiere staff de cualquier rol (admin, odontologo, recepcionista, superadmin)."""
    user_id = _decode_jwt_sub(credentials.credentials)
    profile = db.table("usuarios").select("rol, activo").eq("id", user_id).single().execute()
    if not profile.data or profile.data.get("rol") not in ROLES_STAFF:
        raise HTTPException(status_code=403, detail="Acceso restringido a staff")
    if not profile.data.get("activo", True):
        raise HTTPException(status_code=403, detail="Usuario desactivado")


def require_staff_context(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Client = Depends(get_db),
) -> dict:
    """
    Como require_admin pero devuelve el contexto del staff:
    {usuario_id, rol, consultorio_id, es_superadmin}.
    Útil para routers que necesitan filtrar por consultorio_id.
    """
    user_id = _decode_jwt_sub(credentials.credentials)
    profile = (
        db.table("usuarios")
        .select("id, rol, activo, consultorio_id")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not profile.data or profile.data.get("rol") not in ROLES_STAFF:
        raise HTTPException(status_code=403, detail="Acceso restringido a staff")
    if not profile.data.get("activo", True):
        raise HTTPException(status_code=403, detail="Usuario desactivado")

    return {
        "usuario_id": user_id,
        "rol": profile.data["rol"],
        "consultorio_id": profile.data.get("consultorio_id") or 1,
        "es_superadmin": profile.data["rol"] == "superadmin",
    }


def require_superadmin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Client = Depends(get_db),
):
    """Solo superadmin del SaaS (rol que opera sobre todos los consultorios)."""
    user_id = _decode_jwt_sub(credentials.credentials)
    profile = db.table("usuarios").select("rol, activo").eq("id", user_id).single().execute()
    if not profile.data or profile.data.get("rol") not in ROLES_SUPERADMIN:
        raise HTTPException(status_code=403, detail="Acceso restringido a superadmin")
    if not profile.data.get("activo", True):
        raise HTTPException(status_code=403, detail="Usuario desactivado")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    nombre: str
    rol: str = "recepcionista"
    especialidades: Optional[list[str]] = None
    consultorio_id: Optional[int] = None  # Si None, hereda del admin que crea


class UpdateUsuarioRequest(BaseModel):
    nombre: Optional[str] = None
    rol: Optional[str] = None
    especialidades: Optional[list[str]] = None
    email: Optional[EmailStr] = None


class ResetPasswordRequest(BaseModel):
    nueva_password: str


@router.post("/login")
async def login(req: LoginRequest, db: Client = Depends(get_db)):
    try:
        res = db.auth.sign_in_with_password({"email": req.email, "password": req.password})
        profile = db.table("usuarios").select("*").eq("id", res.user.id).single().execute()

        # Verificar que el usuario está activo
        if not profile.data or not profile.data.get("activo", True):
            raise HTTPException(status_code=403, detail="Usuario desactivado")

        # Traer info del consultorio + país (nuevo en M13)
        consultorio_info = None
        consultorio_id = profile.data.get("consultorio_id") or 1
        try:
            cons = (
                db.table("consultorios")
                .select("id, nombre, pais_codigo, idioma_override, timezone_override, paises(codigo, nombre, idioma_default, moneda, timezone_default)")
                .eq("id", consultorio_id)
                .single()
                .execute()
            )
            if cons.data:
                consultorio_info = cons.data
        except Exception:
            # Si la tabla aún no existe (migraciones no aplicadas), no rompemos el login
            pass

        return {
            "access_token": res.session.access_token,
            "user": profile.data,
            "consultorio": consultorio_info,
        }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")


@router.post("/register")
async def register(
    req: RegisterRequest,
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    """
    Crea un usuario staff. Hereda consultorio_id del admin que lo crea
    (excepto si es superadmin y especifica otro).
    """
    # Solo superadmin puede crear superadmins o forzar consultorio distinto
    if req.rol == "superadmin" and not ctx["es_superadmin"]:
        raise HTTPException(status_code=403, detail="Solo superadmin puede crear superadmins")

    consultorio_id = req.consultorio_id if (ctx["es_superadmin"] and req.consultorio_id) else ctx["consultorio_id"]

    try:
        auth_res = db.auth.admin.create_user({
            "email": req.email,
            "password": req.password,
            "email_confirm": True,
        })
        email_norm = normalize_email(req.email)
        data = {
            "id": auth_res.user.id,
            "email": email_norm,
            "email_enc": encrypt(email_norm),
            "nombre": req.nombre,
            "rol": req.rol,
            "consultorio_id": consultorio_id,
        }
        if req.especialidades:
            data["especialidades"] = req.especialidades
        db.table("usuarios").insert(data).execute()
        return {"ok": True, "consultorio_id": consultorio_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/me")
async def me(credentials: HTTPAuthorizationCredentials = Depends(security),
             db: Client = Depends(get_db)):
    try:
        user_resp = db.auth.get_user(credentials.credentials)
        profile = db.table("usuarios").select("*").eq("id", user_resp.user.id).single().execute()
        return profile.data
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")


# ── OTP para pacientes ────────────────────────────────────────────────────────

class OTPEnviarRequest(BaseModel):
    telefono: str


class OTPVerificarRequest(BaseModel):
    telefono: str
    codigo: str


def _generar_token_paciente(paciente_id: int, telefono: str) -> str:
    payload = {
        "sub": str(paciente_id),
        "tel": telefono,
        "tipo": "paciente",
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _verificar_token_paciente(token: str) -> dict:
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("tipo") != "paciente":
            raise ValueError("Token no es de paciente")
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Token de paciente inválido o expirado")


def require_paciente(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    return _verificar_token_paciente(credentials.credentials)


def _buscar_paciente_por_telefono(db: Client, tel_norm: str):
    """Busca paciente por hash (encriptado) con fallback a plano."""
    tel_hash = hash_for_search(tel_norm)
    res = db.table("pacientes").select(
        "id, nombre, telefono, telefono_enc, telefono_hash, email, email_enc, email_hash, estado, score"
    ).eq("telefono_hash", tel_hash).execute()
    if res.data:
        return res.data[0]
    res = db.table("pacientes").select(
        "id, nombre, telefono, telefono_enc, telefono_hash, email, email_enc, email_hash, estado, score"
    ).eq("telefono", tel_norm).execute()
    return res.data[0] if res.data else None


@router.post("/otp/enviar")
async def otp_enviar(req: OTPEnviarRequest, db: Client = Depends(get_db)):
    """
    Genera un código OTP de 4 dígitos para el teléfono dado.
    Busca paciente por hash determinístico (sin desencriptar toda la tabla).
    """
    tel_norm = normalize_phone(req.telefono)
    if not tel_norm:
        raise HTTPException(status_code=400, detail="Teléfono inválido")

    paciente = _buscar_paciente_por_telefono(db, tel_norm)
    if not paciente:
        raise HTTPException(
            status_code=404,
            detail="No encontramos ningún turno registrado con ese teléfono."
        )

    tel_hash = hash_for_search(tel_norm)

    # Invalidar OTPs anteriores del mismo teléfono (busco por hash y por plano)
    db.table("paciente_otps").update({"usado": True}) \
        .eq("telefono_hash", tel_hash).eq("usado", False).execute()
    db.table("paciente_otps").update({"usado": True}) \
        .eq("telefono", tel_norm).eq("usado", False).execute()

    # Generar código de 4 dígitos
    codigo = str(random.randint(1000, 9999))
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)).isoformat()

    db.table("paciente_otps").insert({
        "telefono_hash": tel_hash,
        "codigo_enc": encrypt(codigo),
        "expires_at": expires_at,
    }).execute()

    wa_numero = os.getenv("WA_NUMBER", "5491100000000")
    mensaje_wa = f"Tu código de verificación para Soluciones Dentales es: *{codigo}*. Válido por {OTP_EXPIRY_MINUTES} minutos."
    wa_link = f"https://wa.me/{wa_numero}?text={mensaje_wa}"

    return {
        "ok": True,
        "nombre": paciente.get("nombre"),
        "wa_link": wa_link,
        # En desarrollo mostramos el código; en producción se enviaría por WA
        "codigo_dev": codigo if os.getenv("ENVIRONMENT", "development") == "development" else None,
    }


@router.post("/otp/verificar")
async def otp_verificar(req: OTPVerificarRequest, db: Client = Depends(get_db)):
    """Verifica el código OTP y devuelve un JWT de paciente."""
    tel_norm = normalize_phone(req.telefono)
    if not tel_norm:
        raise HTTPException(status_code=400, detail="Teléfono inválido")

    tel_hash = hash_for_search(tel_norm)
    ahora = datetime.now(timezone.utc).isoformat()

    # Buscar OTPs válidos por hash; comparar código desencriptando uno por uno.
    # Nota: esto desencripta solo los OTPs activos del teléfono (≤ 10 min, ≤ unos pocos),
    # no toda la tabla. Performance OK incluso con miles de pacientes.
    otps = db.table("paciente_otps").select("*") \
        .or_(f"telefono_hash.eq.{tel_hash},telefono.eq.{tel_norm}") \
        .eq("usado", False) \
        .gte("expires_at", ahora) \
        .order("created_at", desc=True) \
        .limit(5) \
        .execute()

    otp_match = None
    for o in (otps.data or []):
        # Código puede estar encriptado o en plano (transición)
        codigo_real = decrypt(o.get("codigo_enc")) if o.get("codigo_enc") else o.get("codigo")
        if codigo_real == req.codigo:
            otp_match = o
            break

    if not otp_match:
        raise HTTPException(status_code=400, detail="Código incorrecto o expirado")

    # Marcar como usado
    db.table("paciente_otps").update({"usado": True}).eq("id", otp_match["id"]).execute()

    # Obtener paciente (búsqueda por hash con fallback)
    paciente = _buscar_paciente_por_telefono(db, tel_norm)
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    paciente_hidratado = hidratar_paciente(paciente)
    token = _generar_token_paciente(paciente["id"], tel_norm)

    return {
        "access_token": token,
        "paciente": paciente_hidratado,
    }


# ── Mis turnos ────────────────────────────────────────────────────────────────

@router.get("/mis-turnos")
async def mis_turnos(
    payload: dict = Depends(require_paciente),
    db: Client = Depends(get_db),
):
    """Turnos del paciente autenticado (token OTP)."""
    from app.core.paciente_helpers import hidratar_lista_turnos
    paciente_id = int(payload["sub"])

    turnos = db.table("turnos").select("*") \
        .eq("paciente_id", paciente_id) \
        .not_.in_("estado", ["cancelado"]) \
        .order("fecha_hora", desc=True) \
        .execute()

    return hidratar_lista_turnos(turnos.data or [])


@router.patch("/mis-turnos/{turno_id}/cancelar")
async def cancelar_turno(
    turno_id: int,
    payload: dict = Depends(require_paciente),
    db: Client = Depends(get_db),
):
    """El paciente cancela uno de sus propios turnos."""
    paciente_id = int(payload["sub"])

    # Verificar que el turno pertenece al paciente
    turno = db.table("turnos").select("id, estado, fecha_hora") \
        .eq("id", turno_id).eq("paciente_id", paciente_id).execute()

    if not turno.data:
        raise HTTPException(status_code=404, detail="Turno no encontrado")

    if turno.data[0]["estado"] in ("realizado", "cancelado"):
        raise HTTPException(status_code=400, detail="No se puede cancelar este turno")

    res = db.table("turnos").update({"estado": "cancelado"}) \
        .eq("id", turno_id).execute()

    return res.data[0]


# ── CRUD de usuarios staff ────────────────────────────────────────────────────

@router.get("/usuarios")
async def list_usuarios(
    _: None = Depends(require_admin),
    db: Client = Depends(get_db),
):
    """Lista todos los usuarios staff activos e inactivos."""
    usuarios = db.table("usuarios").select("*").order("nombre").execute()
    return usuarios.data or []


@router.patch("/usuarios/{usuario_id}")
async def update_usuario(
    usuario_id: str,
    req: UpdateUsuarioRequest,
    _: None = Depends(require_admin),
    db: Client = Depends(get_db),
):
    """Edita un usuario staff (nombre, rol, especialidades, email)."""
    update_data = {}
    if req.nombre:
        update_data["nombre"] = req.nombre
    if req.rol:
        update_data["rol"] = req.rol
    if req.especialidades is not None:
        update_data["especialidades"] = req.especialidades
    if req.email:
        email_norm = normalize_email(req.email)
        update_data["email"] = email_norm        # plano para Supabase Auth
        update_data["email_enc"] = encrypt(email_norm)
        # También actualizar el email en auth si cambió
        try:
            db.auth.admin.update_user_by_id(usuario_id, {"email": email_norm})
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error updating auth email: {str(e)}")

    update_data["updated_at"] = datetime.now(tz=timezone.utc).isoformat()
    res = db.table("usuarios").update(update_data).eq("id", usuario_id).execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return res.data[0]


@router.patch("/usuarios/{usuario_id}/password")
async def reset_password(
    usuario_id: str,
    req: ResetPasswordRequest,
    _: None = Depends(require_admin),
    db: Client = Depends(get_db),
):
    """Resetea la contraseña de un usuario staff."""
    try:
        db.auth.admin.update_user_by_id(usuario_id, {"password": req.nueva_password})
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error resetting password: {str(e)}")


@router.patch("/usuarios/{usuario_id}/toggle")
async def toggle_usuario(
    usuario_id: str,
    _: None = Depends(require_admin),
    db: Client = Depends(get_db),
):
    """Activa o desactiva un usuario staff."""
    usuario = db.table("usuarios").select("activo").eq("id", usuario_id).single().execute()

    if not usuario.data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    nuevo_estado = not usuario.data.get("activo", True)
    res = db.table("usuarios").update({
        "activo": nuevo_estado,
        "updated_at": datetime.now(tz=timezone.utc).isoformat(),
    }).eq("id", usuario_id).execute()

    return {"activo": res.data[0]["activo"]}
