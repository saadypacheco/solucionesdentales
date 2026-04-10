# Skills — Guías técnicas detalladas

Cada archivo en esta carpeta es una guía paso-a-paso para un feature específico del proyecto. Úsalas para:
- Entender cómo funciona X componente
- Hacer cambios sin romper dependencias
- Onboard a nuevos desarrolladores
- Troubleshooting rápido

---

## 📋 Skills disponibles

| Skill | Tema | Estado |
|-------|------|--------|
| [`otp-auth.md`](./otp-auth.md) | OTP + JWT para pacientes | ✅ |
| [`admin-auth.md`](./admin-auth.md) | Login y roles para staff | ✅ |
| [`booking-flow.md`](./booking-flow.md) | Flujo de agendar turno | ✅ |
| [`ai-agent.md`](./ai-agent.md) | Integración con Gemini 2.0 | ✅ |
| [`docker-deploy.md`](./docker-deploy.md) | Deployment con Docker | ✅ |
| [`encryption.md`](./encryption.md) | Encriptación de datos sensibles | 🔄 |
| [`testing.md`](./testing.md) | Test cases y CI/CD | 🔄 |

---

## Estructura de un skill

Cada skill sigue este formato:

```markdown
# [Nombre del feature]

## Qué es

[1 párrafo explicativo]

## Diagrama

[ASCII o descripción del flujo]

## Archivos involucrados

- backend/app/routers/...
- frontend/app/.../page.tsx
- supabase/migrations/...

## Implementación paso a paso

### Requisito 1
Código y explicación...

### Requisito 2
Código y explicación...

## Troubleshooting

**Error X**
→ Solución Y

## Ver también
- Otro skill relacionado
- Documento en docs/
```

---

## Cómo leer un skill

1. **Lee "Qué es"** para entender el propósito
2. **Estudia el diagrama** para ver la arquitectura
3. **Localiza archivos** para saber dónde está el código
4. **Sigue los pasos** si necesitas hacer cambios
5. **Usa troubleshooting** si algo falla

---

## Cómo escribir un skill

Si estás documentando un nuevo feature:

1. Crea `skills/feature-name.md`
2. Sigue el formato arriba
3. Agrega línea a `skills/README.md`
4. Commit: `feat(skills): agregar skill para [feature]`

---

## Links útiles

- [AGENTS.md](../AGENTS.md) — Visión y módulos
- [docs/progreso.md](../docs/progreso.md) — Estado del proyecto
- [docs/decisiones.md](../docs/decisiones.md) — Por qué X sobre Y
- [CLAUDE.md](../CLAUDE.md) — Cómo trabajar con el código

