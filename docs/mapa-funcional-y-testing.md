# Mapa funcional y guía de testing

> Árbol completo de perfiles, rutas, funcionalidad y estado de implementación. Sirve para QA, demos, y para visualizar qué falta del producto.

**Última actualización:** 2026-04-23 (post política de privacidad + ARCO)

---

## Leyenda de estados

- ✅ **Implementado y deployado**
- 🟡 **Parcial** (funciona pero le falta algo)
- ⚠️ **Implementado pero no testeado en producción**
- ❌ **Pendiente** (en backlog)
- 🔒 **Requiere autenticación**

---

## Perfiles del sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  PÚBLICO                  PACIENTE OTP            STAFF             │
│  (sin auth)               (JWT 30 días)           (Supabase Auth)   │
│                                                                     │
│  ─────────                ──────────              ──────────        │
│                                                                     │
│  Cualquier visitante      Ya tiene turno          • admin           │
│  potencial paciente       en el consultorio       • odontologo      │
│                           Verificó por WhatsApp   • recepcionista   │
│                                                   • superadmin*     │
│                                                                     │
│                                                   *del SaaS, no de  │
│                                                    un consultorio   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🌐 Perfil 1 · PÚBLICO (sin login)

```
HOME (https://solucionodont.shop)
│
├── ✅ /  (landing)
│   ├── ✅ Hero con foto + CTA
│   ├── ✅ Stats (+500 pacientes, etc) — i18n
│   ├── ✅ Servicios (4 cards)
│   ├── ✅ Cómo funciona (3 pasos)
│   ├── ✅ Galería preview (3 casos)
│   ├── ✅ Testimonios (3)
│   ├── ✅ FAQ (4 preguntas)
│   ├── ✅ Footer con horarios + contacto
│   ├── ✅ ChatWidget IA flotante
│   └── ✅ Switcher de idioma (ES/EN/PT)
│
├── ✅ /turnos  (agendar paso a paso)
│   ├── ✅ Paso 1: tratamiento (7 opciones)
│   ├── ✅ Paso 2: doctor (si hay varios)
│   ├── ✅ Paso 3: fecha + hora (10 días hábiles)
│   ├── ✅ Paso 4: nombre + tel/email + notas + ✅ checkbox privacidad
│   └── ✅ Paso 5: confirmación + link WhatsApp
│
├── ✅ /galeria  (casos antes/después)
│   ├── ✅ Slider drag para comparar
│   ├── ✅ Filtros por tratamiento
│   └── ✅ CTA al final → /turnos
│
├── ✅ /privacidad  (NUEVO — política legal por país)
│   ├── ✅ Texto markdown renderizado
│   ├── ✅ Personalizado por consultorio (nombre, dirección, contacto)
│   ├── ✅ Templates: AR (Ley 25.326), BO (Constitución), US (HIPAA)
│   └── 🟡 Templates EN/PT-BR son placeholders (faltan traducir)
│
├── ✅ /software  (landing B2B propio del SaaS — venta a otros consultorios)
│
├── ❌ /servicios  (catálogo detallado)
├── ❌ /terminos
├── ❌ /equipo  (presentar al staff)
└── ❌ /sucursales  (si el consultorio tiene varias)
```

### ChatWidget (presente en todas las páginas públicas)

```
🦷 Asistente IA
├── ✅ Saludo i18n
├── ✅ 3 quick replies (agendar, precios, urgencia)
├── ✅ POST /agente/mensaje (Gemini Flash)
├── ✅ Persiste sesión por session_id
├── ✅ Manda X-Consultorio-ID para multi-tenant
└── ❌ Streaming de respuestas (POST bloqueante hoy)
```

---

## 👤 Perfil 2 · PACIENTE con JWT OTP

