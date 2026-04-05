# AGENTS.md — Soluciones Dentales
> Stack: Next.js 14 · FastAPI · Supabase · Gemini Flash (IA) · WhatsApp (enlace web)
> Última modificación: 2026-04-05
> Límite: 600 líneas. Detalles específicos → ver `/skills/`

---

## 1. Visión del proyecto

Sistema web para consultorio odontológico que actúa como **motor de conversión**:
convierte visitantes en pacientes automáticamente, gestiona el ciclo completo del
paciente con contexto clínico, y automatiza seguimiento para aumentar ingresos.

El diferencial no es la agenda online — es la **identidad progresiva**:
el sistema aprende quién es el visitante desde el primer mensaje, sin pedirle registro.
El agente IA recibe, clasifica, da presupuesto orientativo y agenda — sin intervención
humana en el flujo inicial.

**Audiencia:** pacientes actuales y potenciales del consultorio, Argentina, mobile-first.
**Métrica clave:** tasa de conversión visitante → turno agendado.
**Métrica secundaria:** tasa de recuperación de pacientes inactivos (> 6 meses sin turno).

---

## 2. Stack

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | Next.js App Router + TypeScript | 14.x |
| Estilos | Tailwind CSS | 3.x |
| Estado cliente | Zustand | 4.x |
| Backend | FastAPI + Python | 3.12 / 0.111+ |
| Validación | Pydantic v2 | 2.x |
| Base de datos | Supabase (PostgreSQL 15) | — |
| Auth | Supabase Auth (JWT) — solo staff y admin | — |
| Storage | Supabase Storage | — |
| Realtime | Supabase Realtime (WebSockets) | — |
| IA agente | Gemini 2.0 Flash (fácil migración a Claude) | — |
| OTP | Supabase Auth phone (SMS) o código manual | — |
| Contacto | WhatsApp (`wa.me`) con mensaje pre-formateado | — |
| Deploy FE | Vercel | — |
| Deploy BE | VPS Hostinger — mismo servidor que tienda, puerto distinto | — |
| CI/CD | GitHub Actions | — |

> ⚠️ El stack del spec original sugería Node.js + MySQL. Se usa FastAPI + Supabase
> porque ya está probado en producción y comparte infraestructura con el proyecto tienda.

---

## 3. Arquitectura general — 10 módulos

```
M0 — Identidad progresiva   (CRÍTICO — base de todo)
M1 — Agente de recepción IA (CRÍTICO — motor de conversión)
M2 — Diagnóstico digital IA (fase 2)
M3 — Motor de conversión    (scoring + presupuesto + cierre)
M4 — CRM inteligente        (pipeline de pacientes)
M5 — Agenda                 (turnos + calendario)
M6 — Historial clínico      (fase 2)
M7 — Seguimiento automático (fase 2)
M8 — Sistema de alarmas     (alertas internas + recordatorios)
M9 — Galería de casos       (antes/después — VENDE más que cualquier texto)
M10 — Panel administrativo  (control total)
```

---

## 4. Estructura de carpetas

