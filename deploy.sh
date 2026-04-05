#!/bin/bash
# deploy.sh — Script de deploy en el VPS
# Uso: bash deploy.sh
# Ejecutar desde: /var/www/solucionesdentales  (o donde esté el repo en el VPS)

set -e  # Salir ante cualquier error

echo "🦷 Deploy — Soluciones Dentales Backend"
echo "======================================="

# 1. Actualizar código
echo "📥 Pulling latest code..."
git pull origin main

# 2. Rebuild y restart del contenedor
echo "🐳 Rebuilding Docker container..."
docker compose -f docker-compose.prod.yml up -d --build dentales-backend

# 3. Esperar que el healthcheck pase
echo "⏳ Waiting for healthcheck..."
sleep 5

# 4. Verificar que está corriendo
STATUS=$(docker inspect --format='{{.State.Health.Status}}' dentales-backend 2>/dev/null || echo "unknown")
echo "📊 Container status: $STATUS"

# 5. Test rápido del endpoint
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/health)
if [ "$RESPONSE" = "200" ]; then
    echo "✅ Deploy exitoso — API respondiendo en :8001"
else
    echo "❌ Error: API no responde (HTTP $RESPONSE)"
    docker compose -f docker-compose.prod.yml logs dentales-backend --tail 20
    exit 1
fi

echo ""
echo "🚀 Listo. Backend corriendo en http://localhost:8001"
