/**
 * Hook: useRecomendacion
 * Gestiona la lógica de recomendaciones:
 * - Cálculo SAW (memoizado)
 * - Persistencia (Supabase + localStorage)
 * - Exportación CSV / JSON
 *
 * Corrección #1 del análisis: elimina la referencia directa a `supabase`
 * que existía en App.jsx:114 y la reemplaza por
 * `getOrCreateUserProfileId()` de recomendacionService.js.
 */
import { useState, useMemo } from 'react';
import { calculateSAW } from '../engine/sawEngine';
import { saveRecomendacion, getOrCreateUserProfileId } from '../services/recomendacionService';

export default function useRecomendacion({ planes, pesos, presupuestoMax, selectedZonaId, coberturas, perfil, showToast }) {
  const [ultimaRecomendacionId, setUltimaRecomendacionId] = useState(null);

  // Resultado SAW memoizado
  const sawResult = useMemo(() => {
    return calculateSAW(planes, pesos, presupuestoMax, {
      zonaId: selectedZonaId,
      coberturas,
    });
  }, [planes, pesos, presupuestoMax, selectedZonaId, coberturas]);

  /**
   * Guarda la recomendación actual en Supabase + localStorage.
   *
   * FIX: antes usaba `supabase.from('perfilusuario')` directamente en App.jsx
   * sin tener `supabase` importado (ReferenceError). Ahora delega a
   * `getOrCreateUserProfileId()` del servicio, que ya maneja esa lógica.
   */
  const handleSaveRecomendacion = async () => {
    let targetPerfilId = perfil?.idperfil;

    // Delegar al servicio en vez de llamar a supabase directamente
    if (!targetPerfilId || targetPerfilId === '00000000-0000-0000-0000-000000000000') {
      targetPerfilId = await getOrCreateUserProfileId();
    }

    if (!targetPerfilId) {
      targetPerfilId = '00000000-0000-0000-0000-000000000000';
    }

    const top3Data = sawResult?.top3 || [];

    const id = await saveRecomendacion(targetPerfilId, selectedZonaId, pesos, presupuestoMax, top3Data);
    const recId = id || `rec_${Date.now()}`;
    setUltimaRecomendacionId(recId);
    showToast('¡Recomendación Top 3 guardada con éxito en tu Historial!', 'success');
    return recId;
  };

  const handleExportCSV = () => {
    if (!sawResult?.top3?.length) {
      showToast('No hay datos para exportar', 'warning');
      return;
    }
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Posicion,Proveedor,NombrePlan,Precio,Velocidad,PuntajeGlobal\n' +
      sawResult.top3
        .map(
          (p) =>
            `${p.posicionRanking},${p.proveedor},${p.nombrePlan},${p.precioMensual},${p.velocidadMbps},${p.puntajeGlobal}`
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dictamen_smartplan_top3_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Dictamen de recomendación Top 3 descargado en CSV', 'success');
  };

  const handleExportJSON = () => {
    if (!sawResult) {
      showToast('No hay datos para exportar', 'warning');
      return;
    }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sawResult, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `dictamen_smartplan_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Resumen analítico exportado en JSON', 'success');
  };

  return {
    sawResult,
    ultimaRecomendacionId,
    handleSaveRecomendacion,
    handleExportCSV,
    handleExportJSON,
  };
}