```
INGRESO
│
└── 🔒 /mis-turnos  (3 pasos)
    │
    ├── Paso A · Telefono
    │   └── ✅ POST /auth/otp/enviar
    │
    ├── Paso B · OTP
    │   ├── ✅ POST /auth/otp/verificar
    │   └── ✅ Devuelve JWT 30 días
    │
    └── Paso C · Lista (logueado)
        │
        ├── ✅ Saludo personalizado
        ├── ✅ Próximos turnos
        │   ├── ✅ Estado del turno
        │   ├── ✅ Notas (desencriptadas)
        │   └── ✅ Cancelar (PATCH /auth/mis-turnos/{id}/cancelar)
        │
        ├── ✅ Historial (turnos pasados)
        │
        ├── ✅ Botón "+ Agendar nuevo turno" → /turnos
        │
        └── ✅ Panel ARCO (NUEVO — derechos del paciente)
            ├── ✅ 📥 Descargar JSON con todos mis datos
            │   └── GET /auth/mis-datos
            └── ✅ 🗑️ Eliminar mi cuenta (anonimiza)
                └── DELETE /auth/mi-cuenta
```

### Lo que un paciente NO puede hacer todavía

```
❌ Ver su historial clínico (alergias, medicación, antecedentes)
❌ Ver tratamientos en curso
❌ Pedir consulta virtual (telemedicina)
❌ Ver/descargar recetas digitales
❌ Chat asincrónico con su odontólogo
❌ Recibir notificaciones in-app
❌ Modificar/rectificar sus datos (solo cancelación implementada)
```

---

## 👨‍⚕️ Perfil 3 · STAFF del consultorio (admin / odontólogo / recepcionista)

```
INGRESO
│
└── 🔒 /admin/login  (Supabase Auth)
    └── ✅ POST /auth/login
        └── Devuelve JWT + datos del consultorio + país

DASHBOARD (rol: admin/odontologo/recepcionista)
│
├── ✅ /admin/dashboard
│   ├── ✅ KPIs del día (turnos, sin confirmar, nuevos, alarmas)
│   ├── ✅ Agenda de hoy con cambio de estado inline
│   ├── ✅ Alarmas activas + botón resolver
│   ├── ✅ Pipeline CRM resumen (link a kanban)
│   └── ✅ WhatsApp pre-armado por turno
│
├── ✅ /admin/agenda
│   ├── ✅ Vista semanal (7 columnas desktop, tabs mobile)
│   ├── ✅ Cambio de estado por turno
│   ├── ✅ Navegar semanas anteriores/siguientes
│   └── ❌ Vista mensual / calendario completo
│
├── ✅ /admin/pacientes
│   ├── ✅ Tabla con búsqueda
│   ├── ✅ Filtro por estado CRM
│   ├── ✅ Sort: fecha / score / nombre
│   ├── ✅ Score visual (barra)
│   ├── ✅ WhatsApp pre-armado
│   ├── ❌ Ver detalle del paciente (perfil completo)
│   ├── ❌ Editar paciente
│   └── ❌ Crear paciente manual
│
├── ✅ /admin/crm
│   ├── ✅ Kanban 7 columnas (estados)
│   ├── ✅ Mover paciente con select
│   └── ❌ Drag & drop real
│
├── ✅ /admin/usuarios  (solo admin)
│   ├── ✅ Listar usuarios (filtrado por consultorio)
│   ├── ✅ Crear usuario (admin/odonto/recep)
│   ├── ✅ Editar nombre/rol/email/especialidades
│   ├── ✅ Reset password
│   ├── ✅ Activar/desactivar
│   └── ❌ Asignar consultorio_id distinto (solo superadmin)
│
├── ✅ /admin/galeria
│   ├── ✅ Listar casos (filtrado por consultorio)
│   ├── ✅ Subir caso (modal con upload)
│   ├── ✅ Aprobar/Despublicar
│   ├── ✅ Eliminar (soft delete)
│   └── ❌ Editar caso existente
│
├── ✅ /admin/configuracion
│   ├── ✅ System prompt del agente IA
│   ├── ✅ Rangos de precios
│   ├── ✅ Mensaje recordatorio WhatsApp
│   ├── ✅ Número WhatsApp del consultorio
│   ├── ✅ Botón "Ejecutar seguimiento ahora"
│   └── ❌ Editar datos del consultorio (nombre, dirección, etc.)
│
└── ✅ /admin/configuracion/compliance  (NUEVO)
    ├── ✅ Checklist por país (5 docs AR / 6 BO / 9 US)
    ├── ✅ Estado por documento (no_subido/pendiente/aprobado/rechazado/vencido)
    ├── ✅ Upload con drag & drop
    ├── ✅ Fecha de vencimiento
    ├── ✅ Ver observaciones de revisor
    └── ✅ Reemplazar documento existente
```

