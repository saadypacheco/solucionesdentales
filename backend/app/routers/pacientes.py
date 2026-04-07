from fastapi import APIRouter, HTTPException, Depends
from app.db.client import get_supabase_client
from supabase import Client

router = APIRouter(prefix="/pacientes", tags=["pacientes"], redirect_slashes=False)


def get_db() -> Client:
    return get_supabase_client()


@router.get("/buscar")
async def buscar_por_telefono(telefono: str, db: Client = Depends(get_db)):
    res = db.table("pacientes").select("id, nombre, telefono, estado, score").eq("telefono", telefono).execute()
    if not res.data:
        return None
    return res.data[0]
