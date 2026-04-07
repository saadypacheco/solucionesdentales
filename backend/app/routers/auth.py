from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from app.db.client import get_supabase_client
from supabase import Client

router = APIRouter(prefix="/auth", tags=["auth"], redirect_slashes=False)
security = HTTPBearer()


def get_db() -> Client:
    return get_supabase_client()


def require_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Client = Depends(get_db),
):
    token = credentials.credentials
    try:
        user_resp = db.auth.get_user(token)
        user_id = user_resp.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

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


@router.post("/login")
async def login(req: LoginRequest, db: Client = Depends(get_db)):
    try:
        res = db.auth.sign_in_with_password({"email": req.email, "password": req.password})
        profile = db.table("usuarios").select("*").eq("id", res.user.id).single().execute()
        return {
            "access_token": res.session.access_token,
            "user": profile.data,
        }
    except Exception as e:
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
        db.table("usuarios").insert({
            "id": auth_res.user.id,
            "email": req.email,
            "nombre": req.nombre,
            "rol": req.rol,
        }).execute()
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
