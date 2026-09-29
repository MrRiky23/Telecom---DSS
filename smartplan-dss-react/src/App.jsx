import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar from './components/layout/Sidebar'
import TopHeader from './components/layout/TopHeader'
import DashboardView from './views/DashboardView'
import CatalogoView from './views/CatalogoView'
import CoberturaView from './views/CoberturaView'
import PerfilesView from './views/PerfilesView'
import WeightAdjustModal from './components/modals/WeightAdjustModal'
import SimulationModal from './components/modals/SimulationModal'
import PlanDetailModal from './components/modals/PlanDetailModal'
import CompareModal from './components/modals/CompareModal'
import PDFReportModal from './components/modals/PDFReportModal'
import Toast from './components/common/Toast'
import LoginPage from './pages/LoginPage'

import { initialZonas, initialPerfil, initialDWFacts } from './data/seedData'
import { pesosDesdeCriteriosROC } from './engine/sawEngine'
import { isSupabaseConfigured } from './config/supabaseClient'
import { loadInitialDataFromSupabase } from './config/supabaseServices'

// Custom hooks (Recomendación #3: refactorización de App.jsx)
import usePlanes from './hooks/usePlanes'
import useSimulacion from './hooks/useSimulacion'
import useRecomendacion from './hooks/useRecomendacion'

// Lazy load nuevas vistas para evitar crasheos si aún no existen
const ZonasView = lazy(() => import('./views/ZonasView').catch(() => ({ default: () => <div>Vista Zonas en construcción...</div> })));
const HistorialView = lazy(() => import('./views/HistorialView').catch(() => ({ default: () => <div>Vista Historial en construcción...</div> })));
const AdminView = lazy(() => import('./views/AdminView').catch(() => ({ default: () => <div>Vista Admin en construcción...</div> })));
const RecomendacionWizard = lazy(() => import('./components/recomendacion/RecomendacionWizard').catch(() => ({ default: () => <div>Wizard en construcción...</div> })));

