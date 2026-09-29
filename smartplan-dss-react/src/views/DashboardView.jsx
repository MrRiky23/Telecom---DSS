import React, { useState, useRef } from 'react'
import MetricStrip from '../components/dashboard/MetricStrip'
import ScoreBreakdown from '../components/dashboard/ScoreBreakdown'
import CoverageDonut from '../components/dashboard/CoverageDonut'
import CostVsSpeedChart from '../components/dashboard/CostVsSpeedChart'
import Top3PlanGrid from '../components/dashboard/Top3PlanGrid'
import AnalyticsKPIs from '../components/dashboard/AnalyticsKPIs'
import HistoricalTrendChart from '../components/dashboard/HistoricalTrendChart'

export default function DashboardView({
  sawResult,
  sawResultSimulado = null,
  simulacion = null,
  onClearSimulation,
  usuario,
  zona,
  dwFacts = [],
  onOpenWeightModal,
  onOpenSimulationModal,
  onOpenCompareModal,
  onOpenPDFModal,
  onSelectPlan,
  onOpenDetail,
  onExport,
  onExportJSON,
  onImportPlans,
  onSaveRecomendacion
}) {
  const { top3 = [], todos = [], kpis = {}, breakdownPromedio = {} } = sawResult || {};
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target.result;
        if (file.name.endsWith('.json')) {
          const json = JSON.parse(content);
          const array = Array.isArray(json) ? json : (json.planes || [json]);
          if (onImportPlans) onImportPlans(array);
        } else {
          // Parse CSV
          const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
          if (lines.length <= 1) return;
          const imported = [];
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length >= 3) {
              imported.push({
                proveedor: values[0] || 'Proveedor',
                nombrePlan: values[1] || 'Plan Importado',
                precioMensual: parseFloat(values[2]) || 150,
                velocidadMbps: parseInt(values[3]) || 50,
                indiceEstabilidad: parseInt(values[4]) || 90,
                tecnologia: values[5] || 'Fibra Óptica FTTH'
              });
            }
          }
          if (onImportPlans) onImportPlans(imported);
        }
      } catch (err) {
        console.error("Error al importar archivo:", err);
      }
    };
    reader.readAsText(file);
    e.target.value = null; // Reset input
  };

  const [savingState, setSavingState] = useState('idle');

  const handleSaveClick = async () => {
    setSavingState('saving');
    try {
      if (onSaveRecomendacion) {
        await onSaveRecomendacion();
      }
      setSavingState('saved');
    } catch (err) {
      console.error("Error al guardar recomendación:", err);
      setSavingState('idle');
    } finally {
      setTimeout(() => setSavingState('idle'), 3000);
    }
  };

  return (
    <div>
      {/* Page Title Section */}
      <div className="page-title-section">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="reco-tag recomendado">
                <i className="fa-solid fa-sparkles"></i> Recomendación Activa (Motor SAW v1.0)
              </span>
            </div>
            <h1 className="page-title">
              Recomendación de Planes <span className="highlight">Top 3</span>
            </h1>
            <p className="page-subtitle">
              {usuario?.nombreUsuario || 'Usuario'} · {usuario?.rolUsuario || 'Usuario'} · {zona?.nombreSector || zona?.nombresector || usuario?.ubicacion || 'Bolivia'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleSaveClick}
              disabled={savingState === 'saving'}
              style={{
                background: savingState === 'saved' ? '#DCFCE7' : 'var(--primary-50, #FFF5F0)',
                color: savingState === 'saved' ? '#15803D' : 'var(--primary-600, #A84820)',
                border: savingState === 'saved' ? '1px solid #86EFAC' : '1px solid var(--primary-300, #FFB088)',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
            >
              {savingState === 'saving' && <><i className="fa-solid fa-spinner fa-spin"></i> Guardando...</>}
              {savingState === 'saved' && <><i className="fa-solid fa-circle-check"></i> ¡Recomendación Guardada!</>}
              {savingState === 'idle' && <><i className="fa-solid fa-floppy-disk"></i> Guardar Recomendación</>}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onOpenCompareModal}>
              <i className="fa-solid fa-code-compare"></i> Comparar Planes
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onOpenWeightModal}>
              <i className="fa-solid fa-sliders"></i> Ajustar Ponderaciones
            </button>

            {/* Hidden Input for File Import */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".csv, .json"
              onChange={handleFileSelect}
            />

            {/* Report & Import/Export Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <i className="fa-solid fa-folder-open"></i>
                <span>Reportes & Archivos</span>
                <i className={`fa-solid fa-chevron-${dropdownOpen ? 'up' : 'down'}`} style={{ fontSize: '0.7rem' }}></i>
              </button>

              {dropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '6px',
                    width: '240px',
                    background: 'white',
                    borderRadius: 'var(--radius-md, 10px)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    border: '1px solid var(--neutral-200)',
                    zIndex: 100,
                    padding: '6px 0',
                    overflow: 'hidden'
                  }}
                  onMouseLeave={() => setDropdownOpen(false)}
                >
                  <div style={{ padding: '6px 14px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--neutral-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Importación
                  </div>
                  <button
                    onClick={() => { setDropdownOpen(false); fileInputRef.current?.click(); }}
                    style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--neutral-800)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--neutral-100)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <i className="fa-solid fa-file-import" style={{ color: 'var(--primary-500)' }}></i>
                    <span>Importar Planes (CSV / JSON)</span>
                  </button>

                  <div style={{ borderTop: '1px solid var(--neutral-200)', margin: '4px 0' }}></div>

                  <div style={{ padding: '6px 14px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--neutral-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Exportación & Dictamen
                  </div>
                  <button
                    onClick={() => { setDropdownOpen(false); if (onExport) onExport(); }}
                    style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--neutral-800)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--neutral-100)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <i className="fa-solid fa-file-csv" style={{ color: '#059669' }}></i>
                    <span>Exportar Ranking (CSV)</span>
                  </button>

                  <button
                    onClick={() => { setDropdownOpen(false); if (onOpenPDFModal) onOpenPDFModal(); }}
                    style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--neutral-800)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--neutral-100)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <i className="fa-solid fa-file-pdf" style={{ color: '#DC2626' }}></i>
                    <span>Dictamen Oficial (PDF)</span>
                  </button>

                  {onExportJSON && (
                    <button
                      onClick={() => { setDropdownOpen(false); onExportJSON(); }}
                      style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--neutral-800)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--neutral-100)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <i className="fa-solid fa-code" style={{ color: '#2563EB' }}></i>
                      <span>Exportar Snapshot (JSON)</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Metric Strip (KPIs) */}
      <MetricStrip kpis={kpis} />

      {/* Score Breakdown + Coverage Donut */}
      <div className="two-col">
        <ScoreBreakdown breakdown={breakdownPromedio} />
        <CoverageDonut zona={zona} />
      </div>

      {/* Cost vs Speed Scatter Chart */}
      <CostVsSpeedChart planes={todos} />

      {/* Top 3 Plan Grid Cards */}
      <Top3PlanGrid
        top3={top3}
        onSelectPlan={onSelectPlan}
        onOpenDetail={onOpenDetail}
      />

      {/* Tendencias Históricas Data Warehouse */}
      <HistoricalTrendChart dwFacts={dwFacts} />

      {/* Data Warehouse Analytics KPIs (HU-01, HU-02, HU-03) */}
      <AnalyticsKPIs dwFacts={dwFacts} />

      {/* Comparación original vs. simulado (§3.3.9) */}
      {simulacion && sawResultSimulado && (
        <div style={{ background: '#FEF9C3', border: '1px solid #FDE047', padding: '14px 16px', borderRadius: 'var(--radius-md)', marginTop: '16px', fontSize: '0.82rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span>
              <i className="fa-solid fa-flask" style={{ color: '#D97706', marginRight: '8px' }}></i>
              <strong>Simulación activa</strong> ({simulacion.tipoSimulacion === 'PESO'
                ? `peso de "${simulacion.criterioModificado}"`
                : `presupuesto Bs ${simulacion.presupuesto}`}) — previsualización, no guardada.
            </span>
            <button className="btn btn-secondary btn-sm" onClick={onClearSimulation}>Volver al original</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <strong>Original — Top 3</strong>
              <ol style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
                {sawResult.top3.map((p) => (
                  <li key={p.idPlan}>{p.nombrePlan} — {p.puntajeGlobal}</li>
                ))}
              </ol>
            </div>
            <div>
              <strong>Simulado — Top 3</strong>
              <ol style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
                {sawResultSimulado.top3.map((p) => (
                  <li key={p.idPlan}>{p.nombrePlan} — {p.puntajeGlobal}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Simulation Banner */}
      <div className="simulation-banner" style={{ marginTop: '32px' }}>
        <div>
          <h4>
            <i className="fa-solid fa-flask" style={{ marginRight: '8px' }}></i>
            ¿Deseas probar variaciones en la demanda de datos? (HU-03)
          </h4>
          <p>
            Simula el incremento de colaboradores o incremento de tráfico en la nube para recalcular los resultados del ranking.
          </p>
        </div>
        <div className="simulation-banner-actions">
          <button className="btn-sim btn-sim-outline" onClick={onOpenWeightModal}>
            <i className="fa-solid fa-sliders"></i> Modificar Criterios
          </button>
          <button className="btn-sim btn-sim-primary" onClick={onOpenSimulationModal}>
            Lanzar Simulador <i className="fa-solid fa-rocket"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