```
solucionesdentales/
├── AGENTS.md
├── CLAUDE.md
├── docs/
│   ├── progreso.md
│   └── decisiones.md
├── frontend/
│   ├── app/
│   │   ├── page.tsx                    # Landing / home
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── (publico)/
│   │   │   ├── servicios/page.tsx      # Catálogo de tratamientos
│   │   │   ├── galeria/page.tsx        # Galería casos antes/después
│   │   │   └── turnos/page.tsx         # Agendar turno (flow público)
│   │   ├── (paciente)/
│   │   │   ├── mis-turnos/page.tsx
│   │   │   └── historial/page.tsx
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx          # Solo staff/admin
│   │   │   └── verificar/page.tsx      # OTP para pacientes
│   │   └── admin/
│   │       ├── layout.tsx
│   │       ├── dashboard/page.tsx
│   │       ├── pacientes/page.tsx
│   │       ├── agenda/page.tsx
│   │       ├── crm/page.tsx
│   │       ├── historial/page.tsx
│   │       ├── galeria/page.tsx
│   │       ├── alarmas/page.tsx
│   │       └── configuracion/page.tsx  # Prompts IA, mensajes automáticos
│   ├── components/
│   │   ├── ui/                         # Button, Input, Badge, Modal, Calendar
│   │   ├── agente/                     # ChatWidget, MensajeBurbuja, TypingIndicator
│   │   ├── turno/                      # CalendarioTurnos, SlotPicker, FormTurno
│   │   ├── galeria/                    # SliderAntesDepues, FiltroTratamiento
│   │   ├── crm/                        # KanbanPipeline, TarjetaPaciente
│   │   └── admin/                      # Componentes del panel
│   ├── hooks/
│   │   ├── useIdentidad.ts             # Identidad progresiva (tel + OTP)
│   │   ├── useAgente.ts                # Chat con agente IA
│   │   ├── useTurnos.ts
│   │   └── useCRM.ts
│   ├── lib/
│   │   ├── supabase/
│   │   └── api/
│   ├── store/
│   │   └── identidadStore.ts           # Zustand: sesion_id, paciente_id, verificado
│   └── types/
│       ├── paciente.ts
│       ├── turno.ts
│       └── caso.ts
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/
│   │   │   ├── auth.py                 # Login staff/admin + OTP pacientes
│   │   │   ├── agente.py               # POST /agente/mensaje
│   │   │   ├── turnos.py               # CRUD turnos
│   │   │   ├── pacientes.py            # Perfil + historial
│   │   │   ├── casos.py                # Galería antes/después
│   │   │   ├── admin.py                # Endpoints protegidos admin
│   │   │   └── alarmas.py              # Sistema de alertas
│   │   ├── models/
│   │   ├── services/
│   │   │   ├── agente.py               # Lógica IA (Gemini) — mismo patrón que tienda
│   │   │   ├── diagnostico.py          # Diagnóstico preliminar IA (fase 2)
│   │   │   ├── scoring.py              # Score de conversión por paciente
│   │   │   └── seguimiento.py          # Mensajes automáticos (fase 2)
│   │   ├── db/
│   │   └── core/
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
│
├── supabase/
│   ├── migrations/
│   └── seed.sql
│
└── skills/
    ├── identidad-progresiva.md
    ├── agente-ia.md
    ├── agenda-turnos.md
    ├── galeria-casos.md
    └── crm-pipeline.md
```

---

## 5. Módulos — detalle funcional

### M0 — Identidad progresiva (base de todo)

El sistema NO tiene login obligatorio para pacientes.

```
FASE 1 — Anónimo
  session_id (UUID localStorage) identifica la sesión
  El agente puede atender sin datos personales

FASE 2 — Identificación suave
  Agente pide nombre + teléfono en el flujo de conversación
  IF teléfono existe en DB → paciente existente, cargar contexto
  ELSE → paciente nuevo, crear registro

FASE 3 — Verificación (OTP)
  Solo se pide OTP cuando el paciente quiere ver sus turnos/historial
  Supabase Auth phone o código de 4 dígitos enviado por WhatsApp
```

**Regla crítica:** nunca pedirle registro/login antes de que el paciente haya
interactuado. El formulario de turno puede capturar nombre + teléfono sin cuenta.

---

### M1 — Agente de recepción IA

El agente vive en un widget flotante en toda la web y en la página de turnos.

**Flujo del agente:**
1. Saludo + detectar urgencia (¿dolor agudo? → derivar a WhatsApp urgente)
2. Clasificar consulta (estética / funcional / urgencia / consulta de precio)
3. Profundizar (¿qué síntoma? ¿cuánto tiempo? ¿ya fue al dentista?)
4. Diagnóstico preliminar orientativo + precio aproximado
5. Proponer turno → llamar a disponibilidad en agenda
6. Confirmar turno o derivar a WhatsApp si no hay disponibilidad

**Sistema de escalada:**
- Urgencia alta → WhatsApp inmediato
- Consulta compleja → "Te llama la doctora" + captura de teléfono
- Fuera de horario → tomar datos + agendar llamado

---

### M3 — Motor de conversión

```python
# Score de un paciente (0-100)
score = 0
score += 10   # dejó teléfono
score += 15   # completó el chat
score += 20   # pidió presupuesto
score += 30   # agendó turno
score += 25   # fue al turno (confirmado por admin)
score -= 10   # no asistió sin avisar
score -= 5    # canceló dentro de las 24hs
```

**Presupuesto dinámico:** el agente puede dar rangos orientativos por tratamiento
configurados en admin. No precios fijos — rangos que evitan fricciones.

---

### M4 — CRM inteligente

Estados del pipeline (kanban en admin):
```
nuevo → contactado → interesado → turno_agendado → paciente_activo → inactivo → perdido
```

Cada paciente tiene:
- Score actual + historial de score
- Próxima acción recomendada por IA
- Historial completo de interacciones (chat + turnos + tratamientos)

---

### M5 — Agenda

