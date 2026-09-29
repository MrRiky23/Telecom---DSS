import React from 'react';
import { NavLink } from 'react-router-dom';

/**
 * Sidebar — Refactorizado para usar React Router (NavLink).
 * Cada enlace ahora genera una URL real (/dashboard, /catalogo, etc.)
 * en lugar de modificar estado interno con setActiveView.
 */
export default function Sidebar({ rol = 'usuario', userEmail, onSignOut }) {
  const currentEmail = userEmail || 'Usuario';

  // Helper que genera className para NavLink con el estilo activo
  const linkClass = ({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`;

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <h1>
          <span className="brand-icon">
            <i className="fa-solid fa-chart-pie"></i>
          </span>
          SmartPlan
        </h1>
        <div className="brand-subtitle">DSS System</div>
      </div>

      {/* Navigation Section */}
      <div className="sidebar-section" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="sidebar-section-title">Menú Principal</div>
        <ul className="sidebar-nav">
          <li>
            <NavLink to="/dashboard" className={linkClass} end>
              <span className="link-icon"><i className="fa-solid fa-chart-line"></i></span>
              Dashboard (Ranking)
            </NavLink>
          </li>

          {(rol === 'admin' || rol === 'gerente') && (
            <li>
              <NavLink to="/catalogo" className={linkClass}>
                <span className="link-icon"><i className="fa-solid fa-box"></i></span>
                Catálogo de Planes
              </NavLink>
            </li>
          )}

          <li>
            <NavLink to="/cobertura" className={linkClass}>
              <span className="link-icon"><i className="fa-solid fa-signal"></i></span>
              Cobertura por Zona
            </NavLink>
          </li>

          <li>
            <NavLink to="/historial" className={linkClass}>
              <span className="link-icon"><i className="fa-solid fa-clock-rotate-left"></i></span>
              Historial
            </NavLink>
          </li>

          {rol === 'admin' && (
            <li>
              <NavLink to="/zonas" className={linkClass}>
                <span className="link-icon"><i className="fa-solid fa-map-location-dot"></i></span>
                Zonas
              </NavLink>
            </li>
          )}

          <li>
            <NavLink to="/perfiles" className={linkClass}>
              <span className="link-icon"><i className="fa-solid fa-sliders"></i></span>
              Perfiles
            </NavLink>
          </li>

          {rol === 'admin' && (
            <>
              <div className="sidebar-section-title" style={{ marginTop: '16px' }}>Administración</div>
              <li>
                <NavLink to="/admin" className={linkClass}>
                  <span className="link-icon"><i className="fa-solid fa-user-gear"></i></span>
                  Panel Admin
                </NavLink>
              </li>
            </>
          )}
        </ul>
      </div>

      {/* User Footer */}
      <div className="sidebar-user" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="sidebar-user-avatar">
            <i className="fa-solid fa-user"></i>
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentEmail}
            </div>
            <div className="sidebar-user-role" style={{ fontSize: '0.75rem', color: 'var(--sidebar-text)', textTransform: 'capitalize' }}>
              Rol: {rol}
            </div>
          </div>
        </div>
        <button
          onClick={onSignOut}
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#EF4444',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            width: '100%'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#EF4444';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
            e.currentTarget.style.color = '#EF4444';
          }}
        >
          <i className="fa-solid fa-right-from-bracket"></i> Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
