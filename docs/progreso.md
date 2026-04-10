# Progreso — Soluciones Dentales

> Última actualización: 2026-04-09

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

- [x] **Fix mixed content — Proxy Next.js**
  - `next.config.mjs` con `async rewrites()` que proxy `/api/proxy/*` → backend VPS
  - Todos los API clients usan `/api/proxy` (relativo, same-origin, sin mixed-content)
  - Vercel necesita: `API_URL=http://72.61.162.46:8001` (env var server-side, NO public)

- [x] **Fase 2 — Galería (M9)**
  - Backend: `POST /admin/casos` con upload de imágenes a Supabase Storage
  - `GET /casos/` público (solo aprobados) · `GET /admin/casos` completo
  - `PATCH /admin/casos/{id}` aprobar/despublicar · `DELETE /admin/casos/{id}` eliminar
  - Frontend `/galeria`: slider drag antes/después, filtros por tratamiento, dark theme
  - Frontend `/admin/galeria`: grid doble foto, modal upload, botones publicar/eliminar

- [x] **Fase 2 — Admin pages completas**
  - Layout admin unificado con sidebar (nav + logout + link web)
  - `/admin/agenda`: vista semanal con 7 columnas (desktop) / tabs por día (mobile)
  - `/admin/pacientes`: tabla con búsqueda, filtro estado, sort, links WhatsApp
  - `/admin/crm`: kanban pipeline 7 columnas, mover pacientes drag&drop vía select
  - Dashboard rediseñado en dark theme, sin sidebar embebido redundante

- [x] **Fase 2 — Seguimiento automático (M7)**
  - `backend/app/services/seguimiento.py` — 4 reglas: inactivos >6m, turnos sin confirmar <48h, leads >24h, tratamientos sin próximo turno
  - `POST /admin/seguimiento/ejecutar` — devuelve resumen de alarmas creadas
  - `/admin/configuracion` — panel de configuración IA con botón ejecutar seguimiento

- [x] **Fase 2 — Agente IA dinámico (M2)**
  - `system_prompt` y `rangos_precios` se leen de `config_ia` (tabla Supabase)
  - Casos relevantes de galería se inyectan en el contexto según keywords del mensaje
  - `/admin/configuracion` — editar system_prompt, rangos, mensaje recordatorio, WA número

- [x] **Identidad progresiva — OTP (Fase 2)**
  - `POST /auth/otp/enviar` — genera OTP 4 dígitos, devuelve link WhatsApp
  - `POST /auth/otp/verificar` — verifica código, devuelve JWT paciente (30 días)
  - `GET /auth/mis-turnos` / `PATCH /auth/mis-turnos/{id}/cancelar` — con JWT paciente
  - Página `/mis-turnos` — 3 pasos: teléfono → OTP → lista de turnos
  - `pacienteStore` (Zustand + persist) — token + info paciente
  - Tabla `paciente_otps` (migración 008)

- [x] **Fixes críticos**
  - RLS recursión infinita → `get_auth_user_rol()` SECURITY DEFINER (migración 006)
  - RLS bloquea INSERT anónimo → políticas separadas por operación (migración 009)
  - CORS por redirect → `redirect_slashes=False` en todos los routers + rutas sin `/` final
  - Infinite fetch loop → `useMemo` para `proximosDiasHabiles()`
  - Mixed content → proxy Next.js `/api/proxy/*` → backend

---

- [x] **Fix definitivo — Grants en Supabase (migración 010)**
  - `GRANT INSERT ON pacientes, turnos, alarmas TO anon, authenticated`
  - `GRANT USAGE, SELECT ON ALL SEQUENCES` — permite SERIAL autoincrement
  - RLS policies + table grants = seguridad correcta en Supabase

- [x] **Landing page B2B (/software)**
  - Hero section con mock app cards animadas
  - Problem/Solution sections
  - Features grid (6 features)
  - Demo tabs interactivos (Booking / Turnos / Dashboard)
  - Pricing cards (2 planes)
  - Contact form con validación
  - Footer + navbar sticky
  - ~630 líneas React + Tailwind

- [x] **Docker setup simplificado**
  - `docker-compose.prod.yml` sin Traefik (puertos directos 3000/8001)
  - `frontend/Dockerfile` multi-stage Node.js build
  - `docs/deploy-docker.md` guía completa Hostinger
  - Eliminadas complejidades: Traefik labels, networks, cert generation

- [x] **Skills — Documentación técnica**
  - 7 skills detalladas: OTP, Admin Auth, Booking, Docker, AI Agent (próximo), Encryption, Testing
  - Cada skill: Qué es, Diagrama, Archivos, Pasos, Troubleshooting
  - Formato consistente para facilitar lectura y mantenimiento
  - Index en `skills/README.md`

---

## Pendiente — antes de producción

### Deploy Docker en Hostinger (CRÍTICO)
- [x] `docker-compose.prod.yml` — simplificado sin Traefik, puertos directos 3000/8001
- [x] `frontend/Dockerfile` — multi-stage Node.js build
- [x] `docs/deploy-docker.md` — guía completa de deployment
- [ ] **Ejecutar en VPS**: `docker compose -f docker-compose.prod.yml up -d --build`
- [ ] Verificar healthcheck: `curl http://localhost:8001/health`
- [ ] Abrir puertos 3000, 8001 en firewall Hostinger

### Variables de entorno (CRÍTICO)
- **Backend `.env`**: 
  - `SUPABASE_SERVICE_ROLE_KEY` — verificar que sea la **service_role key** del dashboard Supabase, NO la anon key
  - `JWT_SECRET=<valor-seguro>` (para tokens OTP pacientes)
  - `WA_NUMBER=549XXXXXXXXXX` (número WhatsApp del consultorio)
  - `ENVIRONMENT=production` (oculta `codigo_dev` en respuesta OTP)
- **Vercel**: `API_URL=http://[IP-VPS]:8001` (server-side, sin NEXT_PUBLIC_)

### Supabase
- [ ] **Ejecutar migración 010** (`010_grants_public_insert.sql`) en SQL Editor
- [ ] Crear bucket `galeria` en Storage con acceso público (fotos antes/después)
- [ ] Migración `config_ia` — si no se corrió: `INSERT INTO config_ia` con system_prompt inicial

### HTTPS backend (opcional, después del launch inicial)
- Opción A: Certbot + Nginx como reverse proxy
- Opción B: Cloudflare como CDN (recomendado)

---

## Checklist final QA
- [ ] Agendar turno en `/turnos` → paciente se crea, turno se inserta
- [ ] Ver turno en `/mis-turnos` (OTP flow)
- [ ] Admin → `/admin/agenda`, `/admin/pacientes`, `/admin/crm`
- [ ] Galería: subir foto antes/después en `/admin/galeria`
- [ ] Config IA: editar system_prompt, ejecutar seguimiento automático

---

## Notas técnicas

- El backend usa `service_role` key → bypassea RLS → puede crear pacientes/turnos sin auth de usuario
- El agente funciona sin GEMINI_API_KEY (devuelve mensaje de fallback con link a WhatsApp)
- Para probar el admin: crear usuario en Supabase Auth + insertar en tabla `usuarios`
