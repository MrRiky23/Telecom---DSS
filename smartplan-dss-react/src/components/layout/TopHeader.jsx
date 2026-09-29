import React from 'react'
import { useLocation } from 'react-router-dom'

/**
 * TopHeader — Refactorizado para usar React Router (useLocation).
 * Deriva el breadcrumb del pathname actual en vez de recibir activeView como prop.
 */
export default function TopHeader({ zonas = [], selectedZonaId, onSelectZonaId, ubicacion, onToast }) {
  const location = useLocation();

  const getBreadcrumbTitle = () => {
    const path = location.pathname.replace('/', '') || 'dashboard';
    switch (path) {
      case 'dashboard': return 'Recomendación de Planes (Top 3)';
      case 'catalogo': return 'Gestión de Catálogo';
      case 'cobertura': return 'Cobertura por Zona';
      case 'perfiles': return 'Perfiles de Usuario';
      case 'historial': return 'Historial de Recomendaciones';
      case 'zonas': return 'Gestión de Zonas';
      case 'admin': return 'Panel de Administración';
      case 'wizard': return 'Asistente de Recomendación';
      default: return 'Dashboard';
    }
  };

  return (
    <header className="top-header">
      <nav className="breadcrumb-nav">
        <a href="#home">SmartPlan</a>
        <span>›</span>
        <a href="#gestion">Centro de Gestión</a>
        <span>›</span>
        <span className="current">{getBreadcrumbTitle()}</span>
      </nav>

      {/* Dynamic Zone Selector for Bolivia */}
      <div className="header-region" style={{ background: 'var(--primary-50, #FFF5F0)', border: '1px solid var(--primary-200, #FFD0B5)', padding: '4px 12px', borderRadius: 'var(--radius-full, 999px)' }}>
        <i className="fa-solid fa-location-dot" style={{ color: 'var(--primary-500)' }}></i>
        <select
          value={selectedZonaId || 1}
          onChange={(e) => onSelectZonaId && onSelectZonaId(Number(e.target.value))}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: 'var(--primary-900)',
            outline: 'none',
            cursor: 'pointer',
            maxWidth: '320px'
          }}
        >
          {zonas.map((z) => {
            const id = z.idZona || z.idzona || z.id;
            const name = z.nombreSector || z.nombresector || z.nombre;
            return (
              <option key={id} value={id}>
                {name}
              </option>
            );
          })}
        </select>
      </div>

      <div className="header-actions">
        <button
          className="header-btn"
          title="Notificaciones"
          onClick={() => onToast && onToast('No hay nuevas alertas del sistema SAW')}
        >
          <i className="fa-regular fa-bell"></i>
        </button>
        <button
          className="header-btn"
          title="Configuración"
          onClick={() => onToast && onToast('Configuración del motor SAW v1.0 activa')}
        >
          <i className="fa-solid fa-gear"></i>
        </button>
      </div>
    </header>
  );
}
