import { supabase, isSupabaseConfigured } from '../config/supabaseClient';

// Helper for local storage persistence
function getFromLocalStorage() {
  try {
    const raw = localStorage.getItem('smartplan_historial');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveToLocalStorage(newItem) {
  try {
    const current = getFromLocalStorage();
    const filtered = current.filter(
      item => item.recomendacion?.idrecomendacion !== newItem.recomendacion?.idrecomendacion
    );
    const updated = [newItem, ...filtered];
    localStorage.setItem('smartplan_historial', JSON.stringify(updated));
  } catch (e) {
    console.error("Error al guardar en localStorage:", e);
  }
}

// Helper to get or create a valid perfil ID in Supabase
export async function getOrCreateUserProfileId() {
  if (!isSupabaseConfigured) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: pData } = await supabase
      .from('perfilusuario')
      .select('idperfil')
      .eq('user_id', user.id)
      .maybeSingle();

    if (pData?.idperfil) return pData.idperfil;

    // Create user profile row if absent
    const newId = crypto.randomUUID();
    const { data: newProfile, error: pErr } = await supabase
      .from('perfilusuario')
      .insert({
        idperfil: newId,
        user_id: user.id,
        ubicacion: 'Bolivia',
        presupuestomax: 300,
        tipousos: ['streaming']
      })
      .select()
      .maybeSingle();

    if (!pErr && newProfile?.idperfil) return newProfile.idperfil;
    return newId;
  } catch (err) {
    console.error("Error al obtener/crear perfil de usuario:", err);
    return null;
  }
}

export async function saveRecomendacion(perfilId, zonaId, pesos, presupuesto, top3) {
  let targetPerfilId = perfilId;
  if (!targetPerfilId || targetPerfilId === '00000000-0000-0000-0000-000000000000') {
    targetPerfilId = await getOrCreateUserProfileId();
  }

  const recId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  // Local representation
  const localRec = {
    idrecomendacion: recId,
    idperfil: targetPerfilId,
    idzona: Number(zonaId || 1),
    fechacalculo: timestamp,
    versionalgoritmo: 'SAW-1.0',
    presupuestousado: Number(presupuesto || 300),
    pesoprecio: Number(pesos.pesoPrecio || 0),
    pesovelocidad: Number(pesos.pesoVelocidad || 0),
    pesocobertura: Number(pesos.pesoCobertura || 0),
    pesoestabilidad: Number(pesos.pesoEstabilidad || 0),
    essimulacion: false,
    essimulacionorigen: false,
    tiposimulacion: null,
    criteriomodificado: null
  };

  const detallesList = (top3 || []).map((plan, idx) => ({
    iddetalle: crypto.randomUUID(),
    idrecomendacion: recId,
    idplan: plan.idPlan || idx + 1,
    posicion: Number(plan.posicion || plan.posicionRanking || (idx + 1)),
    puntajetotal: Number(plan.puntajeGlobal || plan.puntaje || 0),
    puntajeprecio: Number(plan.puntajePrecio || 0),
    puntajevelocidad: Number(plan.puntajeVelocidad || 0),
    puntajecobertura: Number(plan.puntajeCobertura || 0),
    puntajeestabilidad: Number(plan.puntajeEstabilidad || 0),
    preciosnapshot: Number(plan.precioMensual || 0),
    velocidadsnapshot: Number(plan.velocidadMbps || 0),
    plantelecomunicacion: {
      nombreplan: plan.nombrePlan || plan.nombreplan || `Plan #${plan.idPlan || idx + 1}`,
      proveedor: plan.proveedor || 'Proveedor'
    }
  }));

  // Immediate fail-safe save to localStorage
  saveToLocalStorage({ recomendacion: localRec, detalles: detallesList });

  // Sync to Supabase Cloud if available
  if (isSupabaseConfigured) {
    try {
      const payload = {
        idrecomendacion: recId,
        idzona: Number(zonaId || 1),
        pesoprecio: Number(pesos.pesoPrecio || 0),
        pesovelocidad: Number(pesos.pesoVelocidad || 0),
        pesocobertura: Number(pesos.pesoCobertura || 0),
        pesoestabilidad: Number(pesos.pesoEstabilidad || 0),
        presupuestousado: Number(presupuesto || 300),
        essimulacion: false
      };

      if (targetPerfilId && targetPerfilId !== '00000000-0000-0000-0000-000000000000') {
        payload.idperfil = targetPerfilId;
      }

      const { data: recData, error: recError } = await supabase
        .from('recomendacionresult')
        .insert(payload)
        .select()
        .single();

      if (recError) {
        console.error('Error insertando recomendacionresult en Supabase:', recError);
      } else if (recData) {
        const cloudDetalles = detallesList.map(d => ({
          idrecomendacion: recData.idrecomendacion,
          idplan: d.idplan,
          posicion: d.posicion,
          puntajetotal: d.puntajetotal,
          puntajeprecio: d.puntajeprecio,
          puntajevelocidad: d.puntajevelocidad,
          puntajecobertura: d.puntajecobertura,
          puntajeestabilidad: d.puntajeestabilidad,
          preciosnapshot: d.preciosnapshot,
          velocidadsnapshot: d.velocidadsnapshot
        }));

        const { error: detError } = await supabase.from('detallerecomendacion').insert(cloudDetalles);
        if (detError) console.error('Error insertando detallerecomendacion en Supabase:', detError);
        return recData.idrecomendacion;
      }
    } catch (error) {
      console.error('Excepción al guardar recomendación en Supabase:', error);
    }
  }

  return recId;
}

