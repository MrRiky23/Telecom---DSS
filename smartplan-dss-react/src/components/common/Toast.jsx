import React from 'react'

const ESTILOS = {
  success: { bg: '#166534', icon: 'fa-solid fa-circle-check' },
  error:   { bg: '#991B1B', icon: 'fa-solid fa-circle-exclamation' },
  warning: { bg: '#92400E', icon: 'fa-solid fa-triangle-exclamation' },
  info:    { bg: '#1A1A2E', icon: 'fa-solid fa-circle-info' }
}

export default function Toast({ message, type = 'info', onClose }) {
  if (!message) return null;
  const estilo = ESTILOS[type] || ESTILOS.info;

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        background: estilo.bg,
        color: 'white',
        padding: '12px 20px',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '0.85rem',
        animation: 'slideUp 0.3s ease-out'
      }}
    >
      <i className={estilo.icon} style={{ color: 'white' }}></i>
      <span>{message}</span>
      <button onClick={onClose} aria-label="Cerrar notificación" style={{ background: 'none', border: 'none', color: '#E5E7EB', cursor: 'pointer', marginLeft: '8px' }}>
        <i className="fa-solid fa-xmark"></i>
      </button>
    </div>
  );
}
