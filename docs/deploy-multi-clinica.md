# Deploy multi-clínica — playbook completo

> Cómo replicar el sistema para vender a nuevos consultorios. Cubre los 3 modelos de deploy (single-tenant, multi-tenant, híbrido) y el paso a paso de cada uno.

**Última actualización:** 2026-04-23 (post M13 Fase 5a)

---

## 📌 TL;DR — para evaluación rápida

Si solo tenés 2 minutos, leé esto.

### Los 3 modelos en 1 línea cada uno

- **A · Single-tenant** → 1 VPS + 1 Supabase **por cada cliente**. Aislamiento total. Caro pero seguro.
- **B · Multi-tenant** → 1 VPS + 1 Supabase **compartido entre todos los clientes**, separados por `consultorio_id`. Barato y escalable.
- **C · Híbrido** → backend compartido + **frontend distinto para cada cliente con su dominio**. Lo mejor de ambos.

### Comparación rápida (con 10 clientes)

| | A · Single | B · Multi | C · Híbrido |
|---|---|---|---|
| **Aislamiento de datos** | Total (DB separada) | Lógico (consultorio_id) | Lógico |
| **Branding/dominio propio** | ✅ | ❌ (mismo dominio) | ✅ |
| **Onboarding cliente nuevo** | 2-4 horas | **10-15 min** | 30-60 min |
| **Costo total/mes (10 clientes)** | USD 60-400 | **USD 48** | USD 48 |
| **Costo por cliente** | USD 6-40 | USD 5 | USD 5 |
| **Apto HIPAA / EE.UU.** | ✅ | ⚠️ | ⚠️ |

### ¿Cuál usar y cuándo?

| Situación | Modelo recomendado |
|---|---|
| Cliente premium con datos sensibles / paranoia | **A** |
| Modelo SaaS estándar, vendés a muchos chicos-medianos | **B** |
| Cliente quiere SU dominio (`clinica-acme.com`) | **C** |
| Cliente en EE.UU. (HIPAA) | **A obligatorio** (+ BAA con vendors) |
| Estás arrancando y solo tenés 1 cliente | **A** (lo que ya tenés en `solucionodont.shop`) |

### Plan de evolución recomendado (sintético)

1. **Hoy** → Modelo A para Soluciones Dentales (ya funciona)
2. **Cliente 2-5** → migrás a Modelo B en infra nueva o agregás al actual
3. **Cliente con branding propio** → C (backend compartido + frontend en Vercel con su dominio)
4. **Cliente EE.UU.** → A obligatorio + BAAs

### El sistema actual ya soporta los 3 modelos

✅ Multi-tenant en código (M13 Fases 1-5a completas)
✅ Onboarding wizard en `/superadmin` (Modelo B/C)
✅ `NEXT_PUBLIC_CONSULTORIO_ID` por deploy de frontend (Modelo C)
✅ Audit log universal
✅ i18n es/en/pt-BR

⏳ Falta: BAA Bedrock para US, RLS multi-tenant en Supabase (Fase 5b)

---

## Índice

