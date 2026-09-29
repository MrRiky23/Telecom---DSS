import React from 'react'

export default function ScoreBreakdown({ breakdown }) {
  const { precio = 0, velocidad = 0, cobertura = 0, estabilidad = 0 } = breakdown || {};

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <i className="fa-solid fa-chart-bar" style={{ color: 'var(--primary-500)', marginRight: '8px' }}></i>
          Desglose de Puntaje por Criterio (Top 3)
        </h3>
      </div>
      <div className="card-body">
        <p style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', marginBottom: '16px' }}>
          Comparación ponderada en tiempo real de las variables clave del motor SAW
        </p>

        <div className="score-breakdown">
          <div className="score-row">
            <span className="score-label">Precio</span>
            <div className="score-bar-wrapper">
              <div className="score-bar precio" style={{ width: `${Math.min(100, Math.max(0, precio))}%` }}></div>
            </div>
            <span className="score-value">{precio}%</span>
          </div>

          <div className="score-row">
            <span className="score-label">Velocidad</span>
            <div className="score-bar-wrapper">
              <div className="score-bar velocidad" style={{ width: `${Math.min(100, Math.max(0, velocidad))}%` }}></div>
            </div>
            <span className="score-value">{velocidad}%</span>
          </div>

          <div className="score-row">
            <span className="score-label">Cobertura</span>
            <div className="score-bar-wrapper">
              <div className="score-bar cobertura" style={{ width: `${Math.min(100, Math.max(0, cobertura))}%` }}></div>
            </div>
            <span className="score-value">{cobertura}%</span>
          </div>

          <div className="score-row">
            <span className="score-label">Estabilidad</span>
            <div className="score-bar-wrapper">
              <div className="score-bar estabilidad" style={{ width: `${Math.min(100, Math.max(0, estabilidad))}%` }}></div>
            </div>
            <span className="score-value">{estabilidad}%</span>
          </div>
        </div>

        <div className="info-box" style={{ marginTop: '20px' }}>
          <span className="info-box-icon"><i className="fa-solid fa-circle-info"></i></span>
          <div>
            <strong>Impacto en Plano de Decisión (SAW)</strong><br />
            Cada alteración en la matriz de catálogo o en las ponderaciones recalcula automáticamente los puntajes del ranking en distribución de variables.
          </div>
        </div>
      </div>
    </div>
  );
}
