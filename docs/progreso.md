# Progreso — Soluciones Dentales

> Última actualización: 2026-04-21

---

## Estado general

```
✅ MVP + M5 Booking + M6 Historia clínica + M7 Seguimiento + M9 Galería
✅ M10 Panel admin + M11 Telemedicina (A+B) + M12 Notificaciones
✅ M13 Multi-país (Fases 1-5a) + Política/ARCO + Encriptación Fernet
✅ Pulido: Realtime notifs + Recordatorios 24h + Lobby Jitsi check-in

Producción: solucionodont.shop · consultorio_id=1 (Modelo A funcionando)
Infra preparada para Modelo B (multi-tenant compartido)

Próximos: Métricas avanzadas + Fase 5b RLS multi-tenant + smoke test + commit/push
```

> 📍 Visión completa de funcionalidad y testing: [mapa-funcional-y-testing.md](mapa-funcional-y-testing.md)
> 📍 Guía de deploy multi-cliente: [deploy-multi-clinica.md](deploy-multi-clinica.md)
> 📍 Decisiones técnicas: [decisiones.md](decisiones.md)

---

## Hito 2026-04-21 — Fase Pulido (en curso)

### Realtime notifications · ✅
- ✅ Migración 020: `ALTER PUBLICATION supabase_realtime ADD TABLE notificaciones`
- ✅ `<NotifBell>` suscripto al canal Postgres Changes (filtro por `usuario_id`)
- ✅ Sonido `playBlip()` (Web Audio API, sin assets externos)
- ✅ Refetch del dropdown si está abierto cuando llega una notif

### Recordatorios 24h automáticos · ✅
- ✅ Router `cron.py` con auth por `X-Cron-Token` (env `CRON_TOKEN`)
- ✅ `POST /cron/recordatorios-24h`: ventana 23-25h, idempotente vía `metadata.turno_id`
- ✅ Soporta presencial (link `/mis-turnos`) y virtual (link `/sala/{id}`)
- ✅ GitHub Actions workflow `.github/workflows/cron-recordatorios.yml` programado `0 12 * * *`
- ✅ Necesita secrets `CRON_TOKEN` y `API_URL` en GitHub repo settings

### Lobby Jitsi · ✅
- ✅ `POST /telemedicina/turnos/{id}/check-in` (paciente OTP)
- ✅ Notif `paciente_llego_lobby` al odontólogo asignado
- ✅ Idempotencia: skip si ya envió notif en últimos 5 min
- ✅ Frontend: `checkInPaciente()` en `lib/api/telemedicina.ts`
- ✅ `/sala/[id]` llama check-in al click "Entrar a la videollamada" (silent fail)

### Pendientes inmediatos del bloque Pulido
- ⏸️ Métricas avanzadas: endpoint `/admin/metricas` + página `/admin/metricas` con charts
- ⏸️ i18n keys nuevas (cron, métricas) en `es/en/pt-BR.json`
- ⏸️ Smoke test (`npm run build`) + commit + push develop → merge a main

---

## Hito 2026-04-22/23 — Hecho en últimas sesiones

### M13 Multi-país — TODAS las fases base completas

- ✅ **Fase 1**: i18n con next-intl, 3 idiomas (es/en/pt-BR), 100% cobertura, detección automática
- ✅ **Fase 2**: schema multi-país (paises, consultorios, docs_requeridos, docs_consultorio, audit_log, consentimientos) + consultorio_id en tablas existentes (migraciones 013-014)
- ✅ **Fase 3**: backend multi-tenant — todos los routers filtran por consultorio_id, audit log activo, endpoints onboarding y superadmin
- ✅ **Fase 4**: frontend onboarding wizard 5 pasos + panel `/superadmin/*` + branding dinámico + UI "Crear admin del consultorio"
- ✅ **Fase 5a (lock down)**: `consultorio_id NOT NULL` + UNIQUE compuestos + X-Consultorio-ID en API públicos + idioma derivado del consultorio en login (migración 017)
- ⏸️ **Fase 5b** (pendiente): RLS multi-tenant en Supabase

### Política de privacidad + Consentimiento + ARCO (legal AR/BO/US)

