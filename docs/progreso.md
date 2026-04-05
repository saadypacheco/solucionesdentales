# Progreso — Soluciones Dentales

> Última actualización: 2026-04-05

---

## Estado general

```
Fase actual: Scaffold completo
Próximo paso: Auth staff + migraciones SQL + agente IA básico
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
  - [x] `.env` y `.env.local` con variables vacías
  - [x] `.gitignore`
  - [x] Dockerfile backend
  - [x] Store Zustand identidad progresiva
  - [x] Types: Paciente, Turno, Caso

---

## Próximo paso: Fase 1 MVP

- [ ] **Auth staff** — login con Supabase, hook useAuth, página /login
- [ ] **Migraciones en Supabase** — ejecutar 001, 002, 003
- [ ] **Agente IA** — widget flotante, chat funcional con Gemini
- [ ] **Formulario de turno** — nombre + teléfono, fecha/hora, tipo tratamiento
- [ ] **Panel admin básico** — agenda + pacientes + alarmas

---

## Bloqueado

- Necesita credenciales Supabase para arrancar (nuevo proyecto en Supabase)
