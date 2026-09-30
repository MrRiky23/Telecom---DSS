import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export async function getOrCreateUserProfileId() {
  if (!isSupabaseConfigured) throw new Error("Supabase no está configurado.");
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No hay usuario autenticado.");

    const { data: pData } = await supabase
      .from('perfilusuario')
      .select('idperfil')
      .eq('user_id', user.id)
      .maybeSingle();

    if (pData?.idperfil) return pData.idperfil;

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

    if (!pErr) return newProfile?.idperfil || newId;

    // El insert falló (p. ej. otro proceso ya creó el perfil): se reintenta leer el existente.
    const { data: existente } = await supabase
      .from('perfilusuario')
      .select('idperfil')
      .eq('user_id', user.id)
      .maybeSingle();
    if (existente?.idperfil) return existente.idperfil;

    // No se devuelve un id inventado: no existe en la BD y rompería la llave foránea después.
    throw pErr;
  } catch (err) {
    console.error("Error al obtener/crear perfil de usuario:", err);
    throw err;
  }
}

export async function saveRecomendacion(perfilId, zonaId, pesos, presupuesto, top3) {
  if (!isSupabaseConfigured) throw new Error("La base de datos no está disponible. No se puede guardar. (RNF-14)");

  let targetPerfilId = perfilId;
  if (!targetPerfilId || targetPerfilId === '00000000-0000-0000-0000-000000000000') {
    targetPerfilId = await getOrCreateUserProfileId();
  }

  // Llamada al motor SAW en PostgreSQL
  const { data: recId, error } = await supabase.rpc('fn_ejecutar_motor_saw', {
    p_idperfil: targetPerfilId,
    p_idzona: Number(zonaId || 1),
    p_presupuesto: Number(presupuesto || 300),
    p_pesoprecio: Number(pesos.pesoPrecio || 0),
    p_pesovelocidad: Number(pesos.pesoVelocidad || 0),
    p_pesocobertura: Number(pesos.pesoCobertura || 0),
    p_pesoestabilidad: Number(pesos.pesoEstabilidad || 0),
    p_essimulacion: false,
    p_idrecomendacionorigen: null,
    p_tiposimulacion: null,
    p_criteriomodificado: null
  });

  if (error) {
    console.error('Error al guardar recomendación vía RPC:', error);
    throw error;
  }

  return recId;
}

export async function saveSimulacion(idRecomendacionOrigen, tipoSimulacion, criterioModificado, pesosSimulados, presupuestoSimulado, top3Simulado, zonaId) {
  if (!isSupabaseConfigured) throw new Error("La base de datos no está disponible. No se puede guardar simulación. (RNF-14)");

  const targetPerfilId = await getOrCreateUserProfileId();

  // La simulación debe usar la misma zona de la recomendación. Si no se recibe,
  // se toma la zona de la recomendación de origen guardada en la BD.
  let zonaSimulacion = Number(zonaId);
  if (!Number.isFinite(zonaSimulacion) || zonaSimulacion <= 0) {
    const { data: origen, error: origenErr } = await supabase
      .from('recomendacionresult')
      .select('idzona')
      .eq('idrecomendacion', idRecomendacionOrigen)
      .maybeSingle();
    if (origenErr || !origen?.idzona) {
      throw new Error('No se pudo determinar la zona de la recomendación de origen.');
    }
    zonaSimulacion = Number(origen.idzona);
  }

  // Llamada al motor SAW para simulación
  const { data: recId, error } = await supabase.rpc('fn_ejecutar_motor_saw', {
    p_idperfil: targetPerfilId,
    p_idzona: zonaSimulacion,
    p_presupuesto: Number(presupuestoSimulado || 300),
    p_pesoprecio: Number(pesosSimulados.pesoPrecio || 0),
    p_pesovelocidad: Number(pesosSimulados.pesoVelocidad || 0),
    p_pesocobertura: Number(pesosSimulados.pesoCobertura || 0),
    p_pesoestabilidad: Number(pesosSimulados.pesoEstabilidad || 0),
    p_essimulacion: true,
    p_idrecomendacionorigen: idRecomendacionOrigen,
    p_tiposimulacion: tipoSimulacion,
    p_criteriomodificado: criterioModificado
  });

  if (error) {
    if (error.code === '23505') return 'DUPLICADO';
    console.error('Error al guardar simulación vía RPC:', error);
    throw error;
  }

  return recId;
}

export async function getHistorialByPerfil(perfilId) {
  if (!isSupabaseConfigured) return [];
  
  let cloudHistorial = [];
  try {
    let targetId = perfilId;
    if (!targetId || targetId === '00000000-0000-0000-0000-000000000000') {
      targetId = await getOrCreateUserProfileId();
    }

    let query = supabase.from('recomendacionresult').select('*').order('fechacalculo', { ascending: false });
    if (targetId) {
      query = query.eq('idperfil', targetId);
    } else {
      query = query.limit(20);
    }

    const { data: recomendaciones, error: recError } = await query;
    if (!recError && recomendaciones && recomendaciones.length > 0) {
      for (const rec of recomendaciones) {
        const { data: detalles, error: detError } = await supabase
          .from('detallerecomendacion')
          .select(`*, plantelecomunicacion(*)`)
          .eq('idrecomendacion', rec.idrecomendacion)
          .order('posicion', { ascending: true });

        if (!detError) {
          cloudHistorial.push({ recomendacion: rec, detalles: detalles || [] });
        }
      }
    }
  } catch (error) {
    console.error('Error obteniendo historial de Supabase:', error);
  }

  return cloudHistorial;
}

const DEFAULT_DESDE = '2020-01-01';
const DEFAULT_HASTA = '2030-01-01';

export async function fetchKpiPrecioVelocidad(desde, hasta, zonaId = null) {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.rpc('fn_kpi_precio_velocidad', {
    p_desde: desde || DEFAULT_DESDE,
    p_hasta: hasta || DEFAULT_HASTA
  });
  if (error) { console.error(error); throw error; }
  return data;
}

export async function fetchKpiZonas(desde, hasta) {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.rpc('fn_kpi_zonas', {
    p_desde: desde || DEFAULT_DESDE,
    p_hasta: hasta || DEFAULT_HASTA
  });
  if (error) { console.error(error); throw error; }
  return data;
}

export async function fetchKpiSimulaciones(desde, hasta) {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.rpc('fn_kpi_simulaciones', {
    p_desde: desde || DEFAULT_DESDE,
    p_hasta: hasta || DEFAULT_HASTA
  });
  if (error) { console.error(error); throw error; }
  return data;
}
