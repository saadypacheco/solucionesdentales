from fastapi import APIRouter, Depends
from app.db.client import get_supabase_client
from app.core.encryption import hash_for_search, normalize_phone
from app.core.paciente_helpers import hidratar_paciente
from app.core.tenant import resolve_consultorio_publico
from supabase import Client

router = APIRouter(prefix="/pacientes", tags=["pacientes"], redirect_slashes=False)


def get_db() -> Client:
    return get_supabase_client()


@router.get("/buscar")
async def buscar_por_telefono(
    telefono: str,
    consultorio_id: int = Depends(resolve_consultorio_publico),
    db: Client = Depends(get_db),
):
    tel_norm = normalize_phone(telefono)
    tel_hash = hash_for_search(tel_norm)

    # Buscar por hash dentro del mismo consultorio
    res = db.table("pacientes").select(
        "id, nombre, telefono, telefono_enc, telefono_hash, email, email_enc, email_hash, estado, score"
    ).eq("consultorio_id", consultorio_id).eq("telefono_hash", tel_hash).execute()

    if not res.data:
        res = db.table("pacientes").select(
            "id, nombre, telefono, telefono_enc, telefono_hash, email, email_enc, email_hash, estado, score"
        ).eq("consultorio_id", consultorio_id).eq("telefono", tel_norm).execute()

    if not res.data:
        return None
    return hidratar_paciente(res.data[0])
