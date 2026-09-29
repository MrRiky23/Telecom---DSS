import React from 'react'

export default function AuthModal({ currentUser, onSwitchRole, onClose }) {
  const currentRole = currentUser?.rolUsuario || 'Administrador (Operativo)';

  const handleSelectRole = (roleName) => {
    if (roleName === 'admin') {
      onSwitchRole({
        ...currentUser,
        rolUsuario: 'Administrador (Operativo)',
        esAdmin: true
      });
    } else {
      onSwitchRole({
        ...currentUser,
        rolUsuario: 'Cliente / PYME (Perfil Estratégico)',
        esAdmin: false
      });
    }
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h3 className="modal-title">
            <i className="fa-solid fa-user-shield" style={{ color: 'var(--primary-500)', marginRight: '8px' }}></i>
            Tu cuenta y rol
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', marginBottom: '20px' }}>
            Selecciona el rol de usuario activo para probar las políticas de acceso y permisos (RLS):
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Rol Admin */}
            <div
              onClick={() => handleSelectRole('admin')}
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-lg)',
                border: `2px solid ${currentUser?.esAdmin ? 'var(--primary-500)' : 'var(--neutral-200)'}`,
                background: currentUser?.esAdmin ? 'var(--primary-50)' : 'var(--neutral-0)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--neutral-900)' }}>
                    Administrador Operativo
                  </strong>
                  <p style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', marginTop: '2px' }}>
                    Acceso total a la gestión del catálogo, índice de estabilidad y precios.
                  </p>
                </div>
                {currentUser?.esAdmin && <i className="fa-solid fa-circle-check" style={{ color: 'var(--primary-500)', fontSize: '1.2rem' }}></i>}
              </div>
            </div>

            {/* Rol Cliente / PYME */}
            <div
              onClick={() => handleSelectRole('cliente')}
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-lg)',
                border: `2px solid ${!currentUser?.esAdmin ? 'var(--primary-500)' : 'var(--neutral-200)'}`,
                background: !currentUser?.esAdmin ? 'var(--primary-50)' : 'var(--neutral-0)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--neutral-900)' }}>
                    Cliente / PYME (Perfil Estratégico)
                  </strong>
                  <p style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', marginTop: '2px' }}>
                    Visualización de Dashboard Top 3, ajuste de ponderaciones y simulador What-If. Catálogo en modo lectura.
                  </p>
                </div>
                {!currentUser?.esAdmin && <i className="fa-solid fa-circle-check" style={{ color: 'var(--primary-500)', fontSize: '1.2rem' }}></i>}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Aceptar</button>
        </div>
      </div>
    </div>
  );
}
