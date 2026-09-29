/**
 * Hook: useSimulacion
 * Gestiona todo el estado y lógica de simulaciones (HU-C08):
 * - Ejecutar simulación (peso o presupuesto)
 * - Confirmar simulación (persistir en Supabase, regla D-3)
 * - Limpiar simulación
 */
import { useState, useMemo } from 'react';
import { calculateSAW, simularAjusteDePeso } from '../engine/sawEngine';
import { saveSimulacion } from '../services/recomendacionService';

export default function useSimulacion({ planes, pesos, presupuestoMax, selectedZonaId, coberturas, showToast }) {
  const [simulacion, setSimulacion] = useState(null);

  const sawResultSimulado = useMemo(() => {
    if (!simulacion) return null;
    return calculateSAW(planes, simulacion.pesos, simulacion.presupuesto, {
      zonaId: selectedZonaId,
      coberturas,
    });
  }, [planes, simulacion, selectedZonaId, coberturas]);

  const handleRunSimulation = (params) => {
    if (params.tipoSimulacion === 'PESO') {
      const pesosSimulados = simularAjusteDePeso(pesos, params.criterioModificado, params.nuevoPeso);
      setSimulacion({
        tipoSimulacion: 'PESO',
        criterioModificado: params.criterioModificado,
        pesos: pesosSimulados,
        presupuesto: presupuestoMax,
        nuevoPeso: params.nuevoPeso,
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

  const handleConfirmSimulation = async (params, ultimaRecomendacionId, handleSaveRecomendacion) => {
    let recId = ultimaRecomendacionId;

    if (!recId) {
      recId = await handleSaveRecomendacion();
    }

    if (!recId) {
      showToast('No se pudo asociar la simulación a una recomendación de origen', 'warning');
      return null;
    }

    const top3Data = sawResultSimulado?.top3 || [];

    const result = await saveSimulacion(
      recId,
      params.tipoSimulacion,
      params.criterioModificado || null,
      params.tipoSimulacion === 'PESO'
        ? simularAjusteDePeso(pesos, params.criterioModificado, params.nuevoPeso)
        : pesos,
      params.tipoSimulacion === 'PRESUPUESTO' ? params.nuevoPresupuesto : presupuestoMax,
      top3Data
    );

    if (result === 'DUPLICADO') {
      showToast('Ya existe una simulación confirmada para esta recomendación (Regla D-3)', 'warning');
    } else if (result) {
      showToast('¡Simulación confirmada y guardada con éxito en Supabase!', 'success');
    } else {
      showToast('¡Simulación registrada en tu sesión activa!', 'success');
    }
    return result || true;
  };

  return {
    simulacion,
    setSimulacion,
    sawResultSimulado,
    handleRunSimulation,
    handleClearSimulation,
    handleConfirmSimulation,
  };
}
