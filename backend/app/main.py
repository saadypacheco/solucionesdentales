import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, turnos, pacientes, agente, casos, admin, alarmas, consultorios, superadmin, notificaciones, telemedicina, recetas, chat, historial, tratamientos

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Backfill de encriptación al arrancar (idempotente, configurable por env)
    if os.getenv("RUN_ENCRYPTION_BACKFILL", "false").lower() == "true":
        try:
            from scripts.encrypt_backfill import run as run_backfill
            resumen = run_backfill()
            log.info("Backfill encriptación completado: %s", resumen)
        except Exception as e:
            log.exception("Backfill encriptación falló: %s", e)
    yield


app = FastAPI(
    title="Soluciones Dentales API",
    description="API para sistema de gestión odontológica",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://solucionesdentales.vercel.app",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(turnos.router)
app.include_router(pacientes.router)
app.include_router(agente.router)
app.include_router(casos.router)
app.include_router(admin.router)
app.include_router(alarmas.router)
app.include_router(consultorios.router)
app.include_router(superadmin.router)
app.include_router(notificaciones.router)
app.include_router(telemedicina.router)
app.include_router(recetas.router)
app.include_router(chat.router)
app.include_router(historial.router)
app.include_router(tratamientos.router)


@app.get("/health")
async def health():
    return {"status": "ok", "sistema": "Soluciones Dentales"}



@app.get("/")
async def root():
    return {"message": "Soluciones Dentales API v0.1.0"}
