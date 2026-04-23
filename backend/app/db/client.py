import logging
import os
from typing import Callable, TypeVar

import httpx
from dotenv import load_dotenv
from postgrest import SyncPostgrestClient
from supabase import Client, create_client

load_dotenv()

log = logging.getLogger(__name__)

_client: Client | None = None
_pg: SyncPostgrestClient | None = None


def _create_client() -> Client:
    """Crea un cliente Supabase nuevo desde 0."""
    url = os.getenv("SUPABASE_URL")
    # Intentar usar service_role, fallback a anon si no está disponible
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    anon_key = os.getenv("SUPABASE_ANON_KEY")

    if not url or not key:
        raise RuntimeError("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_ANON_KEY) son requeridos")

    client = create_client(url, key)

    # supabase-py 2.7.x: crear SyncPostgrestClient propio con headers correctos
    rest_url = f"{url}/rest/v1"
    pg = SyncPostgrestClient(
        rest_url,
        headers={
            "apikey": anon_key,
            "Authorization": f"Bearer {key}",
        },
    )
    client._postgrest = pg

    return client


def get_supabase_client() -> Client:
    """Devuelve el cliente Supabase (singleton). Crea uno nuevo si no existe."""
    global _client
    if _client is None:
        _client = _create_client()
    return _client


def reset_supabase_client() -> None:
    """
    Limpia el singleton para forzar reconexión en la próxima llamada.
    Usar cuando se detecta httpx.RemoteProtocolError u otro error de
    conexión que indica que el cliente cacheado está stale.
    """
    global _client, _pg
    _client = None
    _pg = None
    log.info("Supabase client reset — próxima llamada creará uno nuevo")


T = TypeVar("T")

# Errores que indican que la conexión está rota y vale la pena reintentar
_RECONNECT_ERRORS = (
    httpx.RemoteProtocolError,  # Server cerró la conexión (idle timeout)
    httpx.ConnectError,         # No se pudo conectar
    httpx.ReadError,            # Lectura interrumpida
    httpx.WriteError,           # Escritura interrumpida
)


def safe_query(fn: Callable[[], T]) -> T:
    """
    Ejecuta una query con auto-reconnect ante errores de conexión.

    Uso:
        result = safe_query(lambda: db.table("usuarios").select("*").execute())

    Si la primera llamada falla con error de conexión, resetea el cliente
    y reintenta UNA vez. Si el segundo intento también falla, propaga la
    excepción.
    """
    try:
        return fn()
    except _RECONNECT_ERRORS as e:
        log.warning("Conexión Supabase perdida (%s), reconectando...", type(e).__name__)
        reset_supabase_client()
        return fn()