### Sidebar (8 entradas)
```
📊 Dashboard
📅 Agenda
👥 Pacientes
🎯 CRM
👨‍⚕️ Usuarios
🖼️ Galería
⚙️ Config IA
✅ Compliance  ← NUEVO
```

### Lo que un admin NO puede hacer todavía

```
❌ Editar info del consultorio desde UI (nombre, dirección, contacto)
❌ Ver historia clínica completa de un paciente (M6 pendiente)
❌ Crear receta digital (M11)
❌ Iniciar consulta virtual con paciente (M11)
❌ Chat asincrónico con paciente (M11)
❌ Crear tratamiento manual a un paciente
❌ Ver métricas avanzadas (conversión por etapa, abandono chat)
❌ Recibir notificaciones in-app de eventos (M12)
❌ Importar pacientes vía CSV
❌ Subir radiografías al historial
❌ Configurar disponibilidad horaria por doctor
❌ Configurar recordatorios automáticos personalizados
```

---

## 👑 Perfil 4 · SUPERADMIN del SaaS

```
INGRESO
│
└── 🔒 /admin/login  (mismo login que staff)
    └── Si rol == 'superadmin' → redirige a /superadmin

PANEL SAAS
│
├── ✅ /superadmin  (listado de consultorios)
│   ├── ✅ Filtro por estado_compliance
│   ├── ✅ Filtro por país
│   ├── ✅ Suspender / Reactivar consultorio
│   ├── ✅ "+ Nuevo consultorio" → /onboarding
│   └── ❌ Métricas globales del SaaS (MRR, clientes activos, etc.)
│
├── ✅ /superadmin/consultorios/[id]  (detalle)
│   ├── ✅ Información del consultorio
│   ├── ✅ Administradores
│   │   ├── ✅ Listado actual
│   │   └── ✅ "+ Crear admin" inline
│   ├── ✅ Documentos de compliance
│   │   ├── ✅ Ver archivo
│   │   ├── ✅ Aprobar
│   │   └── ✅ Rechazar con observaciones
│   ├── ❌ Editar datos del consultorio
│   ├── ❌ Estadísticas del consultorio (turnos/mes, conversión)
│   └── ❌ Cambiar el país del consultorio
│
├── ✅ /superadmin/audit-log
│   ├── ✅ Filtro por consultorio_id
│   ├── ✅ Filtro por acción
│   ├── ✅ Limit configurable (50/100/500/1000)
│   └── ❌ Export CSV
│
└── ✅ /onboarding  (wizard 5 pasos)
    ├── ✅ Datos del consultorio
    ├── ✅ País
    ├── ✅ Identificación fiscal
    ├── ✅ Contacto
    └── ✅ Resumen + Crear
```

### Lo que un superadmin NO puede hacer todavía

```
❌ Ver dashboard global (MRR, churn, clientes activos por estado)
❌ Editar país / idioma / branding de un consultorio
❌ Migrar paciente entre consultorios
❌ Generar reportes financieros
❌ Configurar precios del SaaS por cliente
❌ Sistema de soporte / tickets
```

---

## 🧪 Plan de testing end-to-end

### Escenario 1 · Paciente nuevo agenda turno

**Perfil:** público
**Tiempo:** 3 min
**Pasos:**

