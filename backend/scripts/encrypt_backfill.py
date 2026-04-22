"""
Backfill de datos sensibles: encripta y hashea registros que aún tienen
campos en plano. Idempotente: skip cualquier fila que ya tenga _enc.

Uso:
    python -m scripts.encrypt_backfill              # corre todo
    python -m scripts.encrypt_backfill --dry-run    # solo cuenta
    python -m scripts.encrypt_backfill --table pacientes

También se ejecuta automáticamente al startup del backend si la
variable de entorno RUN_ENCRYPTION_BACKFILL=true.
"""
from __future__ import annotations

import logging
import sys
from typing import Callable

from app.core.encryption import (
    encrypt,
    hash_for_search,
    normalize_email,
    normalize_phone,
)
from app.db.client import get_supabase_client

log = logging.getLogger(__name__)
BATCH = 100


def _backfill_pacientes(db, dry_run: bool = False) -> int:
    """Encripta telefono y email de pacientes que aún no tienen _enc."""
    procesados = 0
    while True:
        # Buscar lote de pacientes sin telefono_enc (asumimos que si tiene
        # telefono_enc, el resto también — operación es atómica por fila)
        res = db.table("pacientes") \
            .select("id, telefono, email, telefono_enc") \
            .is_("telefono_enc", "null") \
            .limit(BATCH) \
            .execute()

        filas = res.data or []
        if not filas:
            break

        for p in filas:
            tel_norm = normalize_phone(p.get("telefono"))
            email_norm = normalize_email(p.get("email"))

            update = {}
            if tel_norm:
                update["telefono_enc"] = encrypt(tel_norm)
                update["telefono_hash"] = hash_for_search(tel_norm)
            if email_norm:
                update["email_enc"] = encrypt(email_norm)
                update["email_hash"] = hash_for_search(email_norm)

            if not update:
                continue

            if dry_run:
                log.info("[dry-run] paciente %s → %s campos", p["id"], len(update))
            else:
                db.table("pacientes").update(update).eq("id", p["id"]).execute()
            procesados += 1

        if len(filas) < BATCH:
            break

    return procesados


def _backfill_paciente_otps(db, dry_run: bool = False) -> int:
    procesados = 0
    while True:
        res = db.table("paciente_otps") \
            .select("id, telefono, codigo, codigo_enc") \
            .is_("codigo_enc", "null") \
            .limit(BATCH) \
            .execute()

        filas = res.data or []
        if not filas:
            break

        for o in filas:
            tel_norm = normalize_phone(o.get("telefono"))
            update = {}
            if tel_norm:
                update["telefono_hash"] = hash_for_search(tel_norm)
            if o.get("codigo"):
                update["codigo_enc"] = encrypt(o["codigo"])

            if not update:
                continue

            if dry_run:
                log.info("[dry-run] otp %s → %s campos", o["id"], len(update))
            else:
                db.table("paciente_otps").update(update).eq("id", o["id"]).execute()
            procesados += 1

        if len(filas) < BATCH:
            break

    return procesados


def _backfill_turnos(db, dry_run: bool = False) -> int:
    procesados = 0
    while True:
        res = db.table("turnos") \
            .select("id, notas, notas_enc") \
            .is_("notas_enc", "null") \
            .not_.is_("notas", "null") \
            .limit(BATCH) \
            .execute()

        filas = res.data or []
        if not filas:
            break

        for t in filas:
            if not t.get("notas"):
                continue
            update = {"notas_enc": encrypt(t["notas"])}
            if dry_run:
                log.info("[dry-run] turno %s", t["id"])
            else:
                db.table("turnos").update(update).eq("id", t["id"]).execute()
            procesados += 1

        if len(filas) < BATCH:
            break

    return procesados


def _backfill_usuarios(db, dry_run: bool = False) -> int:
    procesados = 0
    while True:
        res = db.table("usuarios") \
            .select("id, email, email_enc") \
            .is_("email_enc", "null") \
            .limit(BATCH) \
            .execute()

        filas = res.data or []
        if not filas:
            break

        for u in filas:
            email_norm = normalize_email(u.get("email"))
            if not email_norm:
                continue
            update = {"email_enc": encrypt(email_norm)}
            if dry_run:
                log.info("[dry-run] usuario %s", u["id"])
            else:
                db.table("usuarios").update(update).eq("id", u["id"]).execute()
            procesados += 1

        if len(filas) < BATCH:
            break

    return procesados


TABLAS: dict[str, Callable] = {
    "pacientes": _backfill_pacientes,
    "paciente_otps": _backfill_paciente_otps,
    "turnos": _backfill_turnos,
    "usuarios": _backfill_usuarios,
}


def run(dry_run: bool = False, tabla: str | None = None) -> dict[str, int]:
    """Corre el backfill. Devuelve dict con count por tabla."""
    db = get_supabase_client()
    resumen = {}
    objetivo = {tabla: TABLAS[tabla]} if tabla else TABLAS

    for nombre, fn in objetivo.items():
        try:
            count = fn(db, dry_run=dry_run)
            resumen[nombre] = count
            log.info("backfill %s: %s filas %s", nombre, count, "(dry-run)" if dry_run else "actualizadas")
        except Exception as e:
            log.exception("backfill %s falló: %s", nombre, e)
            resumen[nombre] = -1

    return resumen


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    args = sys.argv[1:]
    dry = "--dry-run" in args
    tabla = None
    if "--table" in args:
        idx = args.index("--table")
        tabla = args[idx + 1] if idx + 1 < len(args) else None

    resumen = run(dry_run=dry, tabla=tabla)
    print("\nResumen:")
    for t, n in resumen.items():
        print(f"  {t}: {n}")
