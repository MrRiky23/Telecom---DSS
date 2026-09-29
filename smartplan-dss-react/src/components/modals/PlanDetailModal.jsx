import React from 'react'

export default function PlanDetailModal({ plan, onClose, onConfirm }) {
  if (!plan) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h3 className="modal-title">
            <i className="fa-solid fa-file-contract" style={{ color: 'var(--primary-500)', marginRight: '8px' }}></i>
            Ficha técnica del plan — {plan.nombrePlan}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="modal-body">
          <div style={{ background: 'var(--primary-50)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '20px', border: '1px solid var(--primary-200)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="reco-tag recomendado">Ranking #{plan.posicionRanking || 1}</span>
                <h4 style={{ fontSize: '1.2rem', fontWeight: '800', marginTop: '4px', color: 'var(--primary-900)' }}>
                  {plan.nombrePlan}
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--primary-700)' }}>{plan.proveedor}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--primary-500)' }}>
                  Bs {plan.precioMensual}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', display: 'block' }}>/mes</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.85rem' }}>
            <div style={{ background: 'var(--neutral-50)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              <span style={{ color: 'var(--neutral-500)', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Velocidad Bajada</span>
              <strong>{plan.velocidadMbps} Mbps</strong>
            </div>

            <div style={{ background: 'var(--neutral-50)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              <span style={{ color: 'var(--neutral-500)', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Índice de Estabilidad</span>
              <strong style={{ color: 'var(--primary-500)' }}>{plan.indiceEstabilidad ?? 90} / 100</strong>
            </div>

            <div style={{ background: 'var(--neutral-50)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              <span style={{ color: 'var(--neutral-500)', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Límite de Datos</span>
              <strong>{plan.limiteDatosGB === 0 ? 'Ilimitado' : `${plan.limiteDatosGB} GB`}</strong>
            </div>

            <div style={{ background: 'var(--neutral-50)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              <span style={{ color: 'var(--neutral-500)', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Tecnología de Transmisión</span>
              <strong>{plan.tecnologia || 'FTTH Fibra Óptica'}</strong>
            </div>
          </div>

          <div style={{ marginTop: '20px', fontSize: '0.8rem', color: 'var(--neutral-600)', lineHeight: '1.6' }}>
            <strong>Descripción del Servicio:</strong>
            <p>{plan.descripcion || 'Plan de alta conectividad con monitoreo activo de calidad en red.'}</p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
          <button className="btn btn-primary" onClick={() => { onConfirm && onConfirm(plan); onClose(); }}>
            <i className="fa-brands fa-whatsapp" aria-hidden="true"></i> Contactar por WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