1. Abrir `https://solucionodont.shop` (incógnito o limpiar cookies)
2. Click "Agendar turno gratis"
3. Paso 1: elegir "Limpieza dental"
4. Paso 2 (si aparece): elegir doctor
5. Paso 3: elegir fecha + hora
6. Paso 4: nombre fake "Test Paciente", teléfono `541199998888`, **tildar checkbox privacidad**
7. Click "Confirmar turno" → debería ir a paso 5
8. Verificar en Supabase:
   - `pacientes` → nueva fila con `telefono_enc` y `telefono_hash` (no plano)
   - `turnos` → fila con estado 'solicitado'
   - `consentimientos` → fila con `tipo='tratamiento_datos'`
   - `alarmas` → fila tipo 'nuevo_turno'

**❌ FALLA si:**
- Botón "Confirmar" funciona sin tildar checkbox
- Campos `telefono` o `email` se guardan en plano
- No se crea entrada en `consentimientos`

### Escenario 2 · Paciente entra a sus turnos via OTP

**Perfil:** público → paciente OTP
**Pre-requisito:** Escenario 1 completado

1. Ir a `/mis-turnos`
2. Ingresar el mismo teléfono del Escenario 1
3. Click "Enviar código"
4. Aparece código en pantalla (modo dev) — anotarlo
5. Ingresarlo → "Verificar"
6. Ver listado con el turno
7. Probar "Cancelar turno" en el turno propio
8. Verificar en Supabase: `turnos.estado = 'cancelado'`

### Escenario 3 · Paciente ejerce derecho ARCO

**Perfil:** paciente OTP
**Pre-requisito:** Escenario 2 (logueado)

1. En `/mis-turnos`, scroll abajo y abrir "🛡️ Mis datos personales"
2. Click "📥 Descargar JSON"
3. Verificar que descargó archivo `mis-datos-2026-04-23.json` con toda tu data
4. **NO probar "Eliminar mi cuenta"** con cuenta real (es irreversible)

### Escenario 4 · Admin gestiona turno entrante

**Perfil:** staff admin
**Pre-requisito:** Escenarios 1-2 hechos

1. Login en `/admin/login`
2. Dashboard → ver KPI "Turnos hoy" actualizado
3. Ver el nuevo turno en "Agenda de hoy"
4. Cambiar estado de "solicitado" → "confirmado"
5. Click WhatsApp del turno → debería abrir wa.me con mensaje pre-armado
6. Ir a "Pacientes" → ver al paciente nuevo en la tabla
7. Ir a "CRM" → ver al paciente en columna "Turno agendado"

### Escenario 5 · Admin sube documento compliance

**Perfil:** admin

1. Sidebar → ✅ Compliance
2. Ver el checklist (5 items para AR)
3. En "Matrícula Colegio Odontológico" → drag/drop un PDF de prueba
4. Estado debería cambiar a "Pendiente de revisión"
5. Verificar en Supabase: `documentos_consultorio` con `estado='pendiente_revision'`

### Escenario 6 · Superadmin aprueba documento

**Perfil:** superadmin
**Pre-requisito:** Escenario 5

1. Login como superadmin (rol superadmin) → redirige a `/superadmin`
2. Click en el consultorio
3. Sección Documentos → click "Aprobar" en el documento subido
4. Volver al listado → estado del consultorio cambió a "verificado" si era el último obligatorio
5. Verificar en `audit_log` la entrada del aprobado

### Escenario 7 · Superadmin crea consultorio + admin

**Perfil:** superadmin

1. `/superadmin` → "+ Nuevo consultorio"
2. Wizard 5 pasos: nombre "Clínica Test", país BO, fiscal "12345", contacto
3. Click "Crear consultorio" → success
4. Volver a `/superadmin` → ver "Clínica Test" en listado
5. Click "Ver" → sección Administradores → "+ Crear admin"
6. Email + nombre + password → "Crear administrador"
7. Logout y login con esas credenciales nuevas
8. Debería ir al dashboard con el sidebar mostrando "Clínica Test" arriba (branding dinámico)
9. Sidebar → Compliance → debería ver los 6 docs requeridos para Bolivia

### Escenario 8 · ChatWidget IA contesta

**Perfil:** público

