import os
from supabase import create_client, Client
from postgrest import SyncPostgrestClient
from dotenv import load_dotenv

load_dotenv()

_client: Client | None = None
_pg: SyncPostgrestClient | None = None


def get_supabase_client() -> Client:
    global _client, _pg
    if _client is None:
        url = os.getenv("SUPABASE_URL")
        # Intentar usar service_role, fallback a anon si no está disponible
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
        anon_key = os.getenv("SUPABASE_ANON_KEY")

        if not url or not key:
            raise RuntimeError("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_ANON_KEY) son requeridos")

        _client = create_client(url, key)

        # supabase-py 2.7.x: crear SyncPostgrestClient propio con headers correctos
        # Si usamos service_role, bypasea RLS. Si usamos anon, RLS policies lo permiten.
        rest_url = f"{url}/rest/v1"
        _pg = SyncPostgrestClient(
            rest_url,
            headers={
                "apikey": anon_key,  # apikey siempre es anon (PostgREST lo requiere)
                "Authorization": f"Bearer {key}",  # Authorization puede ser service_role o anon
            },
        )

        # Reemplazar el postgrest internal del cliente supabase
        _client._postgrest = _pg

    return _client
