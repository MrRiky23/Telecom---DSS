import React, { useState, useEffect, useRef } from 'react'
import { construirUrlWhatsApp, esCelularBoliviano } from '../../config/contacto'

const LIMITE_MENSAJE = 300;

export default function ContactModal({ plan, zonaNombre, onClose, onToast }) {
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [comentario, setComentario] = useState('');
  const [errores, setErrores] = useState({});
  const primerCampo = useRef(null);

  // Foco inicial en el primer campo y cierre con la tecla Escape.
  useEffect(() => {
    primerCampo.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!plan) return null;

  const validar = () => {
    const e = {};
    const n = nombre.trim();
    if (!n) e.nombre = 'Escribe tu nombre para que te podamos atender.';
    else if (n.length < 2) e.nombre = 'El nombre es muy corto.';
    else if (n.length > 60) e.nombre = 'El nombre no puede pasar de 60 caracteres.';

    if (!celular.trim()) e.celular = 'Escribe tu número de celular.';
    else if (!esCelularBoliviano(celular)) e.celular = 'Usa 8 dígitos que empiecen con 6 o 7. Ejemplo: 71234567.';

    if (comentario.length > LIMITE_MENSAJE) e.comentario = `El mensaje no puede pasar de ${LIMITE_MENSAJE} caracteres.`;
    return e;
  };

  const construirMensaje = () => {
    const lineas = [
      `Hola, me interesa el plan "${plan.nombrePlan}" de ${plan.proveedor}.`,
      `• Precio: Bs ${plan.precioMensual}/mes`,
      `• Velocidad: ${plan.velocidadMbps} Mbps`,
    ];
    if (zonaNombre) lineas.push(`• Zona: ${zonaNombre}`);
    lineas.push('', `Mi nombre es ${nombre.trim()} y mi celular es ${celular.replace(/[\s-]/g, '')}.`);
    if (comentario.trim()) lineas.push('', comentario.trim());
    return lineas.join('\n');
  };

  const handleSubmit = (ev) => {
    ev.preventDefault();
    const e = validar();
    setErrores(e);
    if (Object.keys(e).length > 0) return;

    const url = construirUrlWhatsApp(construirMensaje());
    const ventana = window.open(url, '_blank', 'noopener,noreferrer');
    if (!ventana) {
      onToast?.('Tu navegador bloqueó la ventana. Permite las ventanas emergentes e inténtalo de nuevo.', 'warning');
      return;
    }
    onToast?.('Se abrió WhatsApp con tu consulta lista para enviar.', 'success');
    onClose();
  };

  const estiloInput = (campo) => ({
    width: '100%',
    padding: '10px',
    borderRadius: 'var(--radius-md)',
    border: `1px solid ${errores[campo] ? '#B91C1C' : 'var(--neutral-300)'}`,
    fontSize: '0.9rem',
    boxSizing: 'border-box'
  });
  const estiloLabel = { display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' };
  const estiloError = { color: '#B91C1C', fontSize: '0.75rem', marginTop: '4px' };

  return (
    <div className="modal-overlay">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="contacto-titulo">
        <div className="modal-header">
          <h3 className="modal-title" id="contacto-titulo">
            <i className="fa-brands fa-whatsapp" style={{ color: '#128C7E', marginRight: '8px' }} aria-hidden="true"></i>
            Contactar por WhatsApp
          </h3>
          <button type="button" onClick={onClose} aria-label="Cerrar formulario de contacto"
            style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>
            <i className="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            <div style={{ background: 'var(--primary-50)', padding: '12px 14px', borderRadius: 'var(--radius-md)', marginBottom: '18px', border: '1px solid var(--primary-200)' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--neutral-500)' }}>Plan elegido</div>
              <strong>{plan.nombrePlan}</strong> · {plan.proveedor}
              <div style={{ fontSize: '0.8rem', color: 'var(--neutral-700)' }}>
                Bs {plan.precioMensual}/mes · {plan.velocidadMbps} Mbps
              </div>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--neutral-600)', marginBottom: '16px' }}>
              Déjanos tus datos y se abrirá WhatsApp con tu consulta ya escrita. Solo tendrás que enviarla.
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label htmlFor="contacto-nombre" style={estiloLabel}>Tu nombre *</label>
              <input id="contacto-nombre" ref={primerCampo} type="text" maxLength={60} autoComplete="name"
                value={nombre} onChange={(e) => setNombre(e.target.value)}
                aria-invalid={!!errores.nombre} aria-describedby={errores.nombre ? 'contacto-nombre-error' : undefined}
                placeholder="Ej. María Pérez" style={estiloInput('nombre')} />
              {errores.nombre && <div id="contacto-nombre-error" role="alert" style={estiloError}>
                <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i> {errores.nombre}
              </div>}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label htmlFor="contacto-celular" style={estiloLabel}>Tu celular *</label>
              <input id="contacto-celular" type="tel" inputMode="numeric" maxLength={12} autoComplete="tel-national"
                value={celular} onChange={(e) => setCelular(e.target.value)}
                aria-invalid={!!errores.celular} aria-describedby={errores.celular ? 'contacto-celular-error' : 'contacto-celular-ayuda'}
                placeholder="Ej. 71234567" style={estiloInput('celular')} />
              {errores.celular
                ? <div id="contacto-celular-error" role="alert" style={estiloError}>
                    <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i> {errores.celular}
                  </div>
                : <div id="contacto-celular-ayuda" style={{ fontSize: '0.72rem', color: 'var(--neutral-500)', marginTop: '4px' }}>
                    8 dígitos, sin código de país.
                  </div>}
            </div>

            <div>
              <label htmlFor="contacto-comentario" style={estiloLabel}>Mensaje (opcional)</label>
              <textarea id="contacto-comentario" rows={3} value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                aria-invalid={!!errores.comentario} aria-describedby="contacto-comentario-ayuda"
                placeholder="Ej. ¿Tienen instalación esta semana?"
                style={{ ...estiloInput('comentario'), resize: 'vertical' }} />
              <div id="contacto-comentario-ayuda" style={{ fontSize: '0.72rem', color: comentario.length > LIMITE_MENSAJE ? '#B91C1C' : 'var(--neutral-500)', marginTop: '4px', textAlign: 'right' }}>
                {comentario.length}/{LIMITE_MENSAJE}
              </div>
              {errores.comentario && <div role="alert" style={estiloError}>
                <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i> {errores.comentario}
              </div>}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">
              <i className="fa-brands fa-whatsapp" aria-hidden="true"></i> Abrir WhatsApp
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
