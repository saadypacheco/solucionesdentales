"""
Compliance: estado del consultorio respecto a la documentación requerida por país.

Usa documentos_requeridos_pais (catálogo) + documentos_consultorio (lo subido).
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional

from app.db.client import get_supabase_client


def obtener_checklist(consultorio_id: int, idioma: str = "es") -> dict[str, Any]:
    """
    Devuelve el checklist completo del consultorio:
    - cada doc requerido por su país, con estado actual (no_subido | pendiente | aprobado | rechazado | vencido)
    - resumen agregado: total, aprobados, faltantes
    - estado_global del consultorio
    """
    db = get_supabase_client()

    # Datos del consultorio + país
    cons = (
        db.table("consultorios")
        .select("id, nombre, pais_codigo, estado_compliance")
        .eq("id", consultorio_id)
        .single()
        .execute()
    )
    if not cons.data:
        raise ValueError(f"Consultorio {consultorio_id} no existe")

    pais_codigo = cons.data["pais_codigo"]

    # Catálogo de docs requeridos para ese país
    docs_requeridos = (
        db.table("documentos_requeridos_pais")
        .select("*")
        .eq("pais_codigo", pais_codigo)
        .order("orden")
        .execute()
        .data
        or []
    )

    # Docs ya subidos por este consultorio
    docs_subidos = (
        db.table("documentos_consultorio")
        .select("*")
        .eq("consultorio_id", consultorio_id)
        .execute()
        .data
        or []
    )
    subidos_por_tipo = {d["tipo_documento"]: d for d in docs_subidos}

    # Armar checklist con estado por doc
    items: list[dict[str, Any]] = []
    aprobados = 0
    pendientes = 0
    faltantes = 0
    rechazados = 0
    vencidos = 0

    nombre_field = f"nombre_display_{idioma if idioma in ('es', 'en') else 'es'}"
    if idioma == "pt-BR":
        nombre_field = "nombre_display_pt"
    desc_field = f"descripcion_{idioma if idioma in ('es', 'en') else 'es'}"
    if idioma == "pt-BR":
        desc_field = "descripcion_pt"

    for req in docs_requeridos:
        subido = subidos_por_tipo.get(req["tipo_documento"])
        estado = "no_subido"
        if subido:
            estado = subido["estado"]
            # Verificar vencimiento
            if subido.get("fecha_vencimiento"):
                fv = subido["fecha_vencimiento"]
                if isinstance(fv, str):
                    fv = date.fromisoformat(fv)
                if fv < date.today():
                    estado = "vencido"

        item = {
            "tipo_documento": req["tipo_documento"],
            "nombre_display": req.get(nombre_field) or req.get("nombre_display_es"),
            "descripcion": req.get(desc_field) or req.get("descripcion_es"),
            "obligatorio": req["obligatorio"],
            "link_tramite": req.get("link_tramite"),
            "vencimiento_meses": req.get("vencimiento_meses"),
            "estado": estado,
            "documento_id": subido["id"] if subido else None,
            "archivo_url": subido["archivo_url"] if subido else None,
            "fecha_subida": subido["fecha_subida"] if subido else None,
            "fecha_vencimiento": subido.get("fecha_vencimiento") if subido else None,
            "observaciones": subido.get("observaciones") if subido else None,
        }
        items.append(item)

        if estado == "aprobado":
            aprobados += 1
        elif estado == "pendiente_revision":
            pendientes += 1
        elif estado == "rechazado":
            rechazados += 1
        elif estado == "vencido":
            vencidos += 1
        else:
            faltantes += 1

    total = len(docs_requeridos)
    obligatorios_aprobados = sum(
        1 for it in items if it["obligatorio"] and it["estado"] == "aprobado"
    )
    obligatorios_total = sum(1 for it in items if it["obligatorio"])

    completo = obligatorios_aprobados == obligatorios_total

    return {
        "consultorio_id": consultorio_id,
        "pais": pais_codigo,
        "estado_compliance_actual": cons.data["estado_compliance"],
        "items": items,
        "resumen": {
            "total": total,
            "aprobados": aprobados,
            "pendientes": pendientes,
            "rechazados": rechazados,
            "vencidos": vencidos,
            "faltantes": faltantes,
            "obligatorios_aprobados": obligatorios_aprobados,
            "obligatorios_total": obligatorios_total,
            "completo": completo,
        },
    }


def recalcular_estado_compliance(consultorio_id: int) -> str:
    """
    Recalcula y actualiza consultorios.estado_compliance basado en sus docs.

    Reglas:
    - Si todos los obligatorios están 'aprobado' → 'verificado'
    - Si algún obligatorio está 'pendiente_revision' → 'en_revision'
    - Si algún obligatorio está 'rechazado' → 'docs_pendientes'
    - Si faltan docs obligatorios → 'docs_pendientes'
    - Si está recién creado y sin docs → 'onboarding'
    """
    db = get_supabase_client()
    checklist = obtener_checklist(consultorio_id)
    res = checklist["resumen"]

    if res["completo"]:
        nuevo_estado = "verificado"
        update = {
            "estado_compliance": "verificado",
            "fecha_verificacion": datetime.utcnow().isoformat(),
        }
    elif res["pendientes"] > 0:
        nuevo_estado = "en_revision"
        update = {"estado_compliance": "en_revision"}
    elif res["aprobados"] == 0 and res["pendientes"] == 0 and res["rechazados"] == 0:
        nuevo_estado = "onboarding"
        update = {"estado_compliance": "onboarding"}
    else:
        nuevo_estado = "docs_pendientes"
        update = {"estado_compliance": "docs_pendientes"}

    db.table("consultorios").update(update).eq("id", consultorio_id).execute()
    return nuevo_estado
