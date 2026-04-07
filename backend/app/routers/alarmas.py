from fastapi import APIRouter, Depends
from app.db.client import get_supabase_client
from app.routers.auth import require_admin
from supabase import Client

router = APIRouter(prefix="/alarmas", tags=["alarmas"], redirect_slashes=False)


def get_db() -> Client:
    return get_supabase_client()


@router.get("")
async def listar_alarmas(db: Client = Depends(get_db), _: None = Depends(require_admin)):
    return db.table("alarmas").select("*, pacientes(nombre, telefono)") \
        .eq("resuelta", False).order("created_at", desc=True).execute().data or []