export async function saveSimulacion(idRecomendacionOrigen, tipoSimulacion, criterioModificado, pesosSimulados, presupuestoSimulado, top3Simulado) {
  const recId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const localRec = {
    idrecomendacion: recId,
    idrecomendacionorigen: idRecomendacionOrigen,
    essimulacion: true,
    tiposimulacion: tipoSimulacion,
    criteriomodificado: criterioModificado,
    fechacalculo: timestamp,
    versionalgoritmo: 'SAW-1.0',
    pesoprecio: Number(pesosSimulados.pesoPrecio || 0),
    pesovelocidad: Number(pesosSimulados.pesoVelocidad || 0),
    pesocobertura: Number(pesosSimulados.pesoCobertura || 0),
    pesoestabilidad: Number(pesosSimulados.pesoEstabilidad || 0),
    presupuestousado: Number(presupuestoSimulado || 300)
  };

  const detallesList = (top3Simulado || []).map((plan, idx) => ({
    iddetalle: crypto.randomUUID(),
    idrecomendacion: recId,
    idplan: plan.idPlan || idx + 1,
    posicion: Number(plan.posicion || plan.posicionRanking || (idx + 1)),
    puntajetotal: Number(plan.puntajeGlobal || plan.puntaje || 0),
    puntajeprecio: Number(plan.puntajePrecio || 0),
    puntajevelocidad: Number(plan.puntajeVelocidad || 0),
    puntajecobertura: Number(plan.puntajeCobertura || 0),
    puntajeestabilidad: Number(plan.puntajeEstabilidad || 0),
    preciosnapshot: Number(plan.precioMensual || 0),
    velocidadsnapshot: Number(plan.velocidadMbps || 0),
    plantelecomunicacion: {
      nombreplan: plan.nombrePlan || plan.nombreplan || `Plan #${plan.idPlan || idx + 1}`,
      proveedor: plan.proveedor || 'Proveedor'
    }
  }));

  saveToLocalStorage({ recomendacion: localRec, detalles: detallesList });

  if (isSupabaseConfigured) {
    try {
      const { data: recData, error: recError } = await supabase
        .from('recomendacionresult')
        .insert({
          idrecomendacion: recId,
          idrecomendacionorigen: idRecomendacionOrigen,
          essimulacion: true,
          tiposimulacion: tipoSimulacion,
          criteriomodificado: criterioModificado,
          pesoprecio: Number(pesosSimulados.pesoPrecio || 0),
          pesovelocidad: Number(pesosSimulados.pesoVelocidad || 0),
          pesocobertura: Number(pesosSimulados.pesoCobertura || 0),
          pesoestabilidad: Number(pesosSimulados.pesoEstabilidad || 0),
          presupuestousado: Number(presupuestoSimulado || 300)
        })
        .select()
        .single();
        
      if (recError) {
        if (recError.code === '23505') return 'DUPLICADO';
        console.error('Error insertando simulacion en Supabase:', recError);
      } else if (recData) {
        const cloudDetalles = detallesList.map(d => ({
          idrecomendacion: recData.idrecomendacion,
          idplan: d.idplan,
          posicion: d.posicion,
          puntajetotal: d.puntajetotal,
          puntajeprecio: d.puntajeprecio,
          puntajevelocidad: d.puntajevelocidad,
          puntajecobertura: d.puntajecobertura,
          puntajeestabilidad: d.puntajeestabilidad,
          preciosnapshot: d.preciosnapshot,
          velocidadsnapshot: d.velocidadsnapshot
        }));

        const { error: detError } = await supabase.from('detallerecomendacion').insert(cloudDetalles);
        if (detError) console.error('Error insertando detallerecomendacion en Supabase:', detError);
        return recData.idrecomendacion;
      }
    } catch (error) {
      console.error('Excepción al guardar simulación en Supabase:', error);
    }
  }

  return recId;
}

