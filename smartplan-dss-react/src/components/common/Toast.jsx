import React from 'react'

export default function Toast({ message, type = 'info', onClose }) {
  if (!message) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        background: type === 'success' ? '#166534' : '#1A1A2E',
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
      <i className={type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-info'} style={{ color: 'var(--primary-400)' }}></i>
      <span>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#A0A0B8', cursor: 'pointer', marginLeft: '8px' }}>
        <i className="fa-solid fa-xmark"></i>
      </button>
    </div>
  );
}
