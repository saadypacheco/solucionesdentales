# CLAUDE.md — Soluciones Dentales

> Este archivo es leído automáticamente por Claude Code en cada sesión.

---

## Archivos clave

| Archivo | Qué contiene |
|---------|-------------|
| `AGENTS.md` | Visión, stack, módulos, modelo de datos, reglas críticas |
| `docs/progreso.md` | Estado actual: qué está hecho, en progreso, bloqueado |
| `docs/decisiones.md` | Por qué se eligió X sobre Y |
| `skills/*.md` | Guías técnicas detalladas por feature |

---

## Cómo trabajamos

### Antes de escribir código
- Leer siempre el archivo antes de editarlo
- Si el cambio toca más de 2 archivos, confirmar el approach primero
- Si hay ambigüedad en el requerimiento, preguntar antes de asumir

### Al escribir código
- Seguir las convenciones de AGENTS.md §7
- Respetar las reglas críticas de AGENTS.md §9 sin excepción
- No agregar dependencias sin preguntar
- No crear archivos de documentación salvo que se pida explícitamente

### Al terminar una tarea
- Actualizar `docs/progreso.md` marcando lo completado
- Commitear y pushear siempre — el VPS depende del git pull

---

## Lo que NO hacer

- No usar `DELETE` — siempre soft delete (`activo = false` o `estado = 'inactivo'`)
- No poner `SUPABASE_SERVICE_ROLE_KEY` en ningún archivo del frontend
- No pedir login antes de la primera interacción del paciente
- No commitear `.env` ni `.env.local`
- No mostrar historial clínico sin auth de staff

---

## Entorno

- Frontend: `cd frontend && npm run dev` → http://localhost:3000
- Backend: `cd backend && uvicorn app.main:app --reload` → http://localhost:8000
- Supabase: instancia en la nube (no local)
- Deploy: mismo VPS que tienda (puerto 8001), Vercel para frontend
