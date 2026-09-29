// Contacto de WhatsApp al que llegan las consultas de los usuarios.
// Proyecto académico: se usa el número del equipo como contacto de prueba.
// Formato internacional sin "+": código de Bolivia (591) + número de 8 dígitos.
export const WHATSAPP_CONTACTO = '59167944506';

/** Arma el enlace de WhatsApp con el mensaje ya escrito. */
export function construirUrlWhatsApp(mensaje) {
  return `https://wa.me/${WHATSAPP_CONTACTO}?text=${encodeURIComponent(mensaje)}`;
}

/** Valida un celular boliviano: 8 dígitos que empiezan con 6 o 7. */
export function esCelularBoliviano(valor) {
  return /^[67]\d{7}$/.test(String(valor ?? '').replace(/[\s-]/g, ''));
}
