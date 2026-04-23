/**
 * Helpers para abrir WhatsApp reutilizando la misma ventana/pestaña.
 *
 * Por qué no usamos `wa.me/...` con `target="_blank"`:
 * - `_blank` abre una pestaña nueva cada vez → el usuario termina con 5
 *   pestañas de WhatsApp Web abiertas.
 * - `wa.me/` puede triggerear el protocolo `whatsapp://` que abre la app
 *   desktop si está instalada — saltea la sesión activa de Web.
 *
 * Solución:
 * - Usar `web.whatsapp.com/send?phone=...` que SIEMPRE abre Web.
 * - Usar `target="whatsapp"` (nombre fijo) en vez de `_blank` → el browser
 *   reutiliza la misma ventana si ya existe una con ese nombre.
 *
 * Resultado: el primer click abre WhatsApp Web, los siguientes solo
 * cambian el chat dentro de la misma pestaña.
 */

const WHATSAPP_TARGET = 'whatsapp_web'

/** Quita todo lo que no sea dígito. WhatsApp Web no acepta '+', espacios ni guiones. */
export function normalizarNumeroWA(telefono: string | null | undefined): string {
  return (telefono ?? '').replace(/\D/g, '')
}

/**
 * URL para abrir WhatsApp Web en el chat del número dado, opcionalmente
 * con un mensaje pre-armado.
 */
export function whatsappUrl(telefono: string | null | undefined, mensaje?: string): string {
  const phone = normalizarNumeroWA(telefono)
  const base = `https://web.whatsapp.com/send?phone=${phone}`
  if (mensaje) return `${base}&text=${encodeURIComponent(mensaje)}`
  return base
}

/**
 * Props listas para spread en un `<a>`. Garantiza que se reutilice la
 * misma ventana de WhatsApp Web si ya está abierta.
 *
 * Uso:
 *   <a {...whatsappAnchorProps(telefono, mensaje)}>...</a>
 */
export function whatsappAnchorProps(
  telefono: string | null | undefined,
  mensaje?: string,
): { href: string; target: string; rel: string } {
  return {
    href: whatsappUrl(telefono, mensaje),
    target: WHATSAPP_TARGET,
    rel: 'noopener noreferrer',
  }
}
