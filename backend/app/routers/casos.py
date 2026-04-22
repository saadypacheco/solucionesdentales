from fastapi import APIRouter, Depends
from app.db.client import get_supabase_client
from app.core.tenant import resolve_consultorio_publico
from supabase import Client

router = APIRouter(prefix="/casos", tags=["casos"], redirect_slashes=False)


def get_db() -> Client:
    return get_supabase_client()


@router.get("")
async def listar_casos(
    tipo: str | None = None,
    consultorio_id: int = Depends(resolve_consultorio_publico),
    db: Client = Depends(get_db),
):
    """Casos aprobados — públicos. Filtra por consultorio (header X-Consultorio-ID)."""
    query = (
        db.table("casos_galeria")
        .select("*")
        .eq("aprobado", True)
        .eq("consultorio_id", consultorio_id)
        .order("created_at", desc=True)
    )
    if tipo:
        query = query.eq("tipo_tratamiento", tipo)
    return query.execute().data or []
