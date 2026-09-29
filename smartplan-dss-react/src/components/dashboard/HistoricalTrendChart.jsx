import React, { useMemo } from 'react'

export default function HistoricalTrendChart({ dwFacts = [] }) {
  // Agrupar y promediar precios por mes/proveedor
  const mesesOrden = ['Junio', 'Julio', 'Agosto', 'Septiembre'];

  const trendData = useMemo(() => {
    if (!dwFacts || dwFacts.length === 0) return [];

    return mesesOrden.map(mes => {
      const entelRow = dwFacts.find(d => d.mes === mes && d.proveedor === 'Entel');
      const tigoRow  = dwFacts.find(d => d.mes === mes && d.proveedor === 'Tigo');
      const vivaRow  = dwFacts.find(d => d.mes === mes && d.proveedor === 'Viva');
      return {
        mes,
        entel: entelRow ? entelRow.precioPromedio : null,
        tigo:  tigoRow  ? tigoRow.precioPromedio  : null,
        viva:  vivaRow  ? vivaRow.precioPromedio  : null
      };
    }).filter(d => d.entel || d.tigo || d.viva);
  }, [dwFacts]);

  const maxPrice = 600; // Bs — escala máxima del gráfico

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <div className="card-header">
        <h3 className="card-title">
          <i className="fa-solid fa-chart-line" style={{ color: 'var(--primary-500)', marginRight: '8px' }}></i>
          Tendencia Histórica de Precios Promedio (Bolivia — DIM_Tiempo 2025)
        </h3>
        <span className="reco-tag recomendado">Analítica DW</span>
      </div>
      <div className="card-body">
        <p style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', marginBottom: '16px' }}>
          Evolución del precio promedio mensual registrado en <code>FACT_Recomendacion</code>. Fuente: planes comerciales verificados Tigo, Entel y Viva Bolivia 2025-2026.
        </p>

        {trendData.length === 0 ? (
          <p style={{ color: 'var(--neutral-400)', fontSize: '0.8rem' }}>No hay datos históricos disponibles.</p>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '180px', padding: '0 20px 20px 20px', borderBottom: '1px solid var(--neutral-200)' }}>
              {trendData.map((d, index) => (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '130px' }}>
                    {/* Entel */}
                    {d.entel && (
                      <div
                        style={{ width: '14px', height: `${(d.entel / maxPrice) * 120}px`, background: '#005A9C', borderRadius: '3px 3px 0 0', transition: 'height 0.4s ease' }}
                        title={`Entel en ${d.mes}: Bs ${d.entel}`}
                      ></div>
                    )}
                    {/* Tigo */}
                    {d.tigo && (
                      <div
                        style={{ width: '14px', height: `${(d.tigo / maxPrice) * 120}px`, background: 'var(--primary-500)', borderRadius: '3px 3px 0 0', transition: 'height 0.4s ease' }}
                        title={`Tigo en ${d.mes}: Bs ${d.tigo}`}
                      ></div>
                    )}
                    {/* Viva */}
                    {d.viva && (
                      <div
                        style={{ width: '14px', height: `${(d.viva / maxPrice) * 120}px`, background: '#E30613', borderRadius: '3px 3px 0 0', transition: 'height 0.4s ease' }}
                        title={`Viva en ${d.mes}: Bs ${d.viva}`}
                      ></div>
                    )}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--neutral-700)', fontWeight: '600', textAlign: 'center' }}>
                    {d.mes}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '14px', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '14px', height: '12px', background: '#005A9C', borderRadius: '2px', display: 'inline-block' }}></span>
                <span>Entel (Fibra GPON)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '14px', height: '12px', background: 'var(--primary-500)', borderRadius: '2px', display: 'inline-block' }}></span>
                <span>Tigo (Fibra FTTH)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '14px', height: '12px', background: '#E30613', borderRadius: '2px', display: 'inline-block' }}></span>
                <span>Viva (FTTH/LTE)</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