- Vista semanal/mensual en admin (calendar component)
- Slots configurables: duración por tipo de tratamiento
- Paciente puede pedir turno sin login (captura nombre + teléfono)
- Estados: `solicitado` → `confirmado` → `realizado` → `cancelado` → `ausente`
- Recordatorio automático por WhatsApp 24hs antes (enlace web, no API)

---

### M8 — Sistema de alarmas

**Alarmas para el admin:**
- Leads sin seguimiento hace +24hs
- Pacientes con tratamiento incompleto (acordado pero sin turno siguiente)
- Pacientes inactivos hace +6 meses (candidatos a campaña de reactivación)
- Turnos sin confirmar a menos de 48hs

**Recordatorios para pacientes:**
- WhatsApp manual desde admin (botón que abre wa.me con mensaje pre-armado)

---

### M9 — Galería de casos (antes/después)

**Por qué es crítica:** genera confianza y convierte más que cualquier texto.
El agente puede mostrar casos relevantes según la consulta del paciente.

```
Caso {
  id, tipo_tratamiento, descripcion,
  imagen_antes_url, imagen_despues_url,
  duracion_tratamiento, aprobado (admin)
}
```

- Slider comparativo en frontend (drag o toggle)
- Filtros: estética, implantes, ortodoncia, blanqueamiento
- El agente puede decir "te muestro un caso similar" y renderizar el caso
- Upload en admin, aprobación antes de publicar

---

### M10 — Panel administrativo

Secciones:
1. **Dashboard** — leads del día, tasa conversión, turnos del día, pacientes activos
2. **Pacientes** — listado, búsqueda por teléfono, score, estado CRM
3. **Agenda** — calendario visual, mover turnos, confirmar asistencia
4. **CRM / Pipeline** — kanban por estado
5. **Historial clínico** — por paciente: consultas, tratamientos, imágenes
6. **Galería** — subir casos, aprobar publicación, editar descripciones
7. **Alarmas** — alertas activas, acciones recomendadas
8. **Configuración IA** — system prompt del agente, rangos de precios, mensajes automáticos
9. **Métricas** — conversión por etapa, abandono en chat, efectividad seguimiento

---

## 6. Modelo de datos

```sql
-- Identidad
pacientes (
  id, telefono UNIQUE, nombre, email,
  score INT DEFAULT 0,
  estado TEXT,           -- 'nuevo' | 'contactado' | 'interesado' | 'paciente_activo' | 'inactivo' | 'perdido'
  proxima_accion TEXT,
  verificado BOOLEAN DEFAULT FALSE,
  created_at, updated_at
)

-- Staff / Admin
usuarios (
  id UUID,  -- auth.users
  email, nombre, rol  -- 'admin' | 'odontologo' | 'recepcionista'
)

-- Agenda
turnos (
  id, paciente_id, usuario_id (odontólogo),
  fecha_hora TIMESTAMP, duracion_minutos INT,
  tipo_tratamiento TEXT, estado TEXT,
  notas TEXT, created_at
)
-- estado: 'solicitado' | 'confirmado' | 'realizado' | 'cancelado' | 'ausente'

-- CRM
interacciones (
  id, paciente_id, tipo TEXT,  -- 'chat' | 'llamada' | 'turno' | 'mensaje_wa'
  contenido TEXT, created_at
)

-- Historial clínico
historial_clinico (
  id, paciente_id,
  alergias TEXT[], medicacion TEXT[],
  antecedentes TEXT
)

tratamientos (
  id, paciente_id, usuario_id,
  descripcion TEXT, fecha DATE,
  estado TEXT,  -- 'planificado' | 'en_curso' | 'completado'
  costo DECIMAL, imagen_urls TEXT[],
  notas TEXT
)

-- Chat IA
sesiones_agente (
  id, session_id TEXT, paciente_id (nullable),
  created_at, updated_at
)

mensajes_agente (
  id, sesion_id, rol TEXT,  -- 'user' | 'model'
  contenido TEXT, es_bot BOOLEAN DEFAULT FALSE,
  created_at
)

-- Galería
casos_galeria (
  id, tipo_tratamiento TEXT,
  descripcion TEXT,
  imagen_antes_url TEXT, imagen_despues_url TEXT,
  duracion_tratamiento TEXT,
  aprobado BOOLEAN DEFAULT FALSE,
  created_at
)

-- Alarmas
alarmas (
  id, tipo TEXT, paciente_id (nullable),
  titulo TEXT, descripcion TEXT,
  prioridad TEXT,  -- 'alta' | 'media' | 'baja'
  resuelta BOOLEAN DEFAULT FALSE,
  created_at
)

-- Configuración IA (editable desde admin)
config_ia (
  id, clave TEXT UNIQUE, valor TEXT, updated_at
)
-- claves: 'system_prompt', 'rangos_precios', 'mensaje_recordatorio'
```

