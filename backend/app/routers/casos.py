from fastapi import APIRouter, HTTPException, Depends
from app.db.client import get_supabase_client
from supabase import Client

router = APIRouter(prefix="/casos", tags=["casos"])


def get_db() -> Client:
    return get_supabase_client()


@router.get("/")
async def listar_casos(tipo: str | None = None, db: Client = Depends(get_db)):
    """Casos aprobados — públicos."""
    query = db.table("casos_galeria").select("*").eq("aprobado", True).order("created_at", desc=True)
    if tipo:
        query = query.eq("tipo_tratamiento", tipo)
    return query.execute().data or []
