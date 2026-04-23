# Multi-dominio · setup de DNS

> Cómo configurar DNS para que un consultorio resuelva correctamente desde
> su hostname propio, un subdominio del SaaS, o ambos a la vez.

---

## Conceptos

**Cada consultorio tiene N hostnames** (tabla `dominios_consultorio`):

- `solucionodont.shop` → consultorio_id=1 (cliente actual con dominio propio)
- `bosques.solucionesdentales.com` → consultorio_id=5 (cliente nuevo en subdominio del SaaS)
- `dentalbosques.com.ar` + `bosques.solucionesdentales.com` → consultorio_id=5 (mismo cliente, dominio nuevo + alias del SaaS para retrocompatibilidad)

El frontend resuelve `window.location.host` → consultorio en el primer load
y lo cachea en `sessionStorage`. Si el hostname no está mapeado, **fallback al
consultorio default (id=1)** para no romper nada.

---

## Modelos soportados

### Modelo A · Single-tenant dedicado (cliente con dominio propio)

El cliente compra `dentalbosques.com.ar` y quiere que resuelva su consultorio.

**Pasos:**
1. En tu panel DNS (Cloudflare / Namecheap / GoDaddy / Vercel) creás un
   registro `A` o `CNAME` que apunta al servidor:
   ```
   @     A      <IP-DEL-VPS>     # Si hostea backend en VPS
   www   CNAME  cname.vercel-dns.com.   # Si hostea frontend en Vercel
   ```
2. En Vercel (Project Settings → Domains) agregás `dentalbosques.com.ar`.
3. En la app: **Admin → Configuración → Dominios del consultorio**, agregás
   `dentalbosques.com.ar` y lo marcás como "Principal".
4. Los pacientes que entren a `dentalbosques.com.ar` ven directamente su
   clínica, sin saber que detrás está el SaaS.

### Modelo B · Multi-tenant compartido (subdominio del SaaS)

Cuando tengas el dominio principal del SaaS (ej. `solucionesdentales.com`),
podés ofrecer subdominios automáticos a clientes que no tienen dominio propio.

**Pasos (una sola vez por SaaS):**
1. Comprás `solucionesdentales.com` en Cloudflare / Namecheap.
2. En tu DNS, configurás un wildcard:
   ```
   *.solucionesdentales.com   CNAME   cname.vercel-dns.com.
   ```
3. En Vercel agregás el wildcard `*.solucionesdentales.com`.

**Pasos por cliente:**
1. Cuando creás un consultorio nuevo desde `/superadmin`, lo nombrás
   (ej. "Clínica Bosques") y la app sugiere `bosques.solucionesdentales.com`.
2. Vos vas a **Admin → Configuración → Dominios** y agregás
   `bosques.solucionesdentales.com` como principal.
3. Listo — al ser wildcard DNS, no hace falta tocar nada más en Vercel
   ni en el panel DNS para cada cliente nuevo.

### Modelo C · Híbrido (cliente migra de subdominio a dominio propio)

Caso típico: el cliente arranca en `bosques.solucionesdentales.com` y a los
3 meses compra `dentalbosques.com.ar` y quiere migrar.

**Pasos:**
1. Configurás DNS del nuevo dominio (modelo A, pasos 1-2).
2. En **Admin → Configuración → Dominios** agregás `dentalbosques.com.ar`
   y lo marcás como "Principal".
3. **No borrás `bosques.solucionesdentales.com`** — lo dejás como alias
   por 3-6 meses para que pacientes con links viejos sigan llegando.
4. Eventualmente, lo eliminás de la lista cuando estés seguro.

---

## Verificación

Después de mapear un hostname, podés verificar la resolución sin tocar DNS:

```bash
curl 'https://<servidor>/api/proxy/consultorios/resolver-hostname?host=dentalbosques.com.ar'
```

Respuesta esperada:
```json
{
  "consultorio_id": 5,
  "nombre": "Clínica Bosques",
  "pais_codigo": "AR",
  "idioma": "es",
  "hostname_resuelto": "dentalbosques.com.ar",
  "fallback_aplicado": false
}
```

Si `fallback_aplicado: true`, significa que el hostname no está en la tabla
y se devolvió el consultorio default (id=1). Revisá que lo agregaste bien
en Configuración → Dominios.

---

## Caché y propagación

- **Browser:** una vez resuelto, queda en `sessionStorage` hasta que el
  paciente cierra la pestaña. Si necesitás forzar resolución (ej. cambiaste
  el hostname mientras el paciente tiene la web abierta), ejecutá en consola:
  ```js
  sessionStorage.removeItem('sd_tenant_v1'); location.reload()
  ```
- **DNS:** la propagación del DNS puede tardar de minutos a 24h. Cloudflare
  y Vercel suelen ser inmediatos; otros providers tardan más.
- **Vercel:** después de agregar un dominio, la verificación TLS toma 30s-2m.

---

## Migración a Google Cloud (futuro)

Cuando migres de Hostinger a GCP:

1. Si seguís con Vercel para el frontend → **no cambia nada del DNS** del
   lado del frontend. Solo cambia el `API_URL` que Vercel usa server-side.
2. Si migrás también el frontend → reapuntás los CNAMEs de cada hostname al
   load balancer de GCP.

La tabla `dominios_consultorio` es agnóstica al hosting — solo guarda
el hostname y el consultorio. La infra debajo puede cambiar sin tocarla.

---

## Casos especiales

### `localhost` y previews

El seed de la migración 024 mapea automáticamente:
- `localhost`
- `localhost:3000`
- `solucionesdentales.vercel.app`

→ todos al consultorio_id=1 (para que dev local y previews funcionen).

Si deployás un preview de Vercel con dominio distinto, el resolver hace
fallback al default y el frontend funciona contra el cliente principal.

### Subdominio con puerto

El backend ignora el puerto al resolver (`bosques.solucionesdentales.com:8080`
resuelve igual que `bosques.solucionesdentales.com`). Pero `localhost` SÍ
diferencia puerto (`localhost` vs `localhost:3000`) porque a veces dev
local usa varios puertos en paralelo.

### Conflict 409

Si intentás agregar un hostname que ya pertenece a otro consultorio, el
endpoint devuelve `409 Conflict`. Hostnames son globalmente únicos. Para
mover un hostname de un consultorio a otro: borralo del primero y agregalo
en el segundo.