- ✅ `GET /auth/mis-datos` — paciente descarga JSON completo (derecho de Acceso)
- ✅ `DELETE /auth/mi-cuenta` — anonimiza preservando turnos pasados (derecho al Olvido)
- ✅ `GET /consultorios/politica-privacidad` con templates por país
- ✅ Página `/privacidad` con render markdown personalizado
- ✅ Checkbox obligatorio en `/turnos` paso 4 + registro en tabla `consentimientos`
- ✅ Panel ARCO en `/mis-turnos` (descargar JSON + eliminar cuenta)
- 🟡 Templates EN/PT-BR son placeholders (solo ES está completo)

### Encriptación Fernet de datos sensibles

- ✅ `pacientes.telefono`, `pacientes.email`, `paciente_otps.codigo`, `turnos.notas`, `usuarios.email` cifrados
- ✅ Hashes determinísticos `_hash` para búsqueda sin desencriptar
- ✅ Migración 012 + backfill automático en startup
- ✅ Auto-reconnect ante `httpx.RemoteProtocolError` (singleton refresh)

### Otros fixes y polish

- ✅ Hero con foto de fondo + overlay integrado a la paleta
- ✅ Footer con link funcional a `/privacidad`
- ✅ Sidebar admin muestra nombre del consultorio dinámicamente
- ✅ Login redirige a `/superadmin` si rol superadmin
- ✅ list_usuarios filtra por consultorio (antes era global)

### M12 Notificaciones — MVP completo (sin Realtime aún)

- ✅ Migración 018: tabla `notificaciones` + índices + constraint usuario_id XOR paciente_id
- ✅ `services/notificaciones.py`: helpers `notificar()` + `notificar_a_admins()` (fail-safe)
- ✅ Router `notificaciones.py`:
  - `GET /notificaciones/staff` — listado del usuario logueado
  - `GET /notificaciones/staff/count` — solo count para badge
  - `PATCH /notificaciones/staff/{id}/leida`
  - `PATCH /notificaciones/staff/marcar-todas-leidas`
  - `GET /notificaciones/paciente` (con JWT OTP)
  - `PATCH /notificaciones/paciente/{id}/leida`
- ✅ Hooks automáticos en endpoints existentes:
  - `POST /turnos` → notif "nuevo_turno" a todos los admins
  - `PATCH /auth/mis-turnos/{id}/cancelar` → notif "turno_cancelado" a admins
  - `PATCH /superadmin/documentos/{id}` → notif "documento_aprobado/rechazado" a admins del consultorio
- ✅ Componente `<NotifBell>` con badge + dropdown últimas 10
- ✅ Página `/admin/notificaciones` con listado completo + filtros + marcar todas
- ✅ Polling cada 30 seg (placeholder hasta agregar Realtime)
- ✅ Integrado en sidebar admin Y superadmin
- ⏸️ Pendiente: Supabase Realtime para push instantáneo (en lugar de polling)

### M11 Telemedicina Fase A — turnos virtuales + Jitsi

- ✅ Migración 019: `turnos.modalidad` + `estado_pago` + `jitsi_room/password` + tablas `precios_telemedicina`, `recetas`, `chat_paciente_odontologo`
- ✅ `services/jitsi.py`: generación de room name único (UUID hash) + password
- ✅ Router `telemedicina.py`:
  - `GET /telemedicina/odontologos-virtual` (público) — lista odontólogos con telemed configurada
  - `GET /telemedicina/precio?odontologo_id=X&es_primera_consulta=` (público)
  - `POST /telemedicina/turnos` (público) — crea turno virtual, devuelve QR de pago
  - `POST /telemedicina/turnos/{id}/comprobante` (público) — upload comprobante
  - `GET /telemedicina/turnos/{id}/sala` (paciente OTP) — devuelve URL Jitsi + password si pago verificado
  - `GET /telemedicina/admin/pagos-pendientes` (staff) — turnos esperando verificación
  - `PATCH /telemedicina/admin/turnos/{id}/verificar-pago` (staff) — aprobar/rechazar
  - `GET /telemedicina/admin/precios` + `POST /telemedicina/admin/precios` (staff) — gestión de precios
