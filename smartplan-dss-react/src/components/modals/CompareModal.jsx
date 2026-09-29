import React, { useState } from 'react'

export default function CompareModal({ planes = [], onClose }) {
  const [selectedIds, setSelectedIds] = useState(
    planes.slice(0, 3).map(p => p.idPlan)
  );

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length === 1) return; // Mínimo 1
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      if (selectedIds.length >= 3) return; // Máximo 3
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectedPlanes = planes.filter(p => selectedIds.includes(p.idPlan));

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '900px' }}>
        <div className="modal-header">
          <h3 className="modal-title">
            <i className="fa-solid fa-code-compare" style={{ color: 'var(--primary-500)', marginRight: '8px' }}></i>
            Comparar planes
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', marginBottom: '16px' }}>
            Selecciona hasta 3 planes para comparar sus atributos tácticos en la matriz de decisión:
          </p>

          {/* Selector de Planes */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {planes.map(p => {
              const isChecked = selectedIds.includes(p.idPlan);

              return (
                <button
                  key={p.idPlan}
                  onClick={() => toggleSelect(p.idPlan)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    border: `1px solid ${isChecked ? 'var(--primary-500)' : 'var(--neutral-300)'}`,
                    background: isChecked ? 'var(--primary-50)' : 'var(--neutral-0)',
                    color: isChecked ? 'var(--primary-700)' : 'var(--neutral-600)',
                    fontSize: '0.78rem',
                    fontWeight: isChecked ? '700' : '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <i className={isChecked ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'}></i>
                  {p.nombrePlan}
                </button>
              );
            })}
          </div>

          {/* Matriz Comparativa */}
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: '600px' }}>
              <thead>
                <tr>
                  <th style={{ width: '180px' }}>Atributo</th>
                  {selectedPlanes.map(p => (
                    <th key={p.idPlan} style={{ textAlign: 'center', background: p.posicionRanking === 1 ? 'var(--primary-50)' : 'inherit' }}>
                      <div style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--neutral-900)' }}>
                        {p.nombrePlan}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--primary-500)' }}>
                        {p.proveedor} · Ranking #{p.posicionRanking || '-'}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Puntaje Global SAW</strong></td>
                  {selectedPlanes.map(p => (
                    <td key={p.idPlan} style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--primary-500)' }}>
                        {p.puntajeGlobal || '-'}
                      </span> / 100
                    </td>
                  ))}
                </tr>
                <tr>
                  <td><strong>Tarifa Mensual</strong></td>
                  {selectedPlanes.map(p => (
                    <td key={p.idPlan} style={{ textAlign: 'center', fontWeight: '700' }}>
                      Bs {p.precioMensual} /mes
                    </td>
                  ))}
                </tr>
                <tr>
                  <td><strong>Velocidad Bajada</strong></td>
                  {selectedPlanes.map(p => (
                    <td key={p.idPlan} style={{ textAlign: 'center' }}>
                      {p.velocidadMbps} Mbps
                    </td>
                  ))}
                </tr>
                <tr>
                  <td><strong>Índice Estabilidad</strong></td>
                  {selectedPlanes.map(p => (
                    <td key={p.idPlan} style={{ textAlign: 'center', color: '#166534', fontWeight: '700' }}>
                      {p.indiceEstabilidad || 90} / 100
                    </td>
                  ))}
                </tr>
                <tr>
                  <td><strong>Costo por Mbps</strong></td>
                  {selectedPlanes.map(p => {
                    const ratio = (p.precioMensual / (p.velocidadMbps || 1)).toFixed(1);
                    return (
                      <td key={p.idPlan} style={{ textAlign: 'center' }}>
                        Bs {ratio} por Mbps
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td><strong>Tecnología</strong></td>
                  {selectedPlanes.map(p => (
                    <td key={p.idPlan} style={{ textAlign: 'center', fontSize: '0.78rem' }}>
                      {p.tecnologia || 'FTTH'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td><strong>Límite de Datos</strong></td>
                  {selectedPlanes.map(p => (
                    <td key={p.idPlan} style={{ textAlign: 'center' }}>
                      {p.limiteDatosGB === 0 ? 'Ilimitado' : `${p.limiteDatosGB} GB`}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Cerrar Comparador</button>
        </div>
      </div>
    </div>
  );
}
