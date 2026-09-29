import React from 'react'

export default function CostVsSpeedChart({ planes = [] }) {
  const displayPlanes = planes.slice(0, 5);
  const maxVelocidad = Math.max(...displayPlanes.map(p => p.velocidadMbps), 150);

  return (
    <div className="two-col-wide-left" style={{ marginTop: '20px' }}>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <i className="fa-solid fa-chart-scatter" style={{ color: 'var(--primary-500)', marginRight: '8px' }}></i>
            Relación Costo vs. Velocidad
          </h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '160px', paddingBottom: '10px', borderBottom: '1px dashed var(--neutral-300)' }}>
            {displayPlanes.map((plan) => {
              const heightPx = Math.max(25, Math.round((plan.velocidadMbps / maxVelocidad) * 120));
              const isTop3 = plan.posicionRanking <= 3;
              const barColor = isTop3 ? 'var(--primary-500)' : 'var(--neutral-300)';

              return (
                <div key={plan.idPlan} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--neutral-800)' }}>
                    Bs {plan.precioMensual}
                  </span>
                  <div
                    style={{
                      width: '28px',
                      height: `${heightPx}px`,
                      background: barColor,
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.5s ease-out'
                    }}
                    title={`${plan.nombrePlan}: ${plan.velocidadMbps} Mbps / Bs ${plan.precioMensual}`}
                  ></div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--neutral-600)', textAlign: 'center', maxWidth: '80px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {plan.proveedor} ({plan.velocidadMbps}M)
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--neutral-500)', marginTop: '8px' }}>
            <span>← Menor Precio</span>
            <span>Mayor Velocidad (Mbps) →</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <i className="fa-solid fa-lightbulb" style={{ color: 'var(--warning)', marginRight: '8px' }}></i>
            Diagnóstico de Decisión DSS
          </h3>
        </div>
        <div className="card-body">
          <p style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', lineHeight: '1.7' }}>
            <strong style={{ color: 'var(--primary-500)' }}>{displayPlanes[0]?.nombrePlan || 'Plan Líder'}</strong> domina en los vectores tácticos con el mejor ratio de Puntaje Global SAW.
            La combinación de tarifa mensual accesible, banda ancha simétrica y estabilidad garantizada lo posiciona como la opción recomendada.
          </p>
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="reco-tag confirmado"><i className="fa-solid fa-check"></i> Precio Competitivo</span>
            <span className="reco-tag confirmado"><i className="fa-solid fa-check"></i> Alta Estabilidad</span>
            <span className="reco-tag recomendado"><i className="fa-solid fa-star"></i> Top Performer</span>
          </div>
        </div>
      </div>
    </div>
  );
}