function App() {
  const { session, user, perfil, criterios, rol, loading, signOut, updatePerfil } = useAuth();

  // State — zonas y cobertura
  const [zonas, setZonas] = useState(initialZonas);
  const [selectedZonaId, setSelectedZonaId] = useState(1);
  // Recomendación #4: matriz zona×proveedor para cumplir D-6
  const [coberturas, setCoberturas] = useState([]);

  // Toast
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('info');

  const showToast = (msg, type = 'info') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Reemplazar usuario hardcodeado
  const usuario = useMemo(() => {
    return {
      ...initialPerfil,
      esAdmin: rol === 'admin',
      nombreUsuario: user?.email?.split('@')[0] || 'Usuario',
      presupuestoMax: perfil?.presupuestomax || 300,
      rolUsuario: rol || 'usuario',
    };
  }, [rol, user, perfil]);

  const [criteriosSeleccionados, setCriteriosSeleccionados] = useState(['precio', 'velocidad', 'cobertura']);

  // Sincronizar criterios desde Supabase
  useEffect(() => {
    if (criterios?.criteriosseleccionados?.length >= 2) {
      setCriteriosSeleccionados(criterios.criteriosseleccionados);
    }
  }, [criterios]);

  const pesos = useMemo(() => pesosDesdeCriteriosROC(criteriosSeleccionados), [criteriosSeleccionados]);

  // ── Custom Hooks (Recomendación #3) ──────────────────────────────────────
  const {
    planes,
    cloudConnected,
    handleAddPlan,
    handleUpdatePlan,
    handleDeletePlan,
    handleImportPlans,
  } = usePlanes({ esAdmin: usuario.esAdmin, showToast });

  // Cargar zonas y coberturas desde Supabase
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    loadInitialDataFromSupabase()
      .then((res) => {
        if (res) {
          if (res.zonas && res.zonas.length > 0) setZonas(res.zonas);
          // Recomendación #4: cargar la matriz zona×proveedor
          if (res.coberturas && res.coberturas.length > 0) setCoberturas(res.coberturas);
        }
      })
      .catch((err) => console.error('Error loading zonas/coberturas:', err));
  }, []);

  const {
    sawResult,
    ultimaRecomendacionId,
    handleSaveRecomendacion,
    handleExportCSV,
    handleExportJSON,
  } = useRecomendacion({
    planes,
    pesos,
    presupuestoMax: usuario.presupuestoMax,
    selectedZonaId,
    coberturas,
    perfil,
    showToast,
  });

  const {
    simulacion,
    setSimulacion,
    sawResultSimulado,
    handleRunSimulation,
    handleClearSimulation,
    handleConfirmSimulation,
  } = useSimulacion({
    planes,
    pesos,
    presupuestoMax: usuario.presupuestoMax,
    selectedZonaId,
    coberturas,
    showToast,
  });

  const selectedZona = useMemo(() => {
    return zonas.find(z => z.idZona === selectedZonaId) || zonas[0];
  }, [zonas, selectedZonaId]);

  // Modals state
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showSimulationModal, setShowSimulationModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [selectedPlanDetail, setSelectedPlanDetail] = useState(null);

  // Auth & Routing
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F8FAFC' }}>
        <div style={{ width: '50px', height: '50px', border: '5px solid #E2E8F0', borderTop: '5px solid #3B82F6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: '16px', color: '#475569', fontWeight: '500' }}>Cargando SmartPlan DSS...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <div className="app-layout">
      {/* Sidebar — ahora usa NavLink de React Router */}
      <Sidebar
        rol={rol}
        userEmail={user?.email}
        onSignOut={signOut}
      />

      {/* Main Content Area */}
      <div className="main-content">
        <TopHeader
          zonas={zonas}
          selectedZonaId={selectedZonaId}
          onSelectZonaId={(id) => {
            setSelectedZonaId(id);
            const z = zonas.find(item => (item.idZona || item.idzona || item.id) === id);
            const name = z?.nombreSector || z?.nombresector || z?.nombre || '';
            showToast(`Zona cambiada a: ${name}`, 'info');
          }}
          ubicacion={selectedZona?.nombreSector}
          onToast={showToast}
        />

        <div className="page-content">
          {cloudConnected && (
            <div style={{ background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0', padding: '8px 16px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-cloud-check" style={{ color: '#22C55E' }}></i>
              <span><strong>Base de datos activa:</strong> Sincronizado en tiempo real con Supabase Cloud</span>
            </div>
          )}

          {/* Recomendación #2: React Router con rutas reales */}
          <Suspense fallback={<div>Cargando vista...</div>}>
            <Routes>
              <Route path="/dashboard" element={
                <DashboardView
                  sawResult={sawResult}
                  sawResultSimulado={sawResultSimulado}
                  simulacion={simulacion}
                  onClearSimulation={handleClearSimulation}
                  usuario={usuario}
                  zona={selectedZona}
                  dwFacts={initialDWFacts}
                  onOpenWeightModal={() => setShowWeightModal(true)}
                  onOpenSimulationModal={() => setShowSimulationModal(true)}
                  onOpenCompareModal={() => setShowCompareModal(true)}
                  onOpenPDFModal={() => setShowPDFModal(true)}
                  onSelectPlan={(plan) => showToast(`Plan "${plan.nombrePlan}" seleccionado para contratación`, 'success')}
                  onOpenDetail={(plan) => setSelectedPlanDetail(plan)}
                  onExport={handleExportCSV}
                  onExportJSON={handleExportJSON}
                  onImportPlans={handleImportPlans}
                  onSaveRecomendacion={handleSaveRecomendacion}
                />
              } />

              <Route path="/catalogo" element={
                (rol === 'admin' || rol === 'gerente') ? (
                  <CatalogoView
                    planes={planes}
                    onAddPlan={handleAddPlan}
                    onUpdatePlan={handleUpdatePlan}
                    onDeletePlan={handleDeletePlan}
                    onToast={showToast}
                  />
                ) : <Navigate to="/dashboard" replace />
              } />

              <Route path="/cobertura" element={
                <CoberturaView
                  zonas={zonas}
                  selectedZonaId={selectedZonaId}
                  onSelectZona={(id) => { setSelectedZonaId(id); showToast('Zona geográfica de auditoría actualizada', 'info'); }}
                />
              } />

              <Route path="/perfiles" element={
                <PerfilesView
                  usuario={usuario}
                  onUpdatePerfil={(data) => {
                    if (updatePerfil) updatePerfil(data);
                    showToast('Perfil actualizado correctamente', 'success');
                  }}
                  onToast={showToast}
                />
              } />

              <Route path="/zonas" element={
                rol === 'admin'
                  ? <ZonasView onToast={showToast} />
                  : <Navigate to="/dashboard" replace />
              } />

              <Route path="/historial" element={
                <HistorialView perfilId={perfil?.idperfil} onSaveRecomendacion={handleSaveRecomendacion} onToast={showToast} />
              } />

              <Route path="/admin" element={
                rol === 'admin'
                  ? <AdminView onToast={showToast} />
                  : <Navigate to="/dashboard" replace />
              } />

              <Route path="/wizard" element={
                <RecomendacionWizard
                  zonas={zonas}
                  planes={planes}
                  onSaveRecomendacion={handleSaveRecomendacion}
                  onToast={showToast}
                />
              } />

              {/* Redirigir raíz y rutas desconocidas al dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </div>
      </div>

      {/* Modals */}
      {showWeightModal && (
        <WeightAdjustModal
          criteriosSeleccionados={criteriosSeleccionados}
          onSave={(_newPesos, nuevosCriterios) => {
            setCriteriosSeleccionados(nuevosCriterios);
            setSimulacion(null);
            showToast('Criterios y pesos ROC recalculados', 'success');
          }}
          onClose={() => setShowWeightModal(false)}
        />
      )}

      {showSimulationModal && (
        <SimulationModal
          currentPresupuesto={usuario.presupuestoMax}
          criteriosSeleccionados={criteriosSeleccionados}
          pesos={pesos}
          onRunSimulation={handleRunSimulation}
          onClose={() => setShowSimulationModal(false)}
          onConfirmSimulation={(params) =>
            handleConfirmSimulation(params, ultimaRecomendacionId, handleSaveRecomendacion)
          }
        />
      )}

      {showCompareModal && (
        <CompareModal
          planes={sawResult.todos}
          onClose={() => setShowCompareModal(false)}
        />
      )}

      {showPDFModal && (
        <PDFReportModal
          sawResult={sawResult}
          usuario={usuario}
          zona={selectedZona}
          pesos={pesos}
          onClose={() => setShowPDFModal(false)}
        />
      )}

      {selectedPlanDetail && (
        <PlanDetailModal
          plan={selectedPlanDetail}
          onClose={() => setSelectedPlanDetail(null)}
          onConfirm={(plan) => showToast(`Confirmación de contratación del plan ${plan.nombrePlan}`, 'success')}
        />
      )}

      <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage(null)} />
    </div>
  );
}

export default function AppWithAuth() {
  return <AuthProvider><App /></AuthProvider>;
}