---

## 7. Convenciones de código

Idénticas al proyecto tienda — ver sección §6 de tienda/AGENTS.md.

Resumen:
- Frontend: PascalCase componentes, `use` prefix hooks, Tailwind only, `'use client'` mínimo
- Backend: snake_case rutas, schemas `NombreCreate/Update/Response`, `HTTPException` en español
- Git: `feature/nombre`, `fix/descripcion`, commits `feat(módulo): descripción`

---

## 8. Variables de entorno

```bash
# frontend/.env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_WA_NUMBER=5491100000000   # número del consultorio

# backend/.env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
JWT_SECRET=
ENVIRONMENT=production
```

---

## 9. Reglas críticas

1. `SUPABASE_SERVICE_ROLE_KEY` nunca va al frontend
2. RLS activo en todas las tablas con datos de pacientes
3. Imágenes → Supabase Storage, nunca base64 en DB
4. **Identidad progresiva:** nunca pedir login antes de la primera interacción
5. Chat IA: Supabase Realtime directo para respuestas del bot
6. Soft delete siempre: `activo = false` o `estado = 'inactivo'`, nunca `DELETE`
7. Historial clínico: solo visible para admin/odontólogo, nunca accesible sin auth
8. Agente IA: fire-and-forget, nunca bloquea la UI
9. Galería: imágenes solo se publican con `aprobado = true`
10. Teléfono es la clave de identidad del paciente — `UNIQUE` en DB
11. Config IA editable desde admin, nunca hardcodeada en código
12. Si el agente no puede resolver → escalar a WhatsApp, nunca dejar al paciente sin respuesta

---

## 10. Flujos críticos

### Visita → Turno agendado
```
visitante abre la web
→ AgentWidget aparece (no intrusivo, mensaje suave)
→ paciente escribe consulta
→ POST /agente/mensaje (con session_id)
  → agente clasifica consulta
  → si urgencia alta → responde con link WhatsApp urgente
  → si consulta normal → profundiza → da precio orientativo
  → propone turno → GET /turnos/disponibles
  → paciente elige slot
→ POST /turnos (nombre + teléfono — sin login)
  → IF teléfono existe → vincular al paciente existente
  → ELSE → INSERT paciente nuevo
  → INSERT turno (estado='solicitado')
  → UPDATE paciente score += 30
  → INSERT alarma para admin ("nuevo turno solicitado")
```

### Recuperación de paciente inactivo
```
[cron diario 09:00]
→ SELECT pacientes WHERE último turno < NOW() - INTERVAL '6 meses'
→ INSERT alarma (tipo='reactivacion', prioridad='media')
→ admin ve alarma → abre paciente → botón "Enviar recordatorio"
→ abre wa.me con mensaje pre-armado ("Hola {nombre}, hace tiempo...")
```

### Aprobación de caso en galería
```
admin sube imagen antes + después
→ POST /admin/casos (aprobado=false por defecto)
→ admin revisa en /admin/galeria
→ PATCH /admin/casos/{id} { aprobado: true }
→ caso aparece en /galeria pública
→ agente puede citarlo en conversaciones
```

---

## 11. MVP — orden de implementación

```
FASE 1 (lanzar en producción)
  1. Scaffold + auth staff
  2. Migraciones SQL completas
  3. Agente IA básico (recibe, responde, agenda)
  4. Formulario de turno público (sin login)
  5. Panel admin: agenda + pacientes + alarmas básicas

FASE 2 (después del lanzamiento)
  6. CRM con pipeline kanban
  7. Galería casos antes/después
  8. Diagnóstico digital IA
  9. Sistema de seguimiento automático

FASE 3 (escalado)
  10. Historial clínico completo
  11. Métricas avanzadas
  12. Configuración IA desde admin
```

---

## 12. Deploy — mismo VPS que tienda

```yaml
# docker-compose.prod.yml (agregar al existente)
services:
  dentales-backend:
    build: ./solucionesdentales/backend
    ports:
      - "8001:8000"   # tienda usa 8000, dentales usa 8001
    env_file: ./solucionesdentales/backend/.env

# nginx: proxy dentales-api.solucionesdentales.com → localhost:8001
# Frontend: Vercel (proyecto separado, deploy automático)
```
