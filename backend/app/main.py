from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, turnos, pacientes, agente, casos, admin, alarmas

app = FastAPI(
    title="Soluciones Dentales API",
    description="API para sistema de gestión odontológica",
    version="0.1.0",
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


@app.get("/health")
async def health():
    return {"status": "ok", "sistema": "Soluciones Dentales"}


@app.get("/")
async def root():
    return {"message": "Soluciones Dentales API v0.1.0"}
