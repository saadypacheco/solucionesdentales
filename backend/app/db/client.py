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
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos")

        _client = create_client(url, key)

        # supabase-py 2.7.x: db.postgrest es una propiedad que crea una nueva
        # instancia en cada acceso, sin Authorization header.
        # Creamos un SyncPostgrestClient propio con service_role y lo inyectamos.
        rest_url = f"{url}/rest/v1"
        _pg = SyncPostgrestClient(
            rest_url,
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
            },
        )

        # Reemplazar el atributo interno para que db.table() use nuestro cliente
        # (funciona porque Python busca primero en __dict__ de la instancia)
        try:
            _client.__dict__["postgrest"] = _pg
        except Exception:
            # fallback: parchamos el atributo privado si existe
            for attr in ("_postgrest", "_postgrest_client"):
                if hasattr(_client, attr):
                    setattr(_client, attr, _pg)
                    break

    return _client