1. Abrir `/` → click burbuja de chat
2. Tipear "Quiero un blanqueamiento, ¿cuánto cuesta?"
3. Esperar respuesta (~3-5 seg)
4. Verificar que la respuesta menciona el rango de precios configurado
5. Verificar en Supabase: `sesiones_agente` y `mensajes_agente` con `consultorio_id` correcto

### Escenario 9 · Cambio de idioma persiste

**Perfil:** público

1. En el home, abrir switcher → cambiar a "English"
2. Verificar que toda la página se traduce
3. Navegar a `/turnos` → debería seguir en EN
4. Cerrar tab y volver a abrir `/` → sigue en EN (cookie `NEXT_LOCALE`)
5. Login admin → idioma debería seguir según user (EN), no resetear

### Escenario 10 · Soft-deletes funcionan

**Perfil:** admin

1. En `/admin/galeria` eliminar un caso
2. Verificar en Supabase: `casos_galeria.aprobado = false` (no DELETE físico)
3. En `/admin/usuarios` desactivar un usuario
4. Verificar: `usuarios.activo = false`

---

## 🚧 Circuitos faltantes (gaps por prioridad)

### 🔴 Críticos (bloquean uso real del sistema)

| Gap | Impacto | Plan |
|---|---|---|
| Editar datos del consultorio desde UI | Admin no puede actualizar dirección/teléfono | Tarea chica (~30 min) |
| Recordatorios 24h automáticos | Admin tiene que correr manual | Cron + endpoint (~1 hora) |
| Templates EN/PT-BR de política privacidad | Si vendés a US/BR está incompleto | Solo traducción del template AR |
| Detalle del paciente | Click en nombre no lleva a perfil completo | Página + endpoint (~2 horas) |

### 🟡 Importantes (faltan features clave del MVP)

| Gap | Módulo | Sesiones |
|---|---|---|
| Notificaciones in-app + Realtime | M12 | 2-3 |
| Historia clínica (UI + endpoints) | M6 | 2-3 |
| Telemedicina (Jitsi + recetas + chat) | M11 | 4-5 |
| Tratamientos (carga, costos, imágenes) | M6 | 1-2 |
| Disponibilidad horaria configurable por doctor | - | 1-2 |
| Importar pacientes vía CSV | - | 1 |

### 🟢 Mejoras (calidad / nice-to-have)

| Gap | Sesiones |
|---|---|
| Streaming respuestas IA | 1 |
| Métricas avanzadas dashboard | 2 |
| Drag & drop real en CRM kanban | 1 |
| Vista mensual en agenda | 1 |
| Export CSV en audit log | 0.5 |
| Editar caso galería existente | 0.5 |
| Diagnóstico digital IA con foto | M2 — 2-3 |

### 🔵 Multi-tenant (Fase 5b pendiente)

| Gap | Impacto |
|---|---|
| RLS multi-tenant en Supabase | Defense in depth (hoy filtrado solo en backend) |
| Selector consultorio en navbar admin | Solo si user tiene varios (multi-sede futuro) |
| Frontend dinámico por subdominio | Para Modelo C automatizado |

### 🟣 Legal / compliance pendientes

| Gap | Para qué cliente |
|---|---|
| Templates EN/PT-BR completos | US/BR |
| Inscripción AAIP automatizada | AR (trámite externo, no se puede automatizar 100%) |
| BAA Anthropic via Bedrock | US (HIPAA) |
| Audit log forzoso en accesos a historial | US (HIPAA Security Rule) |
| Notificación de brecha en 60 días | US (HIPAA Breach Rule) |
| Página /terminos | Todos |

---

## 📊 Estado consolidado por categoría

