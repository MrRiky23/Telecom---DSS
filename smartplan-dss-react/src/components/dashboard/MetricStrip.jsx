import React from 'react'

export default function MetricStrip({ kpis }) {
  const {
    mejorScore = 0,
    mejorPlanNombre = 'Cargando...',
    ahorroMaximo = 0,
    planesEvaluados = 0,
    proveedoresActivos = 0,
    indiceCalidadPromedio = 0
  } = kpis || {};

  return (
    <div className="metrics-strip">
      <div className="metric-card accent">
        <div className="metric-label">
          Mejor plan
          <span className="label-badge">Recomendado</span>
        </div>
        <div className="metric-value">
          {mejorScore}<span className="sub">/100</span>
        </div>
        <div className="metric-detail">{mejorPlanNombre}</div>
      </div>

      <div className="metric-card">
        <div className="metric-label">
          Ahorro mensual
          <span className="label-badge">Máximo</span>
        </div>
        <div className="metric-value">
          Bs {ahorroMaximo}<span className="unit">/mes</span>
        </div>
        <div className="metric-detail">Respecto al plan más caro evaluado</div>
      </div>

      <div className="metric-card">
        <div className="metric-label">Planes evaluados</div>
        <div className="metric-value">
          {planesEvaluados}
        </div>
        <div className="metric-detail">{proveedoresActivos} Proveedores activos</div>
      </div>

      <div className="metric-card">
        <div className="metric-label">
          Calidad <span className="label-badge">Índice</span>
        </div>
        <div className="metric-value">
          {indiceCalidadPromedio}<span className="sub">/10</span>
        </div>
        <div className="metric-detail">Estabilidad promedio en tu zona</div>
      </div>
    </div>
  );
}
