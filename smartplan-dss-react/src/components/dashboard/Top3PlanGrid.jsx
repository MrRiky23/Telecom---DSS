import React from 'react'

export default function Top3PlanGrid({ top3 = [], onSelectPlan, onOpenDetail }) {
  if (!top3 || top3.length === 0) {
    return (
      <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
        <p>No se encontraron planes que coincidan con el presupuesto o zona actual.</p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '32px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--neutral-900)' }}>
          Alternativas recomendadas
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>
          Compare las alternativas y contacte al proveedor por WhatsApp para consultar por el plan que le interese.
        </p>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <span className="reco-tag recomendado" style={{ padding: '5px 14px', fontSize: '0.7rem' }}>
          <i className="fa-solid fa-sparkles"></i> Ordenadas por puntaje
        </span>
      </div>

      <div className="plans-grid">
        {top3.map((plan) => {
          const isRecommended = plan.posicionRanking === 1;

          return (
            <div
              key={plan.idPlan}
              className={`plan-card ${isRecommended ? 'recommended' : ''}`}
            >
              <div className="plan-card-header">
                <div className="plan-card-top">
                  <span className="plan-position-tag">
                    TOP {plan.posicionRanking} · {plan.etiqueta}
                  </span>
                  <div className="plan-score-badge">
                    <span className="plan-score-value">{plan.puntajeGlobal}</span>
                    <span className="plan-score-max">/100</span>
                  </div>
                </div>
                <div className="plan-name">{plan.nombrePlan}</div>
                <div className="plan-provider">{plan.descripcion || plan.proveedor}</div>
              </div>

              <div className="plan-price-row">
                <span className="plan-price-label">Tarifa mensual</span>
                <span className="plan-price-value">
                  <span className="currency">Bs</span> {plan.precioMensual} <span className="currency">/mes</span>
                </span>
              </div>

              <div className="plan-card-body">
                <div className="plan-spec">
                  <span className="spec-icon"><i className="fa-solid fa-gauge-high"></i></span>
                  Velocidad: <strong>{plan.velocidadMbps} Mbps</strong>
                </div>
                <div className="plan-spec">
                  <span className="spec-icon"><i className="fa-solid fa-tower-broadcast"></i></span>
                  Tecnología: <strong>{plan.tecnologia || 'FTTH'}</strong>
                </div>
                <div className="plan-spec">
                  <span className="spec-icon"><i className="fa-solid fa-piggy-bank"></i></span>
                  Ahorro estimado: <strong>Bs {plan.ahorroEstimado} /mes</strong>
                </div>
                <div className="plan-spec">
                  <span className="spec-icon"><i className="fa-solid fa-clock"></i></span>
                  {plan.disponibilidadSoporte || 'Soporte Técnico 24/7'}
                </div>
              </div>

              <div className="plan-card-footer">
                <button
                  onClick={() => onSelectPlan && onSelectPlan(plan)}
                  className={`btn ${isRecommended ? 'btn-primary' : 'btn-outline'} btn-full`}
                >
                  <i className="fa-brands fa-whatsapp" aria-hidden="true"></i> Contactar por WhatsApp
                </button>
                <button
                  onClick={() => onOpenDetail && onOpenDetail(plan)}
                  className="btn btn-secondary btn-full"
                  style={{ fontSize: '0.75rem', border: 'none', background: 'none' }}
                >
                  Ver ficha técnica completa
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
