# Guía de producción — Soluciones Dentales

## Arquitectura

```
Internet
  │
  ├─ solucionesdentales.com  → Vercel (frontend Next.js)
  └─ api.solucionesdentales.com → VPS Hostinger
       └─ nginx (443) → localhost:8001
            └─ Docker: dentales-backend
```

---

## Setup inicial en el VPS (una sola vez)

### 1. Clonar el repo

```bash
cd /var/www
git clone https://github.com/saadypacheco/solucionesdentales.git
cd solucionesdentales
```

### 2. Crear el .env de producción

```bash
cp backend/.env backend/.env.prod
nano backend/.env
# Completar con las keys reales de producción
```

### 3. Primer deploy

```bash
bash deploy.sh
```

### 4. Configurar nginx

```bash
# Copiar config
sudo cp nginx/dentales.conf /etc/nginx/sites-available/dentales-api
sudo ln -s /etc/nginx/sites-available/dentales-api /etc/nginx/sites-enabled/

# Verificar sintaxis
sudo nginx -t

# Recargar nginx
sudo systemctl reload nginx
```

### 5. SSL con Certbot

```bash
sudo certbot --nginx -d api.solucionesdentales.com
```

---

## GitHub Actions — Secrets necesarios

Ir a: GitHub → solucionesdentales → Settings → Secrets → Actions

| Secret | Valor |
|--------|-------|
| `VPS_HOST` | IP del VPS (ej: 185.x.x.x) |
| `VPS_USER` | Usuario SSH (ej: root o ubuntu) |
| `VPS_SSH_KEY` | Contenido de la clave privada SSH (`~/.ssh/id_rsa`) |

---

## Frontend en Vercel

1. Ir a vercel.com → Import Project → GitHub → `solucionesdentales`
2. Root directory: `frontend`
3. Environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=https://api.solucionesdentales.com
NEXT_PUBLIC_WA_NUMBER=5491100000000
```

4. Deploy automático en cada push a `main` (Vercel lo configura solo).

---

## Workflow de trabajo diario

```
Local                     Git                     Producción
──────                    ───                     ──────────
editar código
  │
  ├─ npm run dev          # verificar local
  ├─ uvicorn ... --reload # backend local
  │
  └─ git add + commit
       └─ git push → main
            ├─ Vercel detecta cambios frontend → build + deploy automático
            └─ GitHub Actions detecta cambios backend → SSH al VPS → bash deploy.sh
```

---

## Comandos útiles en el VPS

```bash
# Ver logs del backend
docker compose -f docker-compose.prod.yml logs dentales-backend -f

# Reiniciar sin rebuild
docker compose -f docker-compose.prod.yml restart dentales-backend

# Ver estado
docker ps | grep dentales

# Hacer deploy manual
bash deploy.sh
```

---

## Puertos en el VPS

| Servicio | Puerto interno | Puerto externo |
|----------|---------------|----------------|
| tienda-backend | 8000 | 8000 |
| dentales-backend | 8000 | **8001** |