- ✅ Hooks notif: `comprobante_recibido` a admins, `pago_verificado` al paciente
- ✅ Página pública `/turnos/virtual` con flow de 5 pasos (tipo → odontólogo → fecha+hora → datos+consentimiento → pago QR + upload)
- ✅ Página `/admin/pagos` para verificar comprobantes (aprobar/rechazar con motivo)
- ✅ Página `/sala/[id]` con componente `<JitsiSala>` embebido (jitsi-meet-external-api)
- ✅ Botón "Entrar a sala virtual" en `/mis-turnos` cuando `estado_pago='verificado'`
- ✅ Sidebar admin: entrada "💸 Pagos"
- ✅ Banner descubrimiento en `/turnos`: "📹 ¿Preferís consulta virtual?"
- ⏸️ Pendiente: lobby Jitsi notificación al odontólogo cuando paciente entra (Realtime)

### M11 Telemedicina Fase B — recetas PDF + chat + UI precios

- ✅ `services/pdf_recetas.py`: generación PDF con reportlab (header, contenido, footer con datos del odontólogo)
- ✅ Router `recetas.py`:
  - `POST /recetas/admin` — crea receta, genera PDF, sube a Storage, notifica al paciente
  - `GET /recetas/admin?paciente_id=X` — listar
  - `GET /recetas/paciente` — paciente ve sus recetas (JWT OTP)
  - `DELETE /recetas/admin/{id}` — soft delete (activa=false)
- ✅ Router `chat.py`: chat asincrónico paciente ↔ odontólogo
  - `GET /chat/admin/conversaciones` y `GET /chat/admin/{paciente_id}` (con auto mark-as-read)
  - `POST /chat/admin` — enviar (notifica al paciente)
  - `GET /chat/paciente/conversaciones` y `GET /chat/paciente/{odontologo_id}`
  - `POST /chat/paciente` — enviar (notifica al odontólogo)
- ✅ `requirements.txt`: agregado `reportlab==4.2.5`
- ✅ Frontend `/admin/recetas` con form crear + listado + ver PDF + archivar
- ✅ Frontend `/mis-recetas` (paciente) con descarga de PDF
- ✅ Frontend `/admin/chat` con lista de conversaciones + ventana mensajes + polling 15s
- ✅ Frontend `/mi-chat` (paciente) con UI mobile-first + polling
- ✅ Frontend `/admin/configuracion/telemedicina`: UI de precios por odontólogo (primera + seguimiento + moneda + QR + datos transferencia)
- ✅ Sidebar admin: 3 entradas nuevas (📄 Recetas, 💬 Chat, 📹 Telemedicina)
- ✅ `/mis-turnos`: links rápidos a "Mis recetas" y "Mi chat"
- ⏸️ Pendiente: lobby Jitsi notificación al odontólogo (Realtime)

### M6 Historia clínica + tratamientos

- ✅ Router `historial.py`:
  - `GET /historial/admin/{paciente_id}` (solo admin/odontologo)
  - `PATCH /historial/admin/{paciente_id}` upsert con audit log
  - `GET /historial/paciente` (con JWT OTP, read-only)
- ✅ Router `tratamientos.py`:
  - `GET /tratamientos/admin?paciente_id=X` (con JOIN paciente y odontólogo)
  - `POST /tratamientos/admin` (crear, audit log)
  - `PATCH /tratamientos/admin/{id}` (actualizar)
  - `DELETE /tratamientos/admin/{id}` (hard delete)
  - `GET /tratamientos/paciente` (sin notas internas)
- ✅ Recepcionista NO accede a historial clínico (solo admin/odontologo)
- ✅ Frontend `/admin/pacientes/[id]` con tabs:
  - Info (datos básicos)
  - Historial clínico (alergias / medicación / antecedentes — editable inline)
  - Tratamientos (CRUD completo + cambio de estado inline)
  - Turnos (listado pasados/futuros)
  - Recetas (las creadas para este paciente)
- ✅ Click en nombre de paciente desde `/admin/pacientes` → perfil completo
- ✅ Frontend `/mi-historial` paciente: ve historial + tratamientos (sin notas internas del odontólogo)
- ✅ `/mis-turnos`: links rápidos a Recetas / Historial / Chat

