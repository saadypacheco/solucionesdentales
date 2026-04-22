from fastapi import APIRouter, Depends
from app.db.client import get_supabase_client
from app.routers.auth import require_staff_context
from supabase import Client

router = APIRouter(prefix="/alarmas", tags=["alarmas"], redirect_slashes=False)


def get_db() -> Client:
    return get_supabase_client()


@router.get("")
async def listar_alarmas(
    ctx: dict = Depends(require_staff_context),
    db: Client = Depends(get_db),
):
    query = (
        db.table("alarmas")
        .select("*, pacientes(nombre, telefono)")
        .eq("resuelta", False)
    )
    if not ctx["es_superadmin"]:
        query = query.eq("consultorio_id", ctx["consultorio_id"])
    return query.order("created_at", desc=True).execute().data or []
