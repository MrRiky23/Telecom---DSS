/**
 * Hook: usePlanes
 * Extrae del monolítico App.jsx toda la lógica de gestión de planes:
 * - Estado local de planes
 * - CRUD (add, update, delete)
 * - Importación masiva
 * - Sincronización con Supabase
 */
import { useState, useEffect } from 'react';
import { initialPlanes } from '../data/seedData';
import { isSupabaseConfigured } from '../config/supabaseClient';
import {
  loadInitialDataFromSupabase,
  syncInsertPlan,
  syncUpdatePlan,
  syncDeletePlan,
} from '../config/supabaseServices';

export default function usePlanes({ esAdmin, showToast }) {
  const [planes, setPlanes] = useState(initialPlanes);
  const [cloudConnected, setCloudConnected] = useState(false);

  // Carga inicial desde Supabase
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    loadInitialDataFromSupabase()
      .then((res) => {
        if (res) {
          if (res.planes && res.planes.length > 0) setPlanes(res.planes);
          setCloudConnected(true);
        }
      })
      .catch((err) => console.error('Error loading initial data:', err));
  }, []);

  const handleAddPlan = async (newPlan) => {
    if (!esAdmin) {
      showToast('Se requieren permisos de Administrador para modificar el catálogo', 'info');
      return;
    }
    const tempId = `temp_${Date.now()}`;
    const planConTempId = { ...newPlan, idPlan: tempId };
    setPlanes((prev) => [planConTempId, ...prev]);

    const realId = await syncInsertPlan(newPlan);
    if (realId) {
      setPlanes((prev) => prev.map((p) => (p.idPlan === tempId ? { ...p, idPlan: realId } : p)));
    }
  };

  const handleUpdatePlan = (updatedPlan) => {
    if (!esAdmin) {
      showToast('Se requieren permisos de Administrador para editar planes', 'info');
      return;
    }
    setPlanes((prev) => prev.map((p) => (p.idPlan === updatedPlan.idPlan ? { ...p, ...updatedPlan } : p)));
    syncUpdatePlan(updatedPlan);
  };

  const handleDeletePlan = (idPlan) => {
    if (!esAdmin) {
      showToast('Se requieren permisos de Administrador para eliminar planes', 'info');
      return;
    }
    setPlanes((prev) => prev.filter((p) => p.idPlan !== idPlan));
    syncDeletePlan(idPlan);
  };

  const handleImportPlans = async (importedPlans) => {
    if (!Array.isArray(importedPlans) || importedPlans.length === 0) {
      showToast('No se encontraron planes válidos en el archivo', 'warning');
      return;
    }

    let count = 0;
    const newPlanesList = [...planes];

    for (const p of importedPlans) {
      const formattedPlan = {
        idPlan: p.idPlan || Date.now() + Math.floor(Math.random() * 1000),
        proveedor: p.proveedor || 'Proveedor',
        nombrePlan: p.nombrePlan || p.nombreplan || 'Plan Importado',
        precioMensual: Number(p.precioMensual || p.preciomensual || 150),
        velocidadMbps: Number(p.velocidadMbps || p.velocidadmbps || 50),
        limiteDatosGB: Number(p.limiteDatosGB || p.limitedatosgb || 0),
        tecnologia: p.tecnologia || 'Fibra Óptica FTTH',
        indiceEstabilidad: Number(p.indiceEstabilidad || p.indiceestabilidad || 90),
        activo: true,
        idZona: Number(p.idZona || p.idzona || 1),
        descripcion: p.descripcion || 'Plan importado externamente.',
      };

      newPlanesList.push(formattedPlan);
      count++;

      if (isSupabaseConfigured) {
        await syncInsertPlan(formattedPlan);
      }
    }

    setPlanes(newPlanesList);
    showToast(`¡${count} planes importados exitosamente!`, 'success');
  };

  return {
    planes,
    setPlanes,
    cloudConnected,
    handleAddPlan,
    handleUpdatePlan,
    handleDeletePlan,
    handleImportPlans,
  };
}