### Migraciones aplicadas en Supabase

```
001-011  base + RLS legacy + paciente_otps + grants
012      encriptación Fernet
013      paises + consultorios + docs + audit + consentimientos
014      consultorio_id FK en tablas existentes
015      fix: superadmin en CHECK constraint usuarios.rol
016      fix: disable RLS en tablas compliance
017      lock down: NOT NULL + UNIQUE compuestos multi-tenant
018      M12 notificaciones in-app
019      M11 telemedicina (modalidad + pago + jitsi + recetas + chat)
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

## Pendientes adicionales — gaps detectados (actualizado 2026-04-21)

### 🔴 Críticos antes de vender a otra clínica

- [x] **Encriptación de datos sensibles (PDPA Argentina)** — implementado y deployado
- [x] **Historia clínica (M6)** — completo (router + UI por tabs en `/admin/pacientes/[id]`)
- [x] **Notificaciones in-app (M12)** — completo, con Realtime + sonido
- [x] **Telemedicina (M11) Fase A+B** — Jitsi + recetas PDF + chat + lobby check-in
- [x] **Recordatorios automáticos 24h** — cron `/cron/recordatorios-24h` + GH Actions

- [ ] **Editar datos del consultorio desde UI**
  - Hoy admin no puede actualizar dirección/teléfono del consultorio sin SQL
  - Tarea: agregar `PATCH /consultorios/mi-consultorio` + sección en `/admin/configuracion`

- [ ] **Detalle de paciente click-through**
  - El nombre en `/admin/pacientes` no linkea a `/admin/pacientes/[id]` desde la tabla
  - Tarea: convertir nombre en `<Link>` (5 min)

- [ ] **Templates EN/PT-BR de política de privacidad**
  - Solo ES está completo, EN y PT-BR son placeholders
  - Bloquea vender a US o BR con compliance real

### 🟡 Importantes — cumplir spec original

- [ ] **Métricas avanzadas (M10 sección 9)** ← próxima tarea del bloque Pulido
  - Conversión por etapa: visitante → chat → presupuesto → turno → asistencia
  - Abandono en chat (mensajes enviados sin respuesta)
  - Efectividad del seguimiento automático (alarmas resueltas / generadas)
  - Crear página `/admin/metricas` con gráficos

- [ ] **Chat IA con streaming/Realtime**
  - Regla crítica #5 de AGENTS.md no cumplida
  - ChatWidget actual usa POST bloqueante → UX pobre con respuestas largas
  - Migrar a Gemini streaming (Server-Sent Events) o Supabase Realtime

- [ ] **Disponibilidad horaria configurable por doctor**
  - Hoy todos los doctores usan el mismo bloque horario
  - Crear tabla `horarios_doctor` + UI en `/admin/usuarios`

- [ ] **Importar pacientes vía CSV**
  - Para clínicas con base de datos pre-existente
  - Endpoint `POST /admin/pacientes/import` + UI con preview

### 🟢 Fase 3 — post-launch

- [ ] **Diagnóstico digital IA (M2)**
  - Paciente sube foto de la zona afectada
  - Gemini Vision analiza y da pre-diagnóstico orientativo

- [ ] **Tests backend**
  - `pytest` está en requirements pero `backend/tests/` no existe
  - Crear tests para flujos críticos: crear turno, OTP, encriptación, telemedicina

- [ ] **Drag & drop real en CRM kanban**
  - Hoy se mueve por select; cambiar a `react-dnd` o `@dnd-kit/core`

- [ ] **Vista mensual en `/admin/agenda`**
  - Solo hay vista semanal hoy

- [ ] **Editar caso de galería existente**
  - Solo se puede crear/eliminar, no editar título/descripción

- [ ] **Export CSV de audit log**
  - Para auditorías US/HIPAA

### 🔵 Multi-tenant Fase 5b

- [ ] **RLS multi-tenant en Supabase** (defense in depth)
  - Hoy filtrado solo en backend
  - Requiere arreglar cliente PostgREST custom para que la política `consultorio_id = current_setting(...)` funcione

- [ ] **Selector de consultorio en navbar admin**
  - Solo si un user pertenece a varios (multi-sede futuro)

- [ ] **Frontend dinámico por subdominio**
  - Para Modelo C automatizado (`clinica1.solucionesdentales.com`)

---

## Telemedicina (M11) — ✅ COMPLETO

> Solicitado: 2026-04-21 · Implementado en Fase A (2026-04-22) + Fase B (2026-04-23)
> Toda la migración 019, los routers y la UI están deployados. Lo único pendiente es el lobby check-in del paciente (✅ cerrado el 2026-04-21 en bloque Pulido).

### Decisiones tomadas (mantener para referencia)

- ✅ **Plataforma de video:** Jitsi `meet.jit.si` hosted con lobby activado
- ✅ **Pago:** previo al turno, vía QR + paciente sube comprobante manual
- ✅ **Alcance:** primera consulta + seguimiento, precios configurables por odontólogo
- ✅ **Chat asincrónico:** paciente ↔ odontólogo entre consultas
- ✅ **Recetas:** PDF simple con reportlab
- ✅ **Lobby check-in:** notif al odontólogo cuando paciente entra a sala virtual

---

## Notificaciones (M12) — ✅ COMPLETO

> Solicitado: 2026-04-21 · Implementado 2026-04-23 · Realtime cerrado 2026-04-21

- ✅ Migración 018: tabla `notificaciones` + Realtime publication (020)
- ✅ Router + servicio + hooks en endpoints sensibles
- ✅ `<NotifBell>` con dropdown + Supabase Realtime subscribe + sonido `playBlip()`
- ✅ Página `/admin/notificaciones` con filtros + marcar todas
- ✅ Cron `recordatorio_24h` (router `cron.py` + GH Actions)
- ✅ Lobby Jitsi check-in (`POST /telemedicina/turnos/{id}/check-in`)

**Pendiente fuera del MVP:**
- [ ] "Marcar llegada" para turnos presenciales (botón en agenda + endpoint)
- [ ] Push notif móvil (PWA + service worker) para staff offline
- [ ] Toast in-app además del badge (UX adicional)

---

## Multi-país compliance (nuevo módulo — M13)

> Solicitado: 2026-04-22 · Permite operar en AR, BO, US con reglas distintas

### Estado por fase

- ✅ **Fase 1 (2026-04-22):** i18n completo con next-intl (es/en/pt-BR), 100% cobertura, detección automática
- ✅ **Fase 2 (2026-04-22):** Schema multi-país + consultorio default — migraciones 013 y 014
- ✅ **Fase 3 (2026-04-22):** Backend multi-tenant — todos los routers filtran por consultorio_id, audit log activo, endpoints onboarding y superadmin listos
- ✅ **Fase 4 (2026-04-22):** Frontend onboarding wizard + panel superadmin + branding dinámico
- ✅ **Fase 5a (2026-04-23):** Lock down DB (consultorio_id NOT NULL + UNIQUE compuestos) + X-Consultorio-ID en API públicos + idioma derivado del consultorio en login
- ⏸️ **Fase 5b:** RLS multi-tenant en Supabase (requiere arreglar cliente Postgrest custom)

**Decisiones tomadas:**
- ✅ Países iniciales: Argentina, Bolivia, EE.UU.
- ✅ Tabla `paises` con configuración de compliance por país
- ✅ Tabla `consultorios` multi-tenant con FK a país
- ✅ Onboarding wizard con upload de docs requeridos por país
- ✅ Audit log universal (siempre activo, obligatorio en US)
- ✅ Modelo IA configurable por país (Gemini para AR/BO, Claude vía AWS Bedrock con BAA para US)
- ✅ **Idioma**: 4to idioma agregado pt-BR para futuro Brasil
- ✅ **Estrategia migración**: aditiva (consultorio default id=1, datos existentes vinculados a AR sin pérdida)
- ✅ **Modelo de paciente**: pertenece a UNA clínica (Modelo C de la conversación). Si va a otra, es otro paciente. Alineado con realidad médica AR/BO/US.

### Migración SQL (013 + 014) — DONE Fase 2
- [x] Migración 013: tablas `paises`, `consultorios`, `documentos_requeridos_pais`, `documentos_consultorio`, `audit_log`, `consentimientos` + seeds AR/BO/US + 20 docs requeridos
- [x] Migración 014: agrega `consultorio_id` (nullable + default 1) a `usuarios`, `pacientes`, `turnos`, `sesiones_agente`, `casos_galeria`, `alarmas`, `config_ia`, `interacciones`, `historial_clinico`, `tratamientos` + índices multi-tenant
- [x] Consultorio default id=1 creado para preservar datos existentes
- [ ] **Pendiente manual**: crear bucket Supabase Storage `documentos_compliance` (privado, signed URLs) — no se puede crear desde SQL

### Backend — DONE Fase 3
- [x] `core/tenant.py` — resuelve consultorio_id para staff/paciente/público
- [x] `services/audit.py` — helper `log_action(...)` reusable, fail-safe
- [x] `services/compliance.py` — checklist + recálculo de estado del consultorio
- [x] `routers/consultorios.py` — `GET /consultorios/paises`, `GET /consultorios/mi-consultorio`, `GET /consultorios/mi-consultorio/checklist`, `POST /consultorios/onboarding`, `POST /consultorios/mi-consultorio/documentos`
- [x] `routers/superadmin.py` — `GET /superadmin/consultorios`, `GET /superadmin/consultorios/{id}`, `GET /superadmin/consultorios/{id}/documentos`, `PATCH /superadmin/documentos/{id}`, `PATCH /superadmin/consultorios/{id}/suspender`, `PATCH /superadmin/consultorios/{id}/reactivar`, `GET /superadmin/audit-log`
- [x] `auth.py`: agregado rol `superadmin`, helpers `require_staff_context` + `require_superadmin`, login devuelve consultorio + país, register hereda consultorio_id
- [x] Routers existentes (`admin`, `turnos`, `casos`, `pacientes`, `agente`, `alarmas`) filtran por `consultorio_id` (excepto superadmin)
- [x] Audit log automático en endpoints sensibles (cambios de estado, uploads, aprobaciones)
- [ ] **Pendiente Fase 5**: middleware bloquea si país requiere consentimiento y paciente no firmó

### Frontend
- [ ] `/onboarding` — wizard de 5 pasos con upload
- [ ] Componente `<DocumentoUpload>` con preview y estado
- [ ] `/admin/configuracion/compliance` — ver estado y subir docs faltantes/vencidos
- [ ] `/superadmin/consultorios` — panel del SaaS para revisar pendientes
- [ ] Selector de país en signup con docs dinámicos

### Seeds iniciales
- [ ] AR: matricula_colegio, habilitacion_municipal, inscripcion_afip_cuit, inscripcion_aaip, politica_privacidad
- [ ] BO: nit, matricula_cdb, autorizacion_sedes, licencia_municipal, registro_sanitario, certificado_bioseguridad
- [ ] US: state_dental_license, npi, business_registration, malpractice_insurance, hipaa_risk_assessment, baa_supabase, baa_vercel, privacy_notice, breach_procedure

### Reglas por país (seed `paises`)
| Campo | AR | BO | US |
|---|---|---|---|
| nivel_seguridad | critico | medio | critico |
| requiere_baa | false | false | true |
| requiere_audit_log | false | false | true |
| requiere_consentimiento_explicito | true | true | true |
| retencion_datos_dias | 1825 (5 años) | 1825 | 2190 (6 años HIPAA) |
| requiere_firma_receta | true | false | varía por estado |
| notif_brecha_horas | NULL | NULL | 72 |
| modelo_ia_default | gemini-2.0-flash | gemini-2.0-flash | claude-sonnet-4-6 |

**Decisiones pendientes:**
- ¿Quién es el "superadmin" del SaaS que revisa docs? (vos directamente, o un rol específico)
- ¿El paciente cambia de consultorio o cada paciente pertenece a uno solo?
- Para US, ¿usamos Anthropic vía AWS Bedrock con BAA, o evaluamos Azure OpenAI?

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
