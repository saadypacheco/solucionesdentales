# Progreso — Soluciones Dentales

> Última actualización: 2026-04-05

---

## Estado general

```
Fase actual: Fase 1 MVP — COMPLETA
Próximo paso: Deploy a producción + testeo end-to-end
```

---

## Hecho

- [x] AGENTS.md, CLAUDE.md, docs/

- [x] **Scaffold completo**
  - Next.js 14 + TypeScript + Tailwind + Supabase client
  - FastAPI con todos los routers
  - Migraciones SQL 001, 002, 003 ejecutadas en Supabase
  - Zustand (identidadStore + authStore)

- [x] **Frontend — UI**
  - Landing page moderna (hero dark, glassmorphism, clip-path, animaciones)
  - ChatWidget flotante conectado a IA real

- [x] **M5 — Flujo de turnos completo**
  - `GET /turnos/disponibles` — slots reales con lógica de negocio, filtra por doctor
  - `GET /turnos/doctores?tratamiento=X` — devuelve odontólogos para ese tratamiento
  - `POST /turnos/` — crea paciente (identidad progresiva), turno y alarma; asigna doctor
  - Migración `004_doctor_especialidades.sql` — campo `especialidades TEXT[]` en `usuarios`
  - Página `/turnos` adaptativa: 3 pasos (1 doctor) o 4 pasos (múltiples doctores)
  - Si 1 doctor para el tratamiento → auto-asigna sin mostrar selector
  - Si múltiples → paso 2 muestra selector de odontólogo con agenda independiente

- [x] **Auth staff (M10)**
  - `POST /auth/login` — Supabase Auth
  - Página `/admin/login` con diseño dark + glassmorphism
  - `authStore` (Zustand + persist)
  - `app/admin/layout.tsx` — protección de rutas admin
  - `middleware.ts` — matcher para rutas admin

- [x] **Panel admin (M10)**
  - `GET /admin/turnos?fecha=` — con filtro por día
  - `PATCH /admin/turnos/{id}` — cambiar estado (selector inline)
  - `GET /admin/pacientes` — listado con pipeline CRM
  - `GET /alarmas/` — alarmas activas
  - `PATCH /admin/alarmas/{id}/resolver`
  - Dashboard real: KPIs dinámicos, agenda del día con estado editable, alarmas con botón resolver, pipeline CRM real
  - Link WhatsApp pre-armado por turno

- [x] **Agente IA (M1)**
  - `POST /agente/mensaje` — Gemini 2.0 Flash con system prompt dental
  - ChatWidget conectado a la API real (con fallback si no hay GEMINI_API_KEY)
  - Historial de conversación por sesión en DB

- [x] **Producción**
  - `docker-compose.prod.yml` — servicio dentales-backend en puerto 8001
  - `nginx/dentales.conf` — reverse proxy con SSL ready
  - `deploy.sh` — script de deploy con healthcheck
  - `.github/workflows/deploy.yml` — CI/CD automático
  - `docs/produccion.md` — guía completa de setup

---

## Próximo paso: Deploy + Fase 2

### Deploy inmediato
- [ ] Clonar repo en VPS
- [ ] Configurar secrets en GitHub (VPS_HOST, VPS_USER, VPS_SSH_KEY)
- [ ] Correr setup nginx en VPS
- [ ] Importar proyecto en Vercel con variables de entorno de producción
- [ ] Primer push → verificar deploy automático

### Fase 2 (post-lanzamiento)
- [ ] CRM kanban (M4)
- [ ] Galería casos antes/después (M9)
- [ ] Diagnóstico digital IA (M2)
- [ ] Sistema de seguimiento automático (M7)

---

## Notas técnicas

- El backend usa `service_role` key → bypassea RLS → puede crear pacientes/turnos sin auth de usuario
- El agente funciona sin GEMINI_API_KEY (devuelve mensaje de fallback con link a WhatsApp)
- Para probar el admin: crear usuario en Supabase Auth + insertar en tabla `usuarios`