1. [Decidir el modelo de deploy](#1-decidir-el-modelo-de-deploy)
2. [Pre-requisitos comunes](#2-pre-requisitos-comunes)
3. [Modelo A · Single-tenant (1 deploy = 1 clínica)](#3-modelo-a--single-tenant-1-deploy--1-clínica)
4. [Modelo B · Multi-tenant (1 infra = N clínicas)](#4-modelo-b--multi-tenant-1-infra--n-clínicas)
5. [Modelo C · Híbrido (backend compartido + frontends por cliente)](#5-modelo-c--híbrido-backend-compartido--frontends-por-cliente)
6. [Configuración por consultorio](#6-configuración-por-consultorio)
7. [Documentos de compliance por país](#7-documentos-de-compliance-por-país)
8. [Variables de entorno completas](#8-variables-de-entorno-completas)
9. [Cron jobs y mantenimiento](#9-cron-jobs-y-mantenimiento)
10. [Costos mensuales aproximados](#10-costos-mensuales-aproximados)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Decidir el modelo de deploy

| Aspecto | A · Single-tenant | B · Multi-tenant | C · Híbrido |
|---|---|---|---|
| **Infra** | 1 VPS + 1 Supabase por cliente | 1 VPS + 1 Supabase compartido | 1 backend + N frontends |
| **Aislamiento** | Total (legal/dato) | Lógico (consultorio_id) | Lógico |
| **Branding** | Total (dominio + look) | Compartido o por subdominio | Total por dominio |
| **Costo/cliente** | ~USD 10-30/mes | ~USD 2-8/mes | ~USD 5-15/mes |
| **Ideal para** | Cliente premium con datos sensibles | Modelo SaaS estándar | Cliente que paga "su propio sitio" pero compartís infra |
| **Onboarding nuevo cliente** | 2-4 horas | 10-15 min via wizard | 1 hora (DNS + Vercel) |
| **HIPAA / EE.UU.** | ✅ Recomendado | ⚠️ Requiere BAA con cada vendor | ⚠️ Idem |

### Cuándo elegir cada uno

- **A · Single-tenant**: cliente paga premium, requiere su propia DB (HIPAA estricto, cliente paranoico, organización grande, regulación sectorial estricta)
- **B · Multi-tenant**: lo más común. Vendés a varios consultorios chicos/medianos, todos comparten infra. Cada uno tiene sus datos aislados por `consultorio_id`. Ya está implementado en el sistema actual.
- **C · Híbrido**: cliente quiere su propio dominio (ej. `clinica-acme.com.ar`) y branding completo, pero vos manejás backend compartido. Ahorra trabajo de mantener N backends.

### Mi recomendación si arrancás

1. **Cliente 1 (vos)**: Modelo A (lo que ya tenés en `solucionodont.shop`)
2. **Cliente 2 a 5**: Modelo B (todos en el mismo VPS + Supabase, distintos `consultorio_id`)
3. **Cliente 6+**: empezás a evaluar Modelo C si quieren branding propio, o splitear en VPS adicional si pasás de cierto volumen

---

## 2. Pre-requisitos comunes

### Cuentas y servicios

- **Supabase** (cuenta gratuita inicial; Pro ~USD 25/mes cuando necesites más)
- **Hostinger u otro VPS** (los planes desde USD 5/mes alcanzan hasta unos 500 turnos/día)
- **GitHub** (repo del proyecto — ya existe en `saadypacheco/solucionesdentales`)
- **Dominio** registrado (para el cliente). Hostinger vende, GoDaddy, NameCheap, etc.
- **Cuenta IA** según el país:
  - **AR/BO**: Gemini API key (gratis hasta cierto cupo)
  - **EE.UU.**: AWS Bedrock (con BAA firmada) para Claude
- **WhatsApp Business** del consultorio (solo número, no API)

### Conocimientos mínimos

- Editar archivos `.env` por SSH
- Pegar SQL en Supabase Dashboard
- Ejecutar `git pull` y `docker compose` en VPS
- Configurar registros DNS A o CNAME

### Tiempo aproximado

| Modelo | Setup inicial | Cliente nuevo |
|---|---|---|
| A | 2-4 horas | 2-4 horas (es lo mismo) |
| B | 2-4 horas (1ra vez) | 10-15 min |
| C | 2-4 horas (1ra vez) | 30-60 min |

---

## 3. Modelo A · Single-tenant (1 deploy = 1 clínica)

Cada cliente tiene su VPS + Supabase. Es lo que ya hicimos para Soluciones Dentales en `solucionodont.shop`.

### 3.1 · Crear proyecto Supabase nuevo

1. [supabase.com](https://supabase.com) → New project
2. Nombre: `nombre-clinica` (ej. `dental-rosario`)
3. Region: la más cercana al cliente (East US para AR/BO funciona bien)
4. Anotar:
   - `Project URL` → será `SUPABASE_URL`
   - `anon public key` → `SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ secreto)

### 3.2 · Aplicar migraciones SQL en orden

En Supabase Dashboard → **SQL Editor** → "+ New query" → pegar y Run, **uno por uno y en orden**:

```
001_base.sql
002_crm_historial.sql
003_agente_galeria_alarmas.sql
004_doctor_especialidades.sql
005_config_ia_defaults.sql
006_fix_rls_recursion.sql
007_rls_public_insert.sql
008_paciente_otps.sql
009_fix_rls_insert_definitivo.sql
010_grants_public_insert.sql
011_usuarios_activo.sql
012_encriptacion.sql
013_paises_consultorios.sql
014_consultorio_id_fk.sql
015_fix_rol_superadmin.sql
016_fix_rls_compliance.sql
017_lock_down_multitenant.sql
```

> ⚠️ Las migraciones tienen que correrse **en este orden exacto**. Si saltás una, las posteriores fallan.

### 3.3 · Crear buckets en Supabase Storage

Sidebar → **Storage** → "+ New bucket":
- `galeria` → **Public** ✅ (fotos antes/después de pacientes)
- `documentos_compliance` → **Private** (sin marcar "Public")

### 3.4 · Crear el VPS

1. Hostinger (u otro) → comprar VPS Linux mínimo 2 GB RAM, 2 vCPU
2. Anotar IP pública
3. Apuntar el dominio al VPS:
   - DNS Manager del dominio → registro A:
     - `@` → IP del VPS
     - `www` → IP del VPS
     - `api` → IP del VPS

### 3.5 · Setup del VPS

```bash
ssh root@<IP-del-VPS>

# Instalar Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker

# Clonar el repo
mkdir -p /docker
cd /docker
git clone https://github.com/saadypacheco/solucionesdentales.git nombre-cliente
cd nombre-cliente
```

### 3.6 · Configurar Traefik (proxy + SSL automático)

Si es el **primer deploy** del VPS, instalar Traefik primero (un solo Traefik por VPS sirve para múltiples proyectos). Ver `docs/deploy-docker.md` para el setup.

Si ya hay Traefik corriendo (mismo VPS), saltear este paso.

### 3.7 · Configurar `backend/.env`

```bash
nano backend/.env
```

```
# Supabase
SUPABASE_URL=https://<el-de-supabase>.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Agente IA
GEMINI_API_KEY=<tu-api-key-de-gemini>

# JWT (cualquier string largo y único)
JWT_SECRET=<algo-largo-y-secreto>

# Producción
ENVIRONMENT=production

# WhatsApp del consultorio (sin + ni espacios)
WA_NUMBER=549XXXXXXXXXX

# Encriptación (generar nuevas para cada deploy)
ENCRYPTION_KEY=<generar con: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())">
HASH_SALT=<generar con: python -c "import secrets; print(secrets.token_urlsafe(32))">

# Backfill de encriptación (true en primer deploy, false después)
RUN_ENCRYPTION_BACKFILL=true
```

⚠️ **Guardá `ENCRYPTION_KEY` y `HASH_SALT` en un password manager fuera del VPS.** Si las perdés, los datos encriptados son irrecuperables.

### 3.8 · Configurar `frontend/.env.local`

```bash
nano frontend/.env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://<el-de-supabase>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_WA_NUMBER=549XXXXXXXXXX
NEXT_PUBLIC_CONSULTORIO_ID=1
API_URL=http://dentales-backend:8000
```

> En modelo A `NEXT_PUBLIC_CONSULTORIO_ID=1` (el único consultorio del deploy).

### 3.9 · Editar `docker-compose.prod.yml` con los dominios del cliente

Reemplazar las URLs:
- `solucionodont.shop` → `dominio-del-cliente.com`
- `api.solucionodont.shop` → `api.dominio-del-cliente.com`

### 3.10 · Build + arrancar

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Esperar ~3-5 minutos. Verificar:
```bash
docker logs dentales-backend --tail 50 | grep -i backfill
curl https://api.dominio-del-cliente.com/health
```

### 3.11 · Crear el primer admin

En Supabase Dashboard → Authentication → Users → "+ Add user":
- Email + password
- Marcar "Auto-confirm email"
- Anotar el UUID

En SQL Editor:
```sql
INSERT INTO usuarios (id, email, nombre, rol, consultorio_id, activo)
VALUES (
  '<UUID>',
  'admin@clinica.com',
  'Dr/a Nombre',
  'admin',
  1,
  true
);
```

Login en `https://dominio-del-cliente.com/admin/login`. Listo.

### 3.12 · Configuración del cliente (que la haga el admin)

Una vez logueado, va a:
- `/admin/usuarios` — crear odontólogos y recepcionistas
- `/admin/configuracion` — system prompt IA, rangos de precios, mensaje recordatorio, número WhatsApp
- `/admin/configuracion/compliance` — subir documentos del país
- `/admin/galeria` — subir casos antes/después

---

## 4. Modelo B · Multi-tenant (1 infra = N clínicas)

**El más eficiente.** Compartís VPS + Supabase entre todos los consultorios. El sistema ya lo soporta (M13).

### 4.1 · Setup inicial (UNA sola vez)

Idéntico a 3.1 a 3.10 del Modelo A, pero al setear `frontend/.env.local`:
```
NEXT_PUBLIC_CONSULTORIO_ID=1   # Por ahora, hasta tener un dominio "saas"
```

Después del primer deploy:

#### Crear un usuario `superadmin` (el "dueño del SaaS" — vos)

```sql
-- En Authentication → Users crear el usuario en Supabase
-- después correr:
UPDATE usuarios SET rol = 'superadmin' WHERE email = 'tu-email@gmail.com';
```

Loguear en `/admin/login` → te lleva a `/superadmin`.

### 4.2 · Cada vez que vendés a un cliente nuevo (10-15 min)

#### Paso 1 · Crear el consultorio desde la UI

1. Login como superadmin → `/superadmin`
2. Click **"+ Nuevo consultorio"**
3. Wizard de 5 pasos:
   - Nombre del consultorio
   - País (AR/BO/US)
   - Identificación fiscal y matrícula del titular
   - Contacto (teléfono, email, WhatsApp)
   - Resumen → Crear

#### Paso 2 · Crear el primer admin del cliente desde la UI

1. En el listado, click **"Ver"** del consultorio recién creado
2. Sección "Administradores del consultorio" → **"+ Crear admin"**
3. Nombre + email + password + rol `admin`
4. Click "Crear administrador"

#### Paso 3 · Le pasás las credenciales al cliente

Le mandás por WhatsApp:
- URL: `https://dominio-del-saas.com/admin/login`
- Email: `el-que-pusiste@cliente.com`
- Password: `la-que-generaste`

#### Paso 4 · El cliente sube documentos compliance

Al loguearse, el cliente va a `/admin/configuracion/compliance` y sube:
- AR: 5 documentos (matrícula colegio, habilitación municipal, CUIT, AAIP, política privacidad)
- BO: 6 documentos (NIT, matrícula CDB, SEDES, licencia municipal, registro sanitario, bioseguridad)
- US: 9 documentos (state license, NPI, malpractice, HIPAA risk, BAAs, etc.)

#### Paso 5 · Vos aprobás los documentos

1. Login superadmin → `/superadmin`
2. Click en el consultorio
3. Sección "Documentos de compliance" → Aprobar/Rechazar cada uno
4. Cuando todos los obligatorios están aprobados → estado pasa a `verificado` automáticamente

#### Paso 6 · Cliente ya puede operar

El admin del cliente:
- Crea su staff en `/admin/usuarios`
- Configura su IA en `/admin/configuracion`
- Sube casos en `/admin/galeria`
- Recibe turnos en `/admin/dashboard`

### 4.3 · Limitación actual

En Modelo B puro, todos los clientes comparten el mismo dominio (ej. `solucionodont.shop`). Los pacientes de la Clínica B usarían `solucionodont.shop/turnos` igual que los de Clínica A — pero verían a los doctores de cada consultorio según el `X-Consultorio-ID` del frontend.

**Esto NO es ideal** porque cada paciente vería siempre los datos del consultorio "default" del frontend (`NEXT_PUBLIC_CONSULTORIO_ID=1`).

➜ Para que cada cliente tenga su propia "puerta de entrada" pública, usar **Modelo C** (siguiente sección).

---

## 5. Modelo C · Híbrido (backend compartido + frontends por cliente)

Lo más práctico cuando cada cliente quiere SU dominio para sus pacientes pero vos no querés mantener N backends.

### 5.1 · Setup inicial

Igual que 4.1 — ya tenés un backend multi-tenant corriendo.

### 5.2 · Para cada cliente nuevo

#### Paso A · Crear el consultorio (igual a 4.2 paso 1-2)

#### Paso B · Anotar el `consultorio_id` que se generó

En `/superadmin` lo ves en el listado.

#### Paso C · Deployar un frontend nuevo solo para ese cliente

**Opción C.1 · Vercel** (recomendado, gratis hasta cierto tráfico):

1. En Vercel: importar el repo `saadypacheco/solucionesdentales`
2. **Root directory**: `frontend`
3. **Environment variables**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=<el-mismo-de-siempre>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<el-mismo-de-siempre>
   NEXT_PUBLIC_WA_NUMBER=<WA-del-cliente-nuevo>
   NEXT_PUBLIC_CONSULTORIO_ID=<el-id-del-paso-B>
   API_URL=https://api.dominio-del-saas.com
   ```
4. Deploy
5. Configurar dominio personalizado del cliente (ej. `clinica-x.com`)

**Opción C.2 · Otro container Docker en el VPS**:

```bash
cd /docker
git clone https://github.com/saadypacheco/solucionesdentales.git frontend-clinica-x
cd frontend-clinica-x

# Editar frontend/.env.local con NEXT_PUBLIC_CONSULTORIO_ID=<id>
# Crear docker-compose.prod.yml solo con dentales-frontend
# Cambiar el container_name (no puede repetirse)
# Cambiar Traefik labels al dominio del cliente
docker compose -f docker-compose.prod.yml up -d --build
```

#### Paso D · DNS del cliente

Configurar DNS del dominio del cliente:
- Vercel: registro CNAME hacia el dominio que te da Vercel
- Docker en VPS: registro A hacia la IP del VPS

#### Paso E · Crear admin del cliente y entregar credenciales

Igual que en Modelo B (4.2 pasos 2-3).

---

## 6. Configuración por consultorio

Una vez que el admin del consultorio entra a `/admin`, configura:

### 6.1 · Datos del consultorio

`/admin` (al entrar como admin) — el sidebar muestra el nombre del consultorio. Para editar nombre, dirección, contacto, hoy hay que hacerlo en Supabase SQL Editor:

```sql
UPDATE consultorios SET
  nombre = 'Clínica X',
  direccion = '...',
  telefono = '...',
  wa_numero = '5491112345678'
WHERE id = <id>;
```

> 🔧 **Pendiente**: agregar UI para editar datos del consultorio desde `/admin/configuracion`.

### 6.2 · IA (sistema prompt + precios)

`/admin/configuracion` — sección "Personalidad del agente" y "Rangos de precios".

Ejemplo de system prompt para una clínica de ortodoncia:
```
Sos la asistente virtual de Ortodoncia Sonrisas en Buenos Aires.
Especialidad: brackets metálicos, alineadores invisibles, ortodoncia infantil.
Lunes a sábados de 9 a 18hs.
Cuando el paciente pregunte por un tratamiento, mencioná los rangos de
precios que tenés configurados. Si pregunta por urgencias, derivá al
WhatsApp del consultorio.
```

### 6.3 · Galería de casos

`/admin/galeria` → "Subir caso" → fotos antes/después + descripción.

### 6.4 · Compliance

`/admin/configuracion/compliance` → subir documentos requeridos según el país del consultorio.

### 6.5 · Idioma

Se aplica automáticamente según el país del consultorio en cada login. El staff puede overridearlo desde el switcher de idioma.

---

## 7. Documentos de compliance por país

Lista que ven los admins en su checklist:

### 🇦🇷 Argentina (5 docs)
1. Matrícula del Colegio Odontológico (vigente)
2. Habilitación Municipal del consultorio
3. CUIT (constancia AFIP)
4. Inscripción de base de datos en AAIP (Ley 25.326)
5. Política de Privacidad publicada

### 🇧🇴 Bolivia (6 docs)
1. NIT (Número Identificación Tributaria)
2. Matrícula del Colegio de Odontólogos de Bolivia
3. Autorización SEDES
4. Licencia de funcionamiento municipal
5. Registro sanitario del establecimiento
6. Certificado de bioseguridad

### 🇺🇸 Estados Unidos (9 docs — HIPAA)
1. State Dental License
2. NPI Number
3. State Business Registration
4. Malpractice Insurance
5. HIPAA Risk Assessment (anual)
6. BAA firmado con Supabase
7. BAA firmado con Vercel (si aplica)
8. Notice of Privacy Practices publicado
9. Breach Notification Procedure documentado

> ⚠️ **Para US**: además de los docs, hay que usar Claude vía AWS Bedrock (con BAA firmado) en lugar de Gemini directo. Esto **todavía no está implementado** en el código — pendiente cuando vendas el primer cliente US.

---

## 8. Variables de entorno completas

### Backend (`backend/.env`)

| Variable | Obligatoria | Descripción |
|---|---|---|
| `SUPABASE_URL` | ✅ | URL del proyecto |
| `SUPABASE_ANON_KEY` | ✅ | Clave anon (no secret) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ⚠️ secret, bypasea RLS |
| `GEMINI_API_KEY` | ⚠️ | Sin esto el agente IA devuelve fallback |
| `JWT_SECRET` | ✅ | Para tokens OTP de pacientes |
| `ENVIRONMENT` | ✅ | `production` oculta `codigo_dev` |
| `WA_NUMBER` | ✅ | Default si el consultorio no tiene `wa_numero` configurado |
| `ENCRYPTION_KEY` | ✅ | ⚠️ Si se pierde, datos perdidos |
| `HASH_SALT` | ✅ | Para hashes determinísticos de búsqueda |
| `RUN_ENCRYPTION_BACKFILL` | opcional | `true` en primer deploy |

### Frontend (`frontend/.env.local`)

| Variable | Obligatoria | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Mismo URL del backend |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Misma anon key |
| `NEXT_PUBLIC_WA_NUMBER` | ✅ | WhatsApp para botón "Urgencias" |
| `NEXT_PUBLIC_CONSULTORIO_ID` | ✅ | ID del consultorio para endpoints públicos |
| `API_URL` | ✅ | URL del backend (server-side) |

---

## 9. Cron jobs y mantenimiento

### 9.1 · Backups Supabase

Supabase Free tiene backups diarios automáticos, retención 1 día.
Para retención mayor → upgrade a Pro (USD 25/mes incluye 7 días de retención).

### 9.2 · Renovación SSL

Si usás Traefik con Let's Encrypt → automático cada 60 días.
Si usás Vercel → automático.

### 9.3 · Seguimiento automático (alarmas)

El admin del consultorio puede correrlo manualmente desde `/admin/configuracion` → "Ejecutar ahora".

Para automatizar, agregar en el cron del VPS:
```bash
0 9 * * * curl -X POST https://api.dominio.com/admin/seguimiento/ejecutar -H "Authorization: Bearer <token>"
```

> 🔧 **Pendiente**: cron job real (sin token manual). Está en el backlog (recordatorios 24h).

### 9.4 · Backfill de encriptación (solo 1 vez al deployar)

Después del primer arranque exitoso, en `backend/.env`:
```
RUN_ENCRYPTION_BACKFILL=false
```
Y reiniciar:
```bash
docker compose -f docker-compose.prod.yml restart dentales-backend
```

---

## 10. Costos mensuales aproximados

### Modelo A · Single-tenant (1 cliente)
- VPS Hostinger (2 GB / 2 vCPU): **USD 5-10**
- Supabase Free: **USD 0** (suficiente hasta ~500 turnos/día)
- Supabase Pro (cuando crezca): **USD 25**
- Dominio: **USD 1** (USD 12/año)
- Gemini API: **USD 0-5** (cupo gratis amplio)
- **Total: USD 6-40/mes por cliente**

### Modelo B · Multi-tenant (N clientes en 1 infra)
- VPS Hostinger 4 GB: **USD 12** (alcanza para ~10 clientes activos)
- Supabase Pro: **USD 25** (1 proyecto compartido)
- Dominios: **USD 1 por cliente**
- Gemini: **USD 0-15**
- **Total fijo: USD 38/mes** + USD 1 por cliente

➜ Con 10 clientes: USD 48 / 10 = **USD 5/cliente** vs USD 6-40 del Modelo A. **8x más barato.**

### Modelo C · Híbrido
- Mismo backend que B
- Cada frontend en Vercel free: **USD 0** (hasta 100 GB bandwidth/mes)
- Dominios: **USD 1 por cliente**
- **Total: USD 38 fijo + USD 1 por cliente**

---

## 11. Troubleshooting

### "Error 500 al crear turno desde el frontend"

Verificar que el frontend esté mandando `X-Consultorio-ID`. En DevTools → Network → request a `/api/proxy/turnos` → headers → debería ver `X-Consultorio-ID: 1` (o el id que corresponde).

Si no aparece, revisar `NEXT_PUBLIC_CONSULTORIO_ID` en el `.env.local` y rebuild del frontend.

### "violates row-level security policy"

Alguna tabla tiene RLS activo sin policy. Solución temporal:
```sql
ALTER TABLE <tabla> DISABLE ROW LEVEL SECURITY;
```

(Ver migración `016_fix_rls_compliance.sql` para el caso de las tablas de compliance.)

### "consultorio_id violates not-null constraint"

Algún INSERT no está seteando `consultorio_id`. Después de M13 Fase 5a (migración 017), todas las inserts deben pasarlo. Revisar el código del endpoint que falla.

### "Server disconnected" / `httpx.RemoteProtocolError`

Cliente Supabase idle. Ya implementado auto-reconnect en `db/client.py` (commit `b22a864`). Si sigue, restart:
```bash
docker compose -f docker-compose.prod.yml restart dentales-backend
```

### Login OK pero rebota al login

Frontend cacheado o no rebuildeado. **Ctrl+Shift+R** + verificar que el container del frontend esté `Up X minutes` (no horas).

### "permission denied" en SSH

Usar el Browser Terminal del panel de Hostinger en vez de PowerShell local. Ver `docs/deploy-docker.md`.

---

## 12. Próximos pasos del producto (para cuando vendas)

Lo que **todavía falta implementar** y que tus clientes probablemente pidan:

| Feature | Estado | Prioridad |
|---|---|---|
| Telemedicina (Jitsi + recetas + chat) | Pendiente M11 | Alta |
| Notificaciones in-app + Realtime | Pendiente M12 | Alta |
| Historia clínica completa | Pendiente M6 | Alta |
| Recordatorios WhatsApp 24h automáticos | Pendiente | Media |
| Política de privacidad + consentimiento ARCO | Pendiente | Alta legal |
| Diagnóstico digital IA (Vision) | Pendiente M2 | Baja |
| Métricas avanzadas | Pendiente | Baja |
| Streaming chat IA | Pendiente | Baja |
| RLS multi-tenant en Supabase | Pendiente Fase 5b | Media (seguridad) |
| Editar datos del consultorio desde UI | Pendiente | Chica |
| Cron automático de seguimiento | Pendiente | Chica |
| Backend AWS Bedrock para US | Pendiente | Solo si vendés US |

Ver [docs/progreso.md](progreso.md) para el detalle completo del backlog.

---

## 🗺️ Recomendación de evolución (plan de acción)

Esta es mi sugerencia de cómo crecer el negocio paso a paso. Cada paso aprovecha la inversión del anterior.

### Etapa 0 · HOY (1 cliente)
**Modelo A** funcionando en `solucionodont.shop`. Soluciones Dentales = consultorio_id `1`. No tocar nada.

### Etapa 1 · Primer cliente externo (consultorios 2 y 3)

**Recomendación: Modelo B** sobre la infra existente.

**Por qué:** ya tenés VPS + Supabase. Agregar consultorio nuevo cuesta 10-15 min vía wizard. Ahorrás VPS y Supabase de USD 35/mes por cada cliente que sumás.

**Pasos:**
1. Login como superadmin → `/superadmin` → "+ Nuevo consultorio"
2. Crear admin del cliente
3. Pasar credenciales
4. Cliente sube docs compliance, vos aprobás

**Limitación:** todos comparten el dominio `solucionodont.shop`. Si los clientes no necesitan dominio propio, está OK.

### Etapa 2 · Cliente quiere SU dominio (a partir del 4to o 5to cliente)

**Recomendación: Modelo C** para ese cliente puntual, los anteriores siguen en B.

**Por qué:** algunos clientes pagan más por marca propia. Vos solo agregás 1 frontend en Vercel (gratis hasta cierto tráfico).

**Pasos:**
1. Crear consultorio en `/superadmin` (igual que B)
2. Importar repo en Vercel, root directory `frontend`
3. Setear env `NEXT_PUBLIC_CONSULTORIO_ID=<id>` + dominio
4. Apuntar DNS

### Etapa 3 · Tope de la infra compartida (~10-15 clientes activos)

Cuando el VPS de 4 GB empieza a quedar chico:

**Opciones:**
- **3.A** Upgrade a VPS de 8 GB (~USD 25/mes) → soporta hasta ~30 clientes
- **3.B** Splittear en 2 VPS por geografía (uno para AR/BO, otro para US)
- **3.C** Migrar Supabase a tier Pro (USD 25/mes) si fue lo que se saturó

### Etapa 4 · Vender en EE.UU.

**Recomendación: Modelo A** para cada cliente US (HIPAA).

**Por qué:** HIPAA exige BAAs y auditoría estricta. Más simple cumplir con DB separada por cliente.

**Trabajo previo (1 vez):**
1. Firmar BAA con Anthropic (vía AWS Bedrock o Vertex AI)
2. Implementar adapter en `services/agente.py` para usar Claude vía Bedrock cuando `pais.modelo_ia_default = claude-sonnet-4-6`
3. Firmar BAA con Vercel + Supabase (planes específicos)
4. Agregar audit log forzoso (ya tenés `services/audit.py`)

**Por cliente US:**
- Repetir el setup de Modelo A
- Cobrar USD 200-500/mes (premium HIPAA)

### Etapa 5 · Producto maduro (50+ clientes)

A esta altura conviene:
- **Sumar features que faltan**: M11 Telemedicina, M12 Notificaciones, M6 Historia clínica
- **Equipo**: contratar 1 dev backend + 1 ops part-time
- **Soporte**: chat o email del cliente con SLA
- **Métricas**: dashboard de salud del SaaS (latencia, errors, MRR)

---

## ✅ Checklist mental antes de vender

Cuando aparezca un prospecto interesado, chequeá:

- [ ] ¿Es AR/BO? → Modelo B (más barato, ya implementado)
- [ ] ¿Es US? → Modelo A + BAAs (más trabajo, cobrá más)
- [ ] ¿Quiere su dominio? → Modelo C (sumá USD 5-10/mes al precio)
- [ ] ¿Necesita telemedicina? → Avisar que está en roadmap (M11)
- [ ] ¿Tiene pacientes existentes? → Importación manual o vía CSV (no implementado)
- [ ] ¿Quién mantiene el VPS? → Si es vos, sumar 1-2 hs/mes al pricing
- [ ] ¿Cobrás setup inicial o solo recurrente? → Recomiendo USD 200-500 setup + USD 50-200/mes
