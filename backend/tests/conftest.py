"""Fixtures globales para los tests.

Setea variables de entorno antes de que se importe el código del backend,
así `encrypt()`/`hash_for_search()` usan claves de prueba deterministas
y no la del .env real (que podría no existir en CI).
"""
import os
import sys
from pathlib import Path

# Hacer que `app.*` sea importable desde tests/
_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

# Claves de prueba (no son las de producción). Se setean ANTES de cualquier
# import de app.* porque el módulo de encryption las lee al importarse.
os.environ.setdefault(
    "ENCRYPTION_KEY",
    # Fernet key de 32 bytes base64 — sólo para tests
    "kKTeFnOaNVJtZBbuwcOt2FAhYOkydYXc4VQkoQp0dS0=",
)
os.environ.setdefault("HASH_SALT", "test-salt-not-for-production")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret")
os.environ.setdefault("ENVIRONMENT", "test")
# Evitar llamadas a Supabase en tests unitarios
os.environ.setdefault("SUPABASE_URL", "http://localhost:54321")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
