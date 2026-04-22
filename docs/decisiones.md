# Decisiones — Soluciones Dentales

> Por qué se eligió X sobre Y. Para historial técnico.

---

## 2026-04-21 — Telemedicina (M11)

### Plataforma de video: Jitsi
**Elegido sobre:** Daily.co, Twilio Video, Google Meet
**Por qué:**
- Gratis (sin costo por minuto)
- Open source, sin vendor lock-in
- Permite self-host en el mismo VPS si más adelante hace falta privacidad/grabación
- API JavaScript embed simple (`jitsi-meet-external-api`)
**Trade-off:** UI menos pulida que Daily.co; calidad depende de servidores públicos si se usa `meet.jit.si`

### Pago: previo + QR + comprobante manual
**Elegido sobre:** integración nativa Mercado Pago Checkout API
**Por qué:**
- Setup inmediato (cualquier QR estático funciona)
- No requiere acuerdo comercial con MP ni IPN/webhooks
- Reduce no-shows (paciente paga antes de la consulta)
**Trade-off:** verificación manual del admin → no escala con muchos turnos. Plan B: integrar Mercado Pago Checkout cuando el volumen lo justifique.

### Alcance: primera virtual + seguimiento virtual con costo menor
**Elegido sobre:** solo primera virtual / todas presenciales
**Por qué:**
- Diferencial competitivo (consulta sin desplazamiento)
- Seguimiento virtual reduce ausentismo
- Mantiene presencial para procedimientos que lo requieren

### Receta: PDF simple sin firma electrónica certificada
**Elegido sobre:** firma digital certificada (AFIP/ARCA)
**Por qué:**
- MVP rápido sin trámite regulatorio
- Suficiente para uso interno y consulta del paciente
**Trade-off:** no tiene validez legal para presentar en farmacia. Plan B: integrar firma electrónica cuando se requiera (ej. si se quieren prescribir medicamentos controlados).

### Jitsi: hosted (`meet.jit.si`) con lobby
**Elegido sobre:** self-hosted en VPS
**Por qué:**
- Cero infra extra (el VPS ya está cargado con Traefik + 2 proyectos)
- Lobby + password mitigan el riesgo de salas adivinables
- Migración a self-hosted es trivial si más adelante necesitan grabación o privacidad estricta

### Precio telemedicina: configurable por odontólogo (tabla aparte)
**Elegido sobre:** precio fijo en `config_ia` o columnas en `usuarios`
**Por qué:**
- Tabla `precios_telemedicina` permite múltiples campos (primera, seguimiento, QR, datos bancarios) sin sobrecargar `usuarios`
- Cada odontólogo puede tener su propio QR (cuenta bancaria personal)
- FK a `usuarios.id` con índice único + `activo` para historial de cambios

### File share consulta: nativo de Jitsi
**Elegido sobre:** upload integrado al historial clínico del paciente
**Por qué:** MVP — Jitsi ya tiene drag & drop en el chat de la sala, no agregar complejidad
**Trade-off:** los archivos compartidos no quedan persistidos en el historial del paciente. Plan B: si más adelante se quiere persistencia, agregar campo `imagenes_consulta` en tabla `tratamientos` con upload manual del odontólogo después de la sesión.

### Notificaciones como módulo transversal (M12)
**Elegido sobre:** notificaciones embebidas dentro de M11 telemedicina
**Por qué:**
- El usuario pidió notificaciones también para turnos presenciales
- Reusable: cubre M5 (agenda), M8 (alarmas), M11 (telemedicina), chat asincrónico
- Tabla `notificaciones` única + Supabase Realtime evita lógica duplicada
**Trade-off:** un módulo más para mantener, pero evita N implementaciones parciales.

---

## 2026-04-22 — Multi-país compliance (M13)

### Arquitectura: tabla `paises` + flags + seeds
**Elegido sobre:** if/else hardcodeado por país en cada endpoint
**Por qué:**
- Agregar un país nuevo es solo un INSERT + un seed de docs requeridos, sin tocar código
- Reglas centralizadas en una tabla — una sola fuente de verdad
- Permite que el cliente vea/edite las reglas si cambian (ej. Bolivia aprueba ley nueva)

### Multi-tenant con `consultorios` separado
**Elegido sobre:** una instalación = un consultorio
**Por qué:**
- Habilita modelo SaaS con múltiples consultorios en una sola infra
- Cada consultorio tiene su país, sus docs, su QR de pago, sus odontólogos
- Aislamiento por RLS Supabase con `consultorio_id`

### Encryption sí o sí, pero con configuración por país
**Elegido sobre:** encriptar solo donde la ley lo exige
**Por qué:**
- Es buena práctica universal y costo marginal cero una vez implementada
- Simplifica el código (un solo path, sin if país)
- Si el cliente decide expandir a otro país más estricto, ya está listo
**Trade-off:** algunos países (Bolivia) no lo exigen explícitamente, pero no perdemos nada.

### Audit log siempre activo, obligatorio solo en US
**Elegido sobre:** activar solo si país lo requiere
**Por qué:**
- Útil para debugging y soporte siempre
- Para US es obligatorio (HIPAA Security Rule)
- Costo de storage es despreciable (< 1MB/mes por consultorio típico)

### Modelo IA según país (Gemini AR/BO, Claude US con BAA)
**Elegido sobre:** mismo modelo para todos
**Por qué:**
- En US, HIPAA exige BAA con vendor que toque PHI
- Anthropic ofrece BAA vía AWS Bedrock + GCP Vertex (no API directa)
- Gemini de Google también es HIPAA-eligible vía Vertex AI
- Para AR/BO, Gemini Flash directo es más económico y suficiente
**Trade-off:** dos integraciones distintas. Plan B: usar solo Claude vía Bedrock para los 3 países (más caro pero código único).
