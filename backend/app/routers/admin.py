from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import uuid
from app.db.client import get_supabase_client
from app.routers.auth import require_admin
from app.services.seguimiento import ejecutar_seguimiento
from supabase import Client

router = APIRouter(prefix="/admin", tags=["admin"], redirect_slashes=False)


def get_db() -> Client:
    return get_supabase_client()


@router.get("/pacientes")
async def listar_pacientes(db: Client = Depends(get_db), _: None = Depends(require_admin)):
    return db.table("pacientes").select("*").order("created_at", desc=True).execute().data or []


@router.patch("/pacientes/{paciente_id}/estado")
async def actualizar_estado_paciente(
    paciente_id: int,
    estado: str,
    db: Client = Depends(get_db),
    _: None = Depends(require_admin),
):
    estados_validos = ("nuevo", "contactado", "interesado", "turno_agendado", "paciente_activo", "inactivo", "perdido")
    if estado not in estados_validos:
        raise HTTPException(status_code=400, detail=f"Estado inválido: {estado}")
    res = db.table("pacientes").update({"estado": estado}).eq("id", paciente_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return res.data[0]


@router.get("/turnos")
async def listar_turnos(
    fecha: Optional[str] = None,
    db: Client = Depends(get_db),
    _: None = Depends(require_admin),
):
    """Lista turnos. Si se pasa fecha (YYYY-MM-DD), filtra ese día."""
    query = db.table("turnos").select("*, pacientes(nombre, telefono)")
    if fecha:
        query = query.gte("fecha_hora", f"{fecha}T00:00:00") \
                     .lte("fecha_hora", f"{fecha}T23:59:59")
    return query.order("fecha_hora").execute().data or []


@router.patch("/turnos/{turno_id}")
async def actualizar_turno(turno_id: int, estado: str,
                            db: Client = Depends(get_db), _: None = Depends(require_admin)):
    estados_validos = ("solicitado", "confirmado", "realizado", "cancelado", "ausente")
    if estado not in estados_validos:
        raise HTTPException(status_code=400, detail=f"Estado inválido. Opciones: {estados_validos}")
    res = db.table("turnos").update({"estado": estado}).eq("id", turno_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    return res.data[0]


@router.get("/casos")
async def listar_casos_admin(db: Client = Depends(get_db), _: None = Depends(require_admin)):
    return db.table("casos_galeria").select("*").order("created_at", desc=True).execute().data or []


async def _upload_imagen(db: Client, archivo: UploadFile, prefijo: str) -> str:
    """Sube una imagen a Supabase Storage y devuelve la URL pública."""
    contenido = await archivo.read()
    ext = archivo.filename.rsplit(".", 1)[-1] if archivo.filename and "." in archivo.filename else "jpg"
    nombre = f"{prefijo}/{uuid.uuid4()}.{ext}"
    db.storage.from_("galeria").upload(
        nombre,
        contenido,
        {"content-type": archivo.content_type or "image/jpeg"},
    )
    url = db.storage.from_("galeria").get_public_url(nombre)
    return url


@router.post("/casos")
async def crear_caso(
    tipo_tratamiento: str = Form(...),
    descripcion: str = Form(...),
    duracion_tratamiento: str = Form(""),
    imagen_antes: UploadFile = File(...),
    imagen_despues: UploadFile = File(...),
    db: Client = Depends(get_db),
    _: None = Depends(require_admin),
):
    """Crea un caso en galería (pendiente de aprobación)."""
    url_antes = await _upload_imagen(db, imagen_antes, "antes")
    url_despues = await _upload_imagen(db, imagen_despues, "despues")
    res = db.table("casos_galeria").insert({
        "tipo_tratamiento": tipo_tratamiento,
        "descripcion": descripcion,
        "duracion_tratamiento": duracion_tratamiento,
        "imagen_antes_url": url_antes,
        "imagen_despues_url": url_despues,
        "aprobado": False,
    }).execute()
    return res.data[0]


@router.patch("/casos/{caso_id}")
async def aprobar_caso(caso_id: int, aprobado: bool,
                       db: Client = Depends(get_db), _: None = Depends(require_admin)):
    res = db.table("casos_galeria").update({"aprobado": aprobado}).eq("id", caso_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    return res.data[0]


@router.delete("/casos/{caso_id}")
async def eliminar_caso(caso_id: int,
                        db: Client = Depends(get_db), _: None = Depends(require_admin)):
    """Soft delete — marca como no aprobado."""
    res = db.table("casos_galeria").update({"aprobado": False}).eq("id", caso_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    return {"ok": True}


@router.get("/config-ia")
async def listar_config_ia(db: Client = Depends(get_db), _: None = Depends(require_admin)):
    return db.table("config_ia").select("clave, valor, updated_at").order("clave").execute().data or []


@router.patch("/config-ia/{clave}")
async def actualizar_config_ia(clave: str, valor: str,
                               db: Client = Depends(get_db), _: None = Depends(require_admin)):
    claves_permitidas = ("system_prompt", "rangos_precios", "mensaje_recordatorio",
                        "wa_numero", "horario_atencion")
    if clave not in claves_permitidas:
        raise HTTPException(status_code=400, detail=f"Clave no permitida: {clave}")
    from datetime import datetime, timezone
    res = db.table("config_ia").upsert({
        "clave": clave,
        "valor": valor,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }, on_conflict="clave").execute()
    return res.data[0] if res.data else {"clave": clave, "valor": valor}


@router.post("/seguimiento/ejecutar")
async def ejecutar_seguimiento_manual(_: None = Depends(require_admin)):
    """
    Ejecuta todas las reglas de seguimiento automático y devuelve un resumen.
    Puede llamarse manualmente desde el admin o conectarse a un cron externo.
    """
    try:
        resultado = ejecutar_seguimiento()
        total = sum(resultado.values())
        return {"ok": True, "alarmas_generadas": total, "detalle": resultado}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/alarmas/{alarma_id}/resolver")
async def resolver_alarma(alarma_id: int,
                           db: Client = Depends(get_db), _: None = Depends(require_admin)):
    res = db.table("alarmas").update({"resuelta": True}).eq("id", alarma_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Alarma no encontrada")
    return res.data[0]
