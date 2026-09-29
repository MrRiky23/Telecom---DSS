import React from 'react'

export default function TopHeader({ activeView, zonas = [], selectedZonaId, onSelectZonaId, ubicacion, onToast }) {
  const getBreadcrumbTitle = () => {
    switch (activeView) {
      case 'dashboard': return 'Recomendaciones';
      case 'catalogo': return 'Catálogo de planes';
      case 'cobertura': return 'Cobertura por zona';
      case 'perfiles': return 'Mi perfil';
      case 'historial': return 'Historial';
      case 'zonas': return 'Zonas';
      case 'admin': return 'Usuarios y roles';
      default: return 'Inicio';
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
          onClick={() => onToast && onToast('No hay alertas nuevas')}
        >
          <i className="fa-regular fa-bell"></i>
        </button>
        <button
          className="header-btn"
          title="Configuración"
          onClick={() => onToast && onToast('Ajusta tu presupuesto y tus criterios desde Mi perfil')}
        >
          <i className="fa-solid fa-gear"></i>
        </button>
      </div>
    </header>
  );
}
