import React, { useState } from 'react'
import MetricStrip from '../components/dashboard/MetricStrip'
import ScoreBreakdown from '../components/dashboard/ScoreBreakdown'
import CoverageDonut from '../components/dashboard/CoverageDonut'
import CostVsSpeedChart from '../components/dashboard/CostVsSpeedChart'
import Top3PlanGrid from '../components/dashboard/Top3PlanGrid'
import AnalyticsKPIs from '../components/dashboard/AnalyticsKPIs'
import HistoricalTrendChart from '../components/dashboard/HistoricalTrendChart'
import SimulationResult from '../components/dashboard/SimulationResult'

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
  onSaveRecomendacion,
  onSaveSimulation
}) {
  const { top3 = [], todos = [], kpis = {}, breakdownPromedio = {} } = sawResult || {};
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [savingState, setSavingState] = useState('idle');

  const handleSaveClick = async () => {
    setSavingState('saving');
    try {
      // Solo se marca "guardado" si el guardado devolvió un id real.
      const recId = onSaveRecomendacion ? await onSaveRecomendacion() : null;
      setSavingState(recId ? 'saved' : 'idle');
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
                <i className="fa-solid fa-sparkles"></i> Recomendación activa
              </span>
            </div>
            <h1 className="page-title">
              Recomendación de planes <span className="highlight">Top 3</span>
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
              {savingState === 'saved' && <><i className="fa-solid fa-circle-check"></i> ¡Recomendación guardada!</>}
              {savingState === 'idle' && <><i className="fa-solid fa-floppy-disk"></i> Guardar recomendación</>}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onOpenCompareModal}>
              <i className="fa-solid fa-code-compare"></i> Comparar planes
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onOpenWeightModal}>
              <i className="fa-solid fa-sliders"></i> Ajustar ponderaciones
            </button>

            {/* Reportes y exportación */}
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <i className="fa-solid fa-folder-open"></i>
                <span>Reportes</span>
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
                  <button
                    onClick={() => { setDropdownOpen(false); if (onExport) onExport(); }}
                    style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--neutral-800)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--neutral-100)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <i className="fa-solid fa-file-csv" style={{ color: '#059669' }}></i>
                    <span>Exportar ranking (CSV)</span>
                  </button>

                  <button
                    onClick={() => { setDropdownOpen(false); if (onOpenPDFModal) onOpenPDFModal(); }}
                    style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--neutral-800)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--neutral-100)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <i className="fa-solid fa-file-pdf" style={{ color: '#DC2626' }}></i>
                    <span>Informe ejecutivo (PDF)</span>
                  </button>

                  {onExportJSON && (
                    <button
                      onClick={() => { setDropdownOpen(false); onExportJSON(); }}
                      style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--neutral-800)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--neutral-100)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <i className="fa-solid fa-code" style={{ color: '#2563EB' }}></i>
                      <span>Exportar datos (JSON)</span>
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

      {/* Comparación original vs. simulado */}
      {simulacion && sawResultSimulado && (
        <SimulationResult
          sawResult={sawResult}
          sawResultSimulado={sawResultSimulado}
          simulacion={simulacion}
          presupuestoOriginal={usuario?.presupuestoMax}
          onClear={onClearSimulation}
          onSave={onSaveSimulation}
        />
      )}

      {/* Simulation Banner */}
      <div className="simulation-banner" style={{ marginTop: '32px' }}>
        <div>
          <h4>
            <i className="fa-solid fa-flask" style={{ marginRight: '8px' }}></i>
            ¿Qué pasaría si cambian tus prioridades o tu presupuesto?
          </h4>
          <p>
            Cambia el peso de un criterio o tu presupuesto y compara el nuevo Top 3 con el original antes de decidir.
          </p>
        </div>
        <div className="simulation-banner-actions">
          <button className="btn-sim btn-sim-primary" onClick={onOpenSimulationModal}>
            Abrir simulador <i className="fa-solid fa-rocket"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
