# Docker Deployment — Setup en Hostinger

## Qué es

Despliegue completo de frontend + backend en Docker dentro del mismo VPS de Hostinger.

**Ventajas:**
- Sin Traefik, routing simple
- Sin problemas de Mixed Content
- Setup ~24 horas
- Una sola factura (VPS Hostinger)
- Fácil de actualizar (`git pull` + `docker compose up -d --build`)

---

## Arquitectura

```
Internet
  │
  ├─ http://[IP]:3000  → Next.js Frontend
  └─ http://[IP]:8001  → FastAPI Backend
```

Ambos contenedores corren en el mismo VPS, comunicándose por puerto interno (8000 del backend).

---

## Archivos involucrados

### Docker
- `frontend/Dockerfile` — Multi-stage Next.js build
- `frontend/.dockerignore` — Qué NO incluir en la imagen
- `backend/Dockerfile` — Python FastAPI image
- `docker-compose.prod.yml` — Orquestación de contenedores

### Configuración
- `backend/.env` — Variables de producción (no versionado)
- `frontend/.env.local` — Variables de desarrollo (no versionado en prod)

### Documentación
- `docs/deploy-docker.md` — Guía step-by-step para Hostinger

---

## Paso 1: Preparar el frontend

### `frontend/Dockerfile`

```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./
RUN npm ci

# Copiar código fuente
COPY . .

# Build args (reemplazados en tiempo de build)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_WA_NUMBER
ARG API_URL

# Build Next.js
RUN npm run build

# Stage 2: Runtime
FROM node:18-alpine

WORKDIR /app

# Solo dependencias de producción
COPY package*.json ./
RUN npm ci --only=production

# Copiar .next del builder
COPY --from=builder /app/.next ./.next

EXPOSE 3000

CMD ["npm", "start"]
```

**Key points:**
- Multi-stage: Build stage es grande; runtime stage es pequeño
- ARGs: Variables que se pasan en tiempo de build
- EXPOSE 3000: Qué puerto escucha el contenedor
- CMD: Comando que inicia el servidor

### `frontend/.dockerignore`

```
node_modules
npm-debug.log
.next
.git
.gitignore
README.md
.env.local
.env.*.local
```

Reduce el tamaño de la imagen al no copiar archivos innecesarios.

---

## Paso 2: Preparar el backend

### `backend/Dockerfile`

Si no existe, crear:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código
COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Paso 3: Docker Compose

### `docker-compose.prod.yml`

```yaml
version: "3.9"

services:
  dentales-frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}
        NEXT_PUBLIC_WA_NUMBER: ${NEXT_PUBLIC_WA_NUMBER}
        API_URL: ${API_URL}
    container_name: dentales-frontend
    ports:
      - "3000:3000"
    restart: unless-stopped
    depends_on:
      - dentales-backend

  dentales-backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: dentales-backend
    ports:
      - "8001:8000"
    env_file:
      - ./backend/.env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

**Explicación:**
- `build context`: Dónde buscar el Dockerfile y archivos
- `args`: Variables para pasar al Dockerfile (frontend)
- `env_file`: Archivo .env para variables (backend)
- `ports`: "HOST:CONTAINER" — mapea puerto 8001 (VPS) → 8000 (contenedor)
- `depends_on`: Frontend espera a backend antes de iniciar
- `healthcheck`: Verifica cada 30s que el backend está vivo

---

## Paso 4: Construir imágenes

En el VPS, desde el raíz del proyecto:

```bash
docker compose -f docker-compose.prod.yml --env-file backend/.env build
```

Esto:
1. Lee `docker-compose.prod.yml`
2. Lee variables de `backend/.env`
3. Construye ambas imágenes localmente
4. No inicia aún los contenedores

**Tiempo:** ~5 minutos (la primera vez descarga node:18 y python:3.11)

---

## Paso 5: Iniciar contenedores

```bash
docker compose -f docker-compose.prod.yml --env-file backend/.env up -d --build
```

Flags:
- `-d`: Detach (corre en background)
- `--build`: Rebuild si hay cambios

```bash
# Ver que están corriendo
docker compose -f docker-compose.prod.yml ps

# Output:
# NAME                   COMMAND                  SERVICE             STATUS
# dentales-frontend      "npm start"              dentales-frontend   Up 2 minutes
# dentales-backend       "uvicorn app.main:..."   dentales-backend    Up 2 minutes
```

---

## Paso 6: Verificar healthcheck

```bash
# Backend debe responder con 200
curl http://localhost:8001/health

