import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

_client: Client | None = None


def get_supabase_client() -> Client:
    global _client
    if _client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos")
        _client = create_client(url, key)
        # Asegurar que el cliente usa service_role y bypasea RLS
        # en supabase-py v2 hay que setear el header explícitamente
        _client.postgrest.auth(key)
    return _client
