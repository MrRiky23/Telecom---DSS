import React from 'react'

export default function PDFReportModal({ sawResult, usuario, zona, pesos, onClose }) {
  const { top3 = [], kpis = {}, breakdownPromedio = {} } = sawResult || {};

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '850px' }}>
        <div className="modal-header">
          <h3 className="modal-title">
            <i className="fa-solid fa-file-pdf" style={{ color: 'var(--primary-500)', marginRight: '8px' }}></i>
            Dictamen Oficial DSS — Informe Ejecutivo de Selección
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="modal-body" id="pdf-report-content" style={{ background: 'white', padding: '30px', border: '1px solid var(--neutral-200)', borderRadius: 'var(--radius-md)' }}>
          {/* Header del Reporte */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--primary-500)', paddingBottom: '16px', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--neutral-900)' }}>
                SmartPlan<span style={{ color: 'var(--primary-500)' }}>DSS</span>
              </h2>
              <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Decision Support System · Informe Técnico N° {Date.now().toString().slice(-6)}
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--neutral-600)' }}>
              <div><strong>Fecha de Emisión:</strong> {new Date().toLocaleDateString('es-ES')}</div>
              <div><strong>Algoritmo:</strong> Motor SAW v1.0 (Min-Max)</div>
              <div><strong>Titular:</strong> {usuario?.nombreUsuario || 'J. Delgado'}</div>
            </div>
          </div>

          {/* Resumen del Perfil */}
          <div style={{ background: 'var(--neutral-50)', padding: '14px 20px', borderRadius: 'var(--radius-md)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
            <div><strong>Sector Geográfico:</strong> {zona?.nombreSector || 'Región Metropolitana'}</div>
            <div><strong>Presupuesto Máximo:</strong> Bs {usuario?.presupuestoMax} /mes</div>
            <div><strong>Planes Evaluados:</strong> {kpis.planesEvaluados} ofertas</div>
          </div>

          {/* Resultado del Ranking Top 3 */}
          <h4 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '12px', color: 'var(--neutral-900)' }}>
            Ranking Top 3 Recomendado
          </h4>
          <table className="data-table" style={{ marginBottom: '24px' }}>
            <thead>
              <tr>
                <th>Posición</th>
                <th>Proveedor</th>
                <th>Plan Telecomunicación</th>
                <th>Tarifa Mensual</th>
                <th>Velocidad</th>
                <th>Puntaje Global</th>
              </tr>
            </thead>
            <tbody>
              {top3.map((p) => (
                <tr key={p.idPlan} style={{ background: p.posicionRanking === 1 ? 'var(--primary-50)' : 'inherit' }}>
                  <td><strong>TOP {p.posicionRanking}</strong></td>
                  <td>{p.proveedor}</td>
                  <td><strong>{p.nombrePlan}</strong> ({p.tecnologia || 'FTTH'})</td>
                  <td>Bs {p.precioMensual}</td>
                  <td>{p.velocidadMbps} Mbps</td>
                  <td style={{ color: 'var(--primary-500)', fontWeight: '800' }}>
                    {p.puntajeGlobal} / 100
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Ponderaciones y Validez */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '0.78rem', color: 'var(--neutral-700)' }}>
            <div style={{ background: 'var(--neutral-50)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              <strong>Matriz de Ponderación CriterioPonderacion:</strong>
              <ul style={{ marginTop: '6px', paddingLeft: '16px' }}>
                <li>Precio Mensual: {(pesos.pesoPrecio * 100).toFixed(0)}%</li>
                <li>Velocidad Mbps: {(pesos.pesoVelocidad * 100).toFixed(0)}%</li>
                <li>Cobertura por Zona: {(pesos.pesoCobertura * 100).toFixed(0)}%</li>
                <li>Índice Estabilidad: {(pesos.pesoEstabilidad * 100).toFixed(0)}%</li>
              </ul>
            </div>

            <div style={{ background: 'var(--primary-50)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-200)' }}>
              <strong style={{ color: 'var(--primary-700)' }}><i className="fa-solid fa-certificate"></i> Firma de Certificación DSS:</strong>
              <p style={{ marginTop: '6px', fontSize: '0.72rem', color: 'var(--primary-900)' }}>
                Este reporte ha sido validado automáticamente por el motor analítico SmartPlan DSS. La recomendación N° 1 constituye la solución de menor costo ponderado.
              </p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <i className="fa-solid fa-print"></i> Imprimir / Guardar como PDF
          </button>
        </div>
      </div>
    </div>
  );
}
