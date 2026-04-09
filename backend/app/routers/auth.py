from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
import random
import os
import jwt as pyjwt
from datetime import datetime, timedelta, timezone
from app.db.client import get_supabase_client
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

def require_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Client = Depends(get_db),
):
    token = credentials.credentials
    try:
        # Decode the JWT token without verification to get the user ID
        payload = pyjwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token inválido")
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

    # Verify the user exists and has admin role
    profile = db.table("usuarios").select("rol").eq("id", user_id).single().execute()
    if not profile.data or profile.data.get("rol") not in ("admin", "odontologo", "recepcionista"):
        raise HTTPException(status_code=403, detail="Acceso restringido a staff")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    nombre: str
    rol: str = "recepcionista"
    especialidades: Optional[list[str]] = None


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

        return {
            "access_token": res.session.access_token,
            "user": profile.data,
        }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")


@router.post("/register")
async def register(req: RegisterRequest, db: Client = Depends(get_db),
                   _: None = Depends(require_admin)):
    try:
        auth_res = db.auth.admin.create_user({
            "email": req.email,
            "password": req.password,
            "email_confirm": True,
        })
        data = {
            "id": auth_res.user.id,
            "email": req.email,
            "nombre": req.nombre,
            "rol": req.rol,
        }
        if req.especialidades:
            data["especialidades"] = req.especialidades
        db.table("usuarios").insert(data).execute()
        return {"ok": True}
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


@router.post("/otp/enviar")
async def otp_enviar(req: OTPEnviarRequest, db: Client = Depends(get_db)):
    """
    Genera un código OTP de 4 dígitos para el teléfono dado.
    Devuelve un link de WhatsApp con el código pre-armado para que el
    admin (o el propio sistema) lo envíe.
    Como no tenemos API de WhatsApp, el código se muestra en pantalla
    y también se puede enviar por WA manualmente.
    """
    telefono = req.telefono.strip()

    # Verificar que el paciente existe
    res = db.table("pacientes").select("id, nombre").eq("telefono", telefono).execute()
    if not res.data:
        raise HTTPException(
            status_code=404,
            detail="No encontramos ningún turno registrado con ese teléfono."
        )

    paciente = res.data[0]

    # Invalidar OTPs anteriores del mismo teléfono
    db.table("paciente_otps").update({"usado": True}) \
        .eq("telefono", telefono).eq("usado", False).execute()

    # Generar código de 4 dígitos
    codigo = str(random.randint(1000, 9999))
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)).isoformat()

    db.table("paciente_otps").insert({
        "telefono": telefono,
        "codigo": codigo,
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
    telefono = req.telefono.strip()
    ahora = datetime.now(timezone.utc).isoformat()

    otp = db.table("paciente_otps").select("*") \
        .eq("telefono", telefono) \
        .eq("codigo", req.codigo) \
        .eq("usado", False) \
        .gte("expires_at", ahora) \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()

    if not otp.data:
        raise HTTPException(status_code=400, detail="Código incorrecto o expirado")

    # Marcar como usado
    db.table("paciente_otps").update({"usado": True}).eq("id", otp.data[0]["id"]).execute()

    # Obtener paciente
    paciente = db.table("pacientes").select("id, nombre, telefono, estado, score") \
        .eq("telefono", telefono).single().execute()

    if not paciente.data:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    token = _generar_token_paciente(paciente.data["id"], telefono)

    return {
        "access_token": token,
        "paciente": paciente.data,
    }


# ── Mis turnos ────────────────────────────────────────────────────────────────

@router.get("/mis-turnos")
async def mis_turnos(
    payload: dict = Depends(require_paciente),
    db: Client = Depends(get_db),
):
    """Turnos del paciente autenticado (token OTP)."""
    paciente_id = int(payload["sub"])

    turnos = db.table("turnos").select("*") \
        .eq("paciente_id", paciente_id) \
        .not_.in_("estado", ["cancelado"]) \
        .order("fecha_hora", desc=True) \
        .execute()

    return turnos.data or []


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
        update_data["email"] = req.email
        # También actualizar el email en auth si cambió
        try:
            db.auth.admin.update_user_by_id(usuario_id, {"email": req.email})
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
