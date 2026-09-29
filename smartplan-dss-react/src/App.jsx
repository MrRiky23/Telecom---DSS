import React, { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
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
import ContactModal from './components/modals/ContactModal'
import CompareModal from './components/modals/CompareModal'
import PDFReportModal from './components/modals/PDFReportModal'
import Toast from './components/common/Toast'
import LoginPage from './pages/LoginPage'

import { initialPlanes, initialZonas, initialPerfil, initialDWFacts } from './data/seedData'
import { calculateSAW, pesosDesdeCriteriosROC, simularAjusteDePeso } from './engine/sawEngine'
import { supabase, isSupabaseConfigured } from './config/supabaseClient'
import { loadInitialDataFromSupabase, syncInsertPlan, syncUpdatePlan, syncDeletePlan, getNivelCobertura } from './config/supabaseServices'
import { saveRecomendacion, saveSimulacion } from './services/recomendacionService'

const ZonasView = lazy(() => import('./views/ZonasView').catch(() => ({ default: () => <div>Vista Zonas en construcción...</div> })));
const HistorialView = lazy(() => import('./views/HistorialView').catch(() => ({ default: () => <div>Vista Historial en construcción...</div> })));
const AdminView = lazy(() => import('./views/AdminView').catch(() => ({ default: () => <div>Vista Admin en construcción...</div> })));
const RecomendacionWizard = lazy(() => import('./components/recomendacion/RecomendacionWizard').catch(() => ({ default: () => <div>Wizard en construcción...</div> })));

function App() {
  const { session, user, perfil, criterios, rol, loading, signOut, updatePerfil } = useAuth();
  const location = useLocation();
  const activeView = location.pathname.substring(1) || 'dashboard';

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [planes, setPlanes] = useState(initialPlanes);
  const [zonas, setZonas] = useState(initialZonas);
  const [selectedZonaId, setSelectedZonaId] = useState(1);
  
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
  
  useEffect(() => {
    if (criterios?.criteriosseleccionados?.length >= 2) {
      setCriteriosSeleccionados(criterios.criteriosseleccionados);
    }
  }, [criterios]);

  const pesos = useMemo(() => pesosDesdeCriteriosROC(criteriosSeleccionados), [criteriosSeleccionados]);
  const [cloudConnected, setCloudConnected] = useState(false);
  const [simulacion, setSimulacion] = useState(null);
  // Matriz zona × proveedor (D-6): permite filtrar el Top 3 por zona.
  const [coberturas, setCoberturas] = useState([]);

  const [ultimaRecomendacionId, setUltimaRecomendacionId] = useState(null);

  // La recomendación de origen de una simulación solo vale para la zona, pesos y presupuesto con que se
  // guardó. Si cambia alguno, se descarta el id para que la simulación no quede asociada a otra zona.
  const pesosKey = JSON.stringify(pesos);
  useEffect(() => {
    setUltimaRecomendacionId(null);
  }, [selectedZonaId, pesosKey, usuario.presupuestoMax]);

  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showSimulationModal, setShowSimulationModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [selectedPlanDetail, setSelectedPlanDetail] = useState(null);
  const [planContacto, setPlanContacto] = useState(null);

  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('info');

  // Un solo temporizador activo: cada toast nuevo cancela el anterior para no desaparecer antes de tiempo.
  const toastTimerRef = useRef(null);

  const hideToast = () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToastMessage(null);
  };

  const showToast = (msg, type = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    setToastType(type);
    toastTimerRef.current = setTimeout(() => {
      toastTimerRef.current = null;
      setToastMessage(null);
    }, 3500);
  };

  // Limpia el temporizador al desmontar el componente.
  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  // Carga (o recarga) los datos desde Supabase. Con soloZonas = true solo refresca zonas y
  // cobertura (lo usa la pantalla de Zonas tras un cambio), sin tocar planes ni pesos.
  const cargarDatosSupabase = (soloZonas = false) => {
    if (!isSupabaseConfigured) return Promise.resolve();
    return loadInitialDataFromSupabase().then(res => {
      if (!res) return;
      if (!soloZonas) {
        // Los planes dados de baja (activo = false) no se muestran en el catálogo.
        const activos = (res.planes || []).filter(pl => pl.activo !== false);
        if (activos.length > 0) setPlanes(activos);
      }
      if (res.coberturas) setCoberturas(res.coberturas);
      // Las zonas desactivadas desde el panel admin no se ofrecen en el selector.
      const zonasActivas = (res.zonas || []).filter(z => z.activo !== false);
      if (zonasActivas.length > 0) {
        setZonas(zonasActivas);
        setSelectedZonaId(prev => zonasActivas.some(z => z.idZona === prev) ? prev : zonasActivas[0].idZona);
      }
      setCloudConnected(true);
    }).catch(err => console.error("Error loading initial data:", err));
  };

  useEffect(() => {
    cargarDatosSupabase();
  }, []);

  const sawResult = useMemo(() => {
    return calculateSAW(planes, pesos, usuario.presupuestoMax, { zonaId: selectedZonaId, coberturas });
  }, [planes, pesos, usuario.presupuestoMax, selectedZonaId, coberturas]);

  const sawResultSimulado = useMemo(() => {
    if (!simulacion) return null;
    return calculateSAW(planes, simulacion.pesos, simulacion.presupuesto, { zonaId: selectedZonaId, coberturas });
  }, [planes, simulacion, selectedZonaId, coberturas]);

  const selectedZona = useMemo(() => {
    return zonas.find(z => z.idZona === selectedZonaId) || zonas[0];
  }, [zonas, selectedZonaId]);

  const handleSaveRecomendacion = async () => {
    let targetPerfilId = perfil?.idperfil;

    if (!targetPerfilId && user?.id) {
      try {
        const { data: pData } = await supabase
          .from('perfilusuario')
          .select('idperfil')
          .eq('user_id', user.id)
          .maybeSingle();

        if (pData?.idperfil) {
          targetPerfilId = pData.idperfil;
        }
      } catch (e) {
        console.error("Error al obtener perfil del usuario:", e);
      }
    }

    if (!targetPerfilId) {
      targetPerfilId = '00000000-0000-0000-0000-000000000000';
    }

    const top3Data = sawResult?.top3 || [];
    try {
      const recId = await saveRecomendacion(targetPerfilId, selectedZonaId, pesos, usuario.presupuestoMax, top3Data);
      // Sin id real de la BD no hay recomendación guardada: no se inventa uno.
      if (!recId) {
        showToast('No se pudo guardar la recomendación: la base de datos no devolvió un identificador.', 'error');
        return null;
      }
      setUltimaRecomendacionId(recId);
      showToast('¡Recomendación guardada con éxito en tu Historial!', 'success');
      return recId;
    } catch(err) {
      showToast('Error al guardar: ' + (err?.message || 'intente nuevamente'), 'error');
      return null;
    }
  };

  // Con la BD conectada, la cobertura sale de zonaproveedor (zona × proveedor), no del formulario.
  const conCoberturaReal = (plan) => (
    isSupabaseConfigured
      ? { ...plan, nivelCobertura: getNivelCobertura(plan.idZona, plan.proveedor) }
      : plan
  );

  // Devuelven true/false para que la vista solo muestre "éxito" cuando realmente lo hubo.
  const handleAddPlan = async (newPlanRaw) => {
    if (!usuario.esAdmin) {
      showToast('Se requieren permisos de Administrador para modificar el catálogo', 'info');
      return false;
    }
    const newPlan = conCoberturaReal(newPlanRaw);
    const tempId = `temp_${Date.now()}`;
    setPlanes(prev => [{ ...newPlan, idPlan: tempId }, ...prev]);

    if (!isSupabaseConfigured) return true;

    const realId = await syncInsertPlan(newPlan);
    if (!realId) {
      // Rollback: no se guardó en la BD, no debe quedar en pantalla.
      setPlanes(prev => prev.filter(p => p.idPlan !== tempId));
      showToast('No se pudo guardar el plan en la base de datos. Verifique los datos e intente nuevamente.', 'error');
      return false;
    }
    setPlanes(prev => prev.map(p => p.idPlan === tempId ? { ...p, idPlan: realId } : p));
    return true;
  };

  const handleUpdatePlan = async (updatedPlanRaw) => {
    if (!usuario.esAdmin) {
      showToast('Se requieren permisos de Administrador para editar planes', 'info');
      return false;
    }
    const updatedPlan = conCoberturaReal(updatedPlanRaw);
    const anterior = planes.find(p => p.idPlan === updatedPlan.idPlan);
    setPlanes(prev => prev.map(p => p.idPlan === updatedPlan.idPlan ? { ...p, ...updatedPlan } : p));
    const ok = await syncUpdatePlan(updatedPlan);
    if (!ok) {
      if (anterior) setPlanes(prev => prev.map(p => p.idPlan === anterior.idPlan ? anterior : p));
      showToast('No se pudo actualizar el plan en la base de datos.', 'error');
      return false;
    }
    return true;
  };

  const handleDeletePlan = async (idPlan) => {
    if (!usuario.esAdmin) {
      showToast('Se requieren permisos de Administrador para dar de baja planes', 'info');
      return false;
    }
    const anterior = planes.find(p => p.idPlan === idPlan);
    setPlanes(prev => prev.filter(p => p.idPlan !== idPlan));
    const ok = await syncDeletePlan(idPlan);
    if (!ok) {
      if (anterior) setPlanes(prev => [anterior, ...prev]);
      showToast('No se pudo dar de baja el plan en la base de datos.', 'error');
      return false;
    }
    return true;
  };

  const handleRunSimulation = (params) => {
    if (params.tipoSimulacion === 'PESO') {
      const pesosSimulados = simularAjusteDePeso(pesos, params.criterioModificado, params.nuevoPeso);
      setSimulacion({
        tipoSimulacion: 'PESO',
        criterioModificado: params.criterioModificado,
        pesos: pesosSimulados,
        presupuesto: usuario.presupuestoMax,
        nuevoPeso: params.nuevoPeso
      });
      showToast(`Simulación de peso ejecutada sobre "${params.criterioModificado}"`, 'success');
    } else {
      setSimulacion({
        tipoSimulacion: 'PRESUPUESTO',
        criterioModificado: null,
        pesos,
        presupuesto: params.nuevoPresupuesto,
      });
      showToast(`Simulación de presupuesto ejecutada: Bs ${params.nuevoPresupuesto}`, 'success');
    }
  };

  const handleClearSimulation = () => setSimulacion(null);

  const CLAVES_PESO = ['pesoPrecio', 'pesoVelocidad', 'pesoCobertura', 'pesoEstabilidad'];

  // Traduce lo que elige el usuario en el modal a pesos y presupuesto simulados.
  const parametrosDeSimulacion = (params) => (
    params.tipoSimulacion === 'PESO'
      ? { pesosSim: simularAjusteDePeso(pesos, params.criterioModificado, params.nuevoPeso), presupuestoSim: usuario.presupuestoMax }
      : { pesosSim: pesos, presupuestoSim: params.nuevoPresupuesto }
  );

  // Devuelve un mensaje si la simulación no sirve (no cambia nada o no deja planes); null si es válida.
  const errorDeSimulacion = (pesosSim, presupuestoSim) => {
    const igualPesos = CLAVES_PESO.every(
      (k) => Math.round(Number(pesosSim[k] || 0) * 100) === Math.round(Number(pesos[k] || 0) * 100)
    );
    const igualPresupuesto = Number(presupuestoSim) === Number(usuario.presupuestoMax);
    if (igualPesos && igualPresupuesto) {
      return 'Esta simulación no cambia nada: usa el mismo presupuesto y los mismos pesos que tu recomendación. Modifica un valor para compararlo.';
    }
    const resultado = calculateSAW(planes, pesosSim, presupuestoSim, { zonaId: selectedZonaId, coberturas });
    if (!resultado.top3.length) {
      return `Con Bs ${presupuestoSim} no hay planes disponibles en tu zona. Prueba con un monto mayor.`;
    }
    return null;
  };

  const validarSimulacion = (params) => {
    try {
      const { pesosSim, presupuestoSim } = parametrosDeSimulacion(params);
      return errorDeSimulacion(pesosSim, presupuestoSim);
    } catch (err) {
      return 'No se pudo calcular la simulación con esos valores.';
    }
  };

  // Guarda una simulación (siempre asociada a una recomendación de origen).
  // Devuelve el id guardado, 'DUPLICADO' si ya había una, o null si no se guardó.
  const persistirSimulacion = async ({ tipoSimulacion, criterioModificado, pesosSim, presupuestoSim }) => {
    const motivo = errorDeSimulacion(pesosSim, presupuestoSim);
    if (motivo) {
      showToast(motivo, 'warning');
      return null;
    }

    let recId = ultimaRecomendacionId;
    if (!recId) recId = await handleSaveRecomendacion();
    if (!recId) {
      showToast('No se pudo asociar la simulación a una recomendación de origen', 'warning');
      return null;
    }

    try {
      const top3Data = calculateSAW(planes, pesosSim, presupuestoSim, { zonaId: selectedZonaId, coberturas }).top3;
      const result = await saveSimulacion(
        recId,
        tipoSimulacion,
        criterioModificado || null,
        pesosSim,
        presupuestoSim,
        top3Data,
        selectedZonaId
      );
      if (result === 'DUPLICADO') {
        showToast('Ya guardaste una simulación para esta recomendación. Solo se permite una por recomendación.', 'warning');
        return 'DUPLICADO';
      }
      if (result) {
        showToast('Simulación guardada. Puedes verla en tu Historial.', 'success');
        return result;
      }
      return null;
    } catch (err) {
      showToast('Error al guardar simulación', 'error');
      return null;
    }
  };

  // Desde el modal: guarda lo que el modal tiene en ese momento.
  const handleConfirmSimulation = async (params) => {
    let parametros;
    try {
      parametros = parametrosDeSimulacion(params);
    } catch (err) {
      showToast('No se pudo calcular la simulación con esos valores.', 'error');
      return null;
    }
    return persistirSimulacion({
      tipoSimulacion: params.tipoSimulacion,
      criterioModificado: params.criterioModificado,
      pesosSim: parametros.pesosSim,
      presupuestoSim: parametros.presupuestoSim
    });
  };

  // Desde la caja de resultado del Dashboard: guarda exactamente lo que se está previsualizando.
  const handleSaveActiveSimulation = async () => {
    if (!simulacion) return null;
    const resultado = await persistirSimulacion({
      tipoSimulacion: simulacion.tipoSimulacion,
      criterioModificado: simulacion.criterioModificado,
      pesosSim: simulacion.pesos,
      presupuestoSim: simulacion.presupuesto
    });
    return resultado && resultado !== 'DUPLICADO' ? resultado : null;
  };

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + "Posicion,Proveedor,NombrePlan,Precio,Velocidad,PuntajeGlobal\n"
      + sawResult.top3.map(p => [p.posicionRanking, p.proveedor, p.nombrePlan, p.precioMensual, p.velocidadMbps, p.puntajeGlobal]
          .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent).replace(/#/g, '%23');
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `dictamen_smartplan_top3_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Dictamen de recomendación Top 3 descargado en CSV', 'success');
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sawResult, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `dictamen_smartplan_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Resumen analítico exportado en JSON', 'success');
  };

  const handleImportPlans = async (importedPlans) => {
    if (!usuario.esAdmin) {
      showToast('Se requieren permisos de Administrador para importar planes', 'info');
      return;
    }
    if (!Array.isArray(importedPlans) || importedPlans.length === 0) {
      showToast('No se encontraron planes válidos en el archivo', 'warning');
      return;
    }

    let count = 0;
    let omitidos = 0;
    const newPlanesList = [...planes];

    for (const p of importedPlans) {
      const nombrePlan = String(p.nombrePlan ?? p.nombreplan ?? '').trim();
      const proveedor = String(p.proveedor ?? '').trim();
      const precioMensual = Number(p.precioMensual ?? p.preciomensual);
      const velocidadMbps = Number(p.velocidadMbps ?? p.velocidadmbps);
      const indiceEstabilidad = Number(p.indiceEstabilidad ?? p.indiceestabilidad ?? 90);

      const valido = nombrePlan && proveedor
        && Number.isFinite(precioMensual) && precioMensual >= 0
        && Number.isFinite(velocidadMbps) && velocidadMbps > 0
        && Number.isFinite(indiceEstabilidad) && indiceEstabilidad >= 0 && indiceEstabilidad <= 100;
      const duplicado = newPlanesList.some(x =>
        String(x.proveedor ?? '').toLowerCase() === proveedor.toLowerCase() &&
        String(x.nombrePlan ?? '').toLowerCase() === nombrePlan.toLowerCase());

      if (!valido || duplicado) { omitidos++; continue; }

      const formattedPlanBase = {
        idPlan: p.idPlan || Date.now() + Math.floor(Math.random() * 1000),
        proveedor,
        nombrePlan,
        precioMensual,
        velocidadMbps,
        limiteDatosGB: Math.max(0, Number(p.limiteDatosGB ?? p.limitedatosgb ?? 0) || 0),
        tecnologia: p.tecnologia || 'Fibra Óptica FTTH',
        indiceEstabilidad,
        activo: true,
        idZona: Number(p.idZona ?? p.idzona ?? 1) || 1,
        descripcion: p.descripcion || 'Plan importado externamente.'
      };
      const formattedPlan = conCoberturaReal(formattedPlanBase);

      if (isSupabaseConfigured) {
        const realId = await syncInsertPlan(formattedPlan);
        if (!realId) { omitidos++; continue; }
        formattedPlan.idPlan = realId;
      }
      newPlanesList.push(formattedPlan);
      count++;
    }

    setPlanes(newPlanesList);
    showToast(
      omitidos > 0
        ? `${count} planes importados; ${omitidos} omitidos por datos inválidos o duplicados`
        : `¡${count} planes importados exitosamente!`,
      count > 0 ? 'success' : 'warning'
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F8FAFC' }}>
        <div style={{ width: '50px', height: '50px', border: '5px solid #E2E8F0', borderTop: '5px solid #3B82F6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: '16px', color: '#475569', fontWeight: '500' }}>Cargando SmartPlan...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <div className="app-layout">
      <Sidebar
        rol={rol}
        userEmail={user?.email}
        onSignOut={signOut}
        usuario={usuario}
      />

      <div className="main-content">
        <TopHeader
          activeView={activeView}
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

          <Suspense fallback={<div>Cargando vista...</div>}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
                  onSelectPlan={(plan) => setPlanContacto(plan)}
                  onOpenDetail={(plan) => setSelectedPlanDetail(plan)}
                  onExport={handleExportCSV}
                  onExportJSON={handleExportJSON}
                  onSaveRecomendacion={handleSaveRecomendacion}
                  onSaveSimulation={handleSaveActiveSimulation}
                />
              } />
              <Route path="/catalogo" element={
                (rol === 'admin' || rol === 'gerente') ? (
                  <CatalogoView
                    planes={planes}
                    zonas={zonas}
                    selectedZonaId={selectedZonaId}
                    onAddPlan={handleAddPlan}
                    onUpdatePlan={handleUpdatePlan}
                    onDeletePlan={handleDeletePlan}
                    onImportPlans={usuario.esAdmin ? handleImportPlans : null}
                    onToast={showToast}
                  />
                ) : <Navigate to="/dashboard" />
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
                  // Devuelve la promesa para que PerfilesView detecte el fallo.
                  // El toast de éxito/error lo muestra PerfilesView una vez que termina el guardado.
                  onUpdatePerfil={async (data) => {
                    if (!isSupabaseConfigured) return; // modo demo: no hay persistencia
                    await updatePerfil(data);
                  }}
                  onToast={showToast}
                />
              } />
              <Route path="/zonas" element={
                rol === 'admin' ? <ZonasView onToast={showToast} onZonasChanged={() => cargarDatosSupabase(true)} /> : <Navigate to="/dashboard" />
              } />
              <Route path="/historial" element={
                <HistorialView perfilId={perfil?.idperfil} onSaveRecomendacion={handleSaveRecomendacion} onToast={showToast} />
              } />
              <Route path="/admin" element={
                rol === 'admin' ? <AdminView onToast={showToast} /> : <Navigate to="/dashboard" />
              } />
              <Route path="/wizard" element={
                <RecomendacionWizard
                  zonas={zonas}
                  planes={planes}
                  onSaveRecomendacion={handleSaveRecomendacion}
                  onToast={showToast}
                />
              } />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </div>
      </div>

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
          onConfirmSimulation={handleConfirmSimulation}
          validarSimulacion={validarSimulacion}
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
          onConfirm={(plan) => setPlanContacto(plan)}
        />
      )}

      {planContacto && (
        <ContactModal
          plan={planContacto}
          zonaNombre={selectedZona?.nombreSector}
          onClose={() => setPlanContacto(null)}
          onToast={showToast}
        />
      )}

      <Toast message={toastMessage} type={toastType} onClose={hideToast} />
    </div>
  );
}

export default function AppWithAuth() {
  return <AuthProvider><App /></AuthProvider>;
}