export async function getHistorialByPerfil(perfilId) {
  let cloudHistorial = [];

  if (isSupabaseConfigured) {
    try {
      let targetId = perfilId;
      if (!targetId || targetId === '00000000-0000-0000-0000-000000000000') {
        targetId = await getOrCreateUserProfileId();
      }

      // FIX N+1: una sola consulta con nested select en lugar de un bucle
      let query = supabase
        .from('recomendacionresult')
        .select('*, detallerecomendacion(*, plantelecomunicacion(*))')
        .order('fechacalculo', { ascending: false });

      if (targetId) {
        query = query.eq('idperfil', targetId);
      } else {
        query = query.limit(20);
      }

      const { data: recomendaciones, error: recError } = await query;
      if (!recError && recomendaciones && recomendaciones.length > 0) {
        for (const rec of recomendaciones) {
          const detalles = (rec.detallerecomendacion || []).sort(
            (a, b) => (a.posicion || 0) - (b.posicion || 0)
          );
          // Extraer la relación anidada para mantener la misma estructura
          const { detallerecomendacion: _, ...recomendacionClean } = rec;
          cloudHistorial.push({ recomendacion: recomendacionClean, detalles });
        }
      }
    } catch (error) {
      console.error('Error obteniendo historial de Supabase:', error);
    }
  }

  // Retrieve items from local storage
  const localHistorial = getFromLocalStorage();

  // Combine Cloud and Local storage, avoiding duplicates by idrecomendacion
  const map = new Map();
  for (const item of cloudHistorial) {
    if (item.recomendacion?.idrecomendacion) {
      map.set(item.recomendacion.idrecomendacion, item);
    }
  }
  for (const item of localHistorial) {
    if (item.recomendacion?.idrecomendacion && !map.has(item.recomendacion.idrecomendacion)) {
      map.set(item.recomendacion.idrecomendacion, item);
    }
  }

  const result = Array.from(map.values());
  result.sort((a, b) => new Date(b.recomendacion?.fechacalculo || 0) - new Date(a.recomendacion?.fechacalculo || 0));

  return result;
}

export async function fetchKpiPrecioVelocidad(desde, hasta, zonaId = null) {
  if (!isSupabaseConfigured) return [];
  let query = supabase.from('vw_kpi_precio_velocidad').select('*');
  if (desde && hasta) {
    query = query.gte('fechacalculo', desde).lte('fechacalculo', hasta);
  }
  const { data, error } = await query;
  if (error) { console.error(error); return []; }
  return data;
}

export async function fetchKpiZonas(desde, hasta) {
  if (!isSupabaseConfigured) return [];
  let query = supabase.from('vw_kpi_zonas').select('*');
  if (desde && hasta) {
    query = query.gte('fechacalculo', desde).lte('fechacalculo', hasta);
  }
  const { data, error } = await query;
  if (error) { console.error(error); return []; }
  return data;
}

export async function fetchKpiSimulaciones(desde, hasta) {
  if (!isSupabaseConfigured) return [];
  let query = supabase.from('vw_kpi_simulaciones').select('*');
  if (desde && hasta) {
    query = query.gte('fechacalculo', desde).lte('fechacalculo', hasta);
  }
  const { data, error } = await query;
  if (error) { console.error(error); return []; }
  return data;
}