# Frontend debe responder
curl -I http://localhost:3000
# HTTP/1.1 200 OK
```

---

## Paso 7: Ver logs

```bash
# Ver logs del backend
docker compose -f docker-compose.prod.yml logs dentales-backend

# Ver logs del frontend
docker compose -f docker-compose.prod.yml logs dentales-frontend

# Logs en vivo (-f = follow)
docker compose -f docker-compose.prod.yml logs -f

# Entrar a un contenedor
docker exec -it dentales-backend sh
# Luego:
# root@xxx:# curl localhost:8000/health
# root@xxx:# env | grep SUPABASE
```

---

## Paso 8: Firewall

En dashboard Hostinger → VPS → Firewall:

| Puerto | Proto | Estado |
|--------|-------|--------|
| 3000 | TCP | ✅ Abrir |
| 8001 | TCP | ✅ Abrir |
| 443 | TCP | ⏳ Luego (HTTPS) |

---

## Paso 9: Actualizar código

```bash
cd /root/solucionesdentales

# Traer cambios
git pull origin main

# Rebuild + restart
docker compose -f docker-compose.prod.yml --env-file backend/.env up -d --build

# Verificar
docker compose -f docker-compose.prod.yml ps
curl http://localhost:8001/health
```

---

## Monitorear con cron

```bash
# Agregar a crontab (crontab -e)
*/5 * * * * curl -f http://localhost:8001/health || systemctl restart docker

# O con email de alerta:
*/5 * * * * curl -f http://localhost:8001/health || {
  echo "Backend down!" | mail -s "Alert" admin@clinica.com
  systemctl restart docker
}
```

---

## HTTPS futuro (Nginx + Certbot)

Cuando necesites HTTPS:

```bash
# 1. Instalar Nginx
sudo apt-get install nginx certbot python3-certbot-nginx

# 2. Crear config
sudo nano /etc/nginx/sites-available/dentales
# (Ver docs/deploy-docker.md para config)

sudo ln -s /etc/nginx/sites-available/dentales /etc/nginx/sites-enabled/

# 3. Generar cert
sudo certbot --nginx -d api.solucionodont.shop -d solucionodont.shop

# 4. Reload Nginx
sudo systemctl reload nginx
```

Nginx proxy:
```nginx
upstream backend {
    server localhost:8001;
}

upstream frontend {
    server localhost:3000;
}

server {
    listen 443 ssl;
    server_name api.solucionodont.shop;
    
    ssl_certificate /etc/letsencrypt/live/api.solucionodont.shop/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.solucionodont.shop/privkey.pem;
    
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
    }
}

server {
    listen 443 ssl;
    server_name solucionodont.shop;
    
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
    }
}
```

---

## Rollback rápido

Si algo falla:

```bash
# Ver qué pasó
docker compose -f docker-compose.prod.yml logs --tail 100 dentales-backend

# Detener todo
docker compose -f docker-compose.prod.yml down

# Volver atrás
git reset --hard HEAD~1
git pull origin main

# Reintentar
docker compose -f docker-compose.prod.yml --env-file backend/.env up -d --build

# Verificar
sleep 5
curl http://localhost:8001/health
```

---

## Troubleshooting

**Error: "Cannot connect to Docker daemon"**
→ Docker no está corriendo. `systemctl restart docker`

**Error: "cannot open shared object file: No such file or directory"**
→ Falta dependencia del sistema. Agregar a RUN apt-get install en Dockerfile.

**Error: "Module not found: app.main"**
→ Path incorrecto. Verificar que `app/main.py` existe y estructura de carpetas.

**Frontend no carga**
→ Verificar que NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY están en docker-compose.prod.yml.

**Backend responde 502**
→ Backend no inició correctamente. Ver logs: `docker compose logs dentales-backend`.

**Puerto 8001 ya en uso**
→ Cambiar en docker-compose.prod.yml: `- "8002:8000"` (ej).

---

## Performance

Por defecto, Docker limita a 512MB RAM. Para producción:

```yaml
services:
  dentales-backend:
    # ... resto de config
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

---

## Ver también

- [`docs/deploy-docker.md`](../docs/deploy-docker.md) — Guía completa Hostinger
- `docker-compose.prod.yml` — Archivo actual
- `frontend/Dockerfile` — Dockerfile del frontend
- `backend/Dockerfile` — Dockerfile del backend

