# Deploy con Docker en Hostinger

> Arquitectura simplificada: Frontend + Backend en Docker en el mismo VPS

---

## Arquitectura

```
Internet
  │
  ├─ http://[IP]:3000  → Frontend (Next.js en contenedor)
  └─ http://[IP]:8001  → Backend (FastAPI en contenedor)
       └─ puerto 8000 interno
```

**Ventajas:**
- Sin Traefik ni complejidad de routing
- Sin problemas de Mixed Content (ambos en HTTP o ambos en HTTPS)
- Setup 24h completo sin certificados SSL intermedios
- Single VPS, una factura, menos overhead

---

## 1. Clonar el repo en el VPS

```bash
cd /root
git clone https://github.com/saadypacheco/solucionesdentales.git
cd solucionesdentales
git pull origin main
```

---

## 2. Preparar las variables de entorno

### Backend `.env`

```bash
cat > backend/.env <<'EOF'
SUPABASE_URL=https://kffpjtbjxzdwyiqtdtcn.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=tu-jwt-secret-cambiar-en-produccion
WA_NUMBER=5491112345678
ENVIRONMENT=production
GEMINI_API_KEY=
EOF
chmod 600 backend/.env
```

**Variables críticas:**
- `SUPABASE_SERVICE_ROLE_KEY`: Obtener del dashboard Supabase (Project Settings → API Keys)
- `JWT_SECRET`: Generar algo seguro, ej: `openssl rand -base64 32`
- `WA_NUMBER`: Número WhatsApp del consultorio con código país
- `ENVIRONMENT=production`: Oculta el código OTP en respuestas

### Frontend — Vercel

En el dashboard de Vercel, agregar variables de entorno para el proyecto:

```
NEXT_PUBLIC_SUPABASE_URL=https://kffpjtbjxzdwyiqtdtcn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_WA_NUMBER=5491112345678
API_URL=http://[IP-VPS]:8001          # ← Server-side only, NO NEXT_PUBLIC_
```

**Nota:** `API_URL` NO debe tener `NEXT_PUBLIC_` porque es para el servidor de Next.js, no para el navegador.

---

## 3. Construir y levantar los contenedores

```bash
# Desde el raíz del proyecto
docker compose -f docker-compose.prod.yml \
  --env-file backend/.env \
  down  # Si hay contenedores previos

docker compose -f docker-compose.prod.yml \
  --env-file backend/.env \
  up -d --build
```

**Esperar ~2 minutos** a que los contenedores inicie y las dependencias se descarguen.

---

## 4. Verificar que está corriendo

### Backend

```bash
# Debe responder con {"status":"ok"} o similar
curl http://localhost:8001/health

# Output esperado:
# {"status":"healthy"}
```

### Frontend

```bash
# Debe devolver el HTML de la página inicial
curl -I http://localhost:3000
```

---

## 5. Abrir puertos en el firewall (Hostinger)

En el panel de Hostinger → VPS → Firewall:

| Puerto | Protocolo | Permitir |
|--------|-----------|----------|
| 3000   | TCP       | ✅       |
| 8001   | TCP       | ✅       |
| 443    | TCP       | ✅ (futuro: HTTPS) |

---

## 6. Configurar DNS (opcional)

Si tenés un dominio (ej: `solucionodont.shop`):

```
A record:
  solucionodont.shop  → [IP-VPS]
  api.solucionodont.shop → [IP-VPS]  (opcional si usás IP)
```

Luego:
```bash
# Frontend en Vercel debe tener en Settings → Environment:
API_URL=http://api.solucionodont.shop:8001  # O usar IP

# O en el .env.local local:
API_URL=http://localhost:8001  # Para desarrollo
```

---

## 7. HTTPS (Certbot + Nginx en el futuro)

Por ahora funciona con HTTP. Para HTTPS:

```bash
# 1. Instalar Nginx como reverse proxy
sudo apt-get install nginx certbot python3-certbot-nginx

# 2. Crear config para Nginx
sudo cp nginx/dentales.conf /etc/nginx/sites-available/dentales
sudo ln -s /etc/nginx/sites-available/dentales /etc/nginx/sites-enabled/

# 3. Generar certificado SSL
sudo certbot --nginx -d api.solucionodont.shop

# 4. Reload Nginx
sudo systemctl reload nginx
```

---

## 8. Logs y troubleshooting

```bash
# Ver logs del frontend
docker compose -f docker-compose.prod.yml logs dentales-frontend

# Ver logs del backend
docker compose -f docker-compose.prod.yml logs dentales-backend

# Ver logs en vivo
docker compose -f docker-compose.prod.yml logs -f

# Entrar a un contenedor
docker exec -it dentales-backend sh
```

---

## 9. Actualizar el código (git pull + redeploy)

```bash
cd /root/solucionesdentales
git pull origin main

# Rebuild y restart
docker compose -f docker-compose.prod.yml \
  --env-file backend/.env \
  up -d --build
```

---

## 10. Monitorear el uptime

Opción A: Cron job para healthcheck

```bash
# Agregar a crontab (crontab -e)
*/5 * * * * curl -f http://localhost:8001/health || systemctl restart docker
```

Opción B: Uptime monitoring externo

```bash
# Usar servicio como UptimeRobot, Pingdom, etc.
# Configurar URL: http://[IP]:8001/health
```

---

## Checklist

- [ ] `.env` del backend completado y restringido (chmod 600)
- [ ] Variables de entorno en Vercel configuradas (incluyendo `API_URL`)
- [ ] `docker compose build` sin errores
- [ ] `docker compose up -d` sin errores
- [ ] `curl http://localhost:8001/health` → responde OK
- [ ] `curl -I http://localhost:3000` → responde 200
- [ ] Puertos 3000, 8001 abiertos en firewall
- [ ] Probar flujo completo: Agendar turno en `/turnos` → Ver en `/admin`
- [ ] Verificar `/software` landing page carga sin errores

---

## Rollback rápido

Si algo sale mal:

```bash
# Detener todo
docker compose -f docker-compose.prod.yml down

# Volver al commit anterior
git reset --hard HEAD~1

# Reintentar
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Preguntas frecuentes

**P: ¿Debo usar `127.0.0.1:8001` o la IP pública?**
A: Para el frontend (Vercel), usar la IP pública o dominio. Localmente usa `localhost:8001`.

**P: ¿El frontend en Vercel puede alcanzar el backend en Hostinger?**
A: Sí, siempre que el puerto 8001 esté abierto en el firewall del VPS.

**P: ¿Y si uso un dominio pero sin certificado SSL?**
A: Funciona con `http://`. Luego agregás Certbot para HTTPS cuando lo necesites.

**P: ¿Puedo cambiar el puerto 8001?**
A: Sí, en `docker-compose.prod.yml` línea 25: `- "8001:8000"` → `- "8002:8000"` (ejemplo).

---

## Soporte

Ver `docs/progreso.md` para el estado actual del proyecto.
