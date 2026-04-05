# Progreso — Soluciones Dentales

> Última actualización: 2026-04-05

---

## Estado general

```
Fase actual: Fase 1 MVP — en progreso
Próximo paso: Auth staff + Panel admin básico + Agente IA
```

---

## Hecho

- [x] AGENTS.md — visión, 10 módulos, modelo de datos, reglas críticas
- [x] CLAUDE.md — reglas de trabajo
- [x] docs/progreso.md

- [x] **Scaffold**
  - [x] Estructura de carpetas completa
  - [x] Next.js 14 + TypeScript + Tailwind + Supabase client
  - [x] FastAPI con todos los routers stub
  - [x] Migraciones SQL 001, 002, 003
  - [x] `.env` y `.env.local` con variables reales (Supabase configurado)
  - [x] `.gitignore`
  - [x] Dockerfile backend
  - [x] Store Zustand identidad progresiva
  - [x] Types: Paciente, Turno, Caso

- [x] **Infraestructura**
  - [x] Proyecto Supabase creado (instancia en la nube)
  - [x] Migraciones ejecutadas en Supabase (001, 002, 003)
  - [x] Backend corriendo en puerto 8001
  - [x] `@supabase/supabase-js` + `@supabase/ssr` instalados en frontend

- [x] **Frontend — Diseño y UI**
  - [x] Paleta dental (teal) + globals.css con animaciones, glassmorphism, clip-path
  - [x] Landing page completa: hero dark, stats, servicios, cómo funciona, galería preview, testimonios, CTA, FAQ, footer
  - [x] ChatWidget flotante (demo funcional con respuestas simuladas)
  - [x] Admin dashboard mockup: KPIs, agenda del día, alarmas, CRM pipeline mini

- [x] **Flujo de turnos (M5) — COMPLETO**
  - [x] Backend: `GET /turnos/disponibles` — slots reales con lógica de negocio
    - Horarios lun–vie 09:00–19:00, sábado hasta 13:00, domingo cerrado
    - Duración configurable por tipo de tratamiento
    - Excluye slots ocupados por turnos existentes (considera superposición)
    - Bloquea slots pasados si la fecha es hoy
  - [x] Backend: `POST /turnos/` — crea paciente si no existe, inserta turno, crea alarma admin
    - Identidad progresiva: busca por teléfono, crea si es nuevo
    - Score automático (+30 al agendar)
    - Estado del paciente → `turno_agendado`
  - [x] Frontend: `lib/api/turnos.ts` — cliente HTTP para la API
  - [x] Frontend: página `/turnos` conectada con API real
    - Paso 1: selección de tratamiento
    - Paso 2: selector de días hábiles + slots reales desde API (con loading/error states)
    - Paso 3: formulario nombre + teléfono + notas, submit real a la API
    - Paso 4: confirmación con resumen + link WhatsApp pre-armado

---

## Próximo paso: Fase 1 MVP (continuar)

- [ ] **Auth staff** — login con Supabase, hook useAuth, página /login
- [ ] **Panel admin básico** — agenda real + pacientes + alarmas (conectar con DB)
- [ ] **Agente IA** — widget flotante funcional con Gemini Flash
- [ ] **RLS policies** — ajustar para que el service role pueda insertar pacientes/turnos sin auth

---

## Bloqueado / Pendiente revisar

- RLS activo en `pacientes` y `turnos`: el backend usa `service_role` que bypassea RLS → OK para crear turnos desde el flujo público. Verificar que funciona en producción.
- `SUPABASE_SERVICE_ROLE_KEY` en backend/.env: asegurarse de que sea la key `service_role` (no la `anon`).
