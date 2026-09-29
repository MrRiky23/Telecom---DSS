import React from 'react'

export default function CoverageDonut({ zona }) {
  const {
    nombreSector = 'Región Metropolitana',
    porcentajeAlta = 65,
    porcentajeMedia = 25,
    porcentajeBaja = 10
  } = zona || {};

  const radius = 55;
  const circumference = 2 * Math.PI * radius;
  const dashArray = `${(circumference * porcentajeAlta) / 100} ${circumference}`;

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <i className="fa-solid fa-signal" style={{ color: 'var(--primary-500)', marginRight: '8px' }}></i>
          Cobertura en tu zona
        </h3>
      </div>
      <div className="card-body">
        <p style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', marginBottom: '16px' }}>
          Confiabilidad de señal en {nombreSector}
        </p>

        <div className="donut-chart-container">
          <div className="donut-chart">
            <svg viewBox="0 0 140 140">
              <circle class="donut-bg" cx="70" cy="70" r={radius} />
              <circle
                className="donut-fill"
                cx="70"
                cy="70"
                r={radius}
                strokeDasharray={dashArray}
                strokeDashoffset="0"
              />
            </svg>
            <div className="donut-center">
              <div className="donut-value">
                {porcentajeAlta}<span>%</span>
              </div>
            </div>
          </div>

          <div className="donut-legend">
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#C85A2A' }}></span>
              <span>Alta Cobertura / FTTH</span>
              <span className="legend-pct">{porcentajeAlta}%</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#E8A87C' }}></span>
              <span>Media / HFC Malla</span>
              <span className="legend-pct">{porcentajeMedia}%</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#FFCBA4' }}></span>
              <span>Baja / Cobre - 4G</span>
              <span className="legend-pct">{porcentajeBaja}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