| Categoría | Estado | % completo |
|---|---|---|
| **Multi-tenant base (M13)** | Fase 5a completa, falta 5b RLS | 90% |
| **i18n** | es/en/pt-BR cubre 100% UI; templates legales 33% (solo ES) | 80% |
| **Encriptación** | Fernet en pacientes/OTPs/notas/email staff | 100% |
| **Compliance UI** | Wizard onboarding + checklist + revisión | 100% |
| **Privacidad/ARCO** | Política + consentimiento + acceso/borrado | 90% (faltan EN/PT) |
| **Booking público** | 5 pasos con todo | 100% |
| **Panel admin** | Dashboard, agenda, pacientes, CRM, usuarios, galería, config | 80% (falta detalle paciente, edit consultorio) |
| **Panel superadmin** | Listado, detalle, admins, audit, onboarding | 90% (falta métricas SaaS) |
| **Agente IA** | Gemini chat público funcional + config por consultorio | 70% (sin streaming, sin Vision) |
| **Notificaciones** | Pendiente M12 | 0% |
| **Telemedicina** | Pendiente M11 | 0% |
| **Historia clínica** | Tablas existen, sin UI ni endpoints | 10% |
| **Tests automatizados** | pytest instalado pero sin tests | 0% |

---

## 🗂️ Endpoints API por categoría

### Públicos (sin auth)
```
GET  /turnos/doctores?tratamiento=X
GET  /turnos/disponibles?fecha=...&tratamiento=...
POST /turnos                              ← requiere consentimiento
GET  /turnos/{id}
GET  /pacientes/buscar?telefono=X
GET  /casos
POST /agente/mensaje
GET  /consultorios/paises
GET  /consultorios/politica-privacidad?consultorio_id=X&idioma=es
POST /auth/otp/enviar
POST /auth/otp/verificar
GET  /health
```

### Paciente (JWT OTP)
```
GET    /auth/mis-turnos
PATCH  /auth/mis-turnos/{id}/cancelar
GET    /auth/mis-datos                    ← ARCO Acceso
DELETE /auth/mi-cuenta                    ← ARCO Olvido
```

### Staff del consultorio (Supabase Auth)
```
POST   /auth/login
GET    /auth/me
POST   /auth/register
GET    /auth/usuarios
PATCH  /auth/usuarios/{id}
PATCH  /auth/usuarios/{id}/password
PATCH  /auth/usuarios/{id}/toggle
GET    /admin/pacientes
PATCH  /admin/pacientes/{id}/estado
GET    /admin/turnos?fecha=X
PATCH  /admin/turnos/{id}
GET    /admin/casos
POST   /admin/casos
PATCH  /admin/casos/{id}
DELETE /admin/casos/{id}
GET    /admin/config-ia
PATCH  /admin/config-ia/{clave}
POST   /admin/seguimiento/ejecutar
PATCH  /admin/alarmas/{id}/resolver
GET    /alarmas
GET    /consultorios/mi-consultorio
GET    /consultorios/mi-consultorio/checklist
POST   /consultorios/mi-consultorio/documentos
```

### Superadmin del SaaS
```
POST   /consultorios/onboarding
GET    /superadmin/consultorios?estado=X&pais=Y
GET    /superadmin/consultorios/{id}
GET    /superadmin/consultorios/{id}/documentos
PATCH  /superadmin/documentos/{id}        ← aprobar/rechazar
PATCH  /superadmin/consultorios/{id}/suspender
PATCH  /superadmin/consultorios/{id}/reactivar
GET    /superadmin/audit-log
```

---

## 🧭 Cómo usar este documento

1. **Al hacer una demo a cliente nuevo**: seguí los Escenarios 1, 2, 4 (paciente + admin) en este orden
2. **Antes de subir a producción un cambio**: corré los 10 Escenarios — toman 30 min
3. **Al planificar próximo módulo**: revisar la sección "Circuitos faltantes" según prioridad
4. **Al evaluar si vender a un cliente nuevo**: revisar "Estado consolidado" y la sección de circuitos faltantes

---

## Ver también

- [docs/deploy-multi-clinica.md](deploy-multi-clinica.md) — playbook de deploy
- [docs/progreso.md](progreso.md) — backlog detallado
- [docs/decisiones.md](decisiones.md) — por qué se eligió cada cosa
- [AGENTS.md](../AGENTS.md) — visión, stack, módulos
