import { supabase, isSupabaseConfigured } from './supabaseClient'

// ============================================================================
// Helper: mapea columnas snake_case de Postgres → camelCase de React
// ============================================================================
function mapPlan(p) {
  return {
    idPlan:            p.idplan            || p.idPlan,
    proveedor:         p.proveedor,
    nombrePlan:        p.nombreplan        || p.nombrePlan,
    precioMensual:     Number(p.preciomensual   || p.precioMensual   || 0),
    velocidadMbps:     Number(p.velocidadmbps   || p.velocidadMbps   || 0),
    limiteDatosGB:     Number(p.limitedatosgb   || p.limiteDatosGB   || 0),
    nivelCobertura:    p.nivelcobertura    || p.nivelCobertura    || 'Alta',
    tecnologia:        p.tecnologia        || 'FTTH',
    indiceEstabilidad: Number(p.indiceestabilidad || p.indiceEstabilidad || 90),
    activo:            p.activo !== false,
    idZona:            p.idzona            || p.idZona            || 1,
    descripcion:       p.descripcion       || '',
    disponibilidadSoporte: p.disponibilidadsoporte || p.disponibilidadSoporte || ''
  };
}

function mapZona(z) {
  return {
    idZona:           z.idzona           || z.idZona,
    nombreSector:     z.nombresector     || z.nombreSector,
    porcentajeAlta:   Number(z.porcentajealta  || z.porcentajeAlta),
    porcentajeMedia:  Number(z.porcentajemedia || z.porcentajeMedia),
    porcentajeBaja:   Number(z.porcentajebaja  || z.porcentajeBaja)
  };
}

// ============================================================================
// Carga inicial desde Supabase al arrancar la app
// ============================================================================
export async function loadInitialDataFromSupabase() {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    // 1. Cargar Planes
    const { data: rawPlanes, error: errPlanes } = await supabase
      .from('plantelecomunicacion')
      .select('*')
      .order('idplan', { ascending: true });

    if (errPlanes) console.warn('Supabase fetch planes error:', errPlanes);

    // 2. Cargar Zonas
    const { data: rawZonas, error: errZonas } = await supabase
      .from('zonacobertura')
      .select('*')
      .order('idzona', { ascending: true });

    if (errZonas) console.warn('Supabase fetch zonas error:', errZonas);

    // 3. Cargar matriz zona×proveedor (D-6: cumplimiento completo)
    const { data: rawCoberturas, error: errCob } = await supabase
      .from('zonaproveedor')
      .select('*');

    if (errCob) console.warn('Supabase fetch zonaproveedor error:', errCob);

    // 4. Cargar Pesos
    const { data: rawPesos } = await supabase
      .from('criterioponderacion')
      .select('*')
      .limit(1);

    const pRow = rawPesos && rawPesos[0];
    const pesosMapped = pRow ? {
      pesoPrecio:      Number(pRow.pesoprecio      || pRow.pesoPrecio),
      pesoVelocidad:   Number(pRow.pesovelocidad   || pRow.pesoVelocidad),
      pesoCobertura:   Number(pRow.pesocobertura   || pRow.pesoCobertura),
      pesoEstabilidad: Number(pRow.pesoestabilidad || pRow.pesoEstabilidad)
    } : null;

    return {
      planes: rawPlanes ? rawPlanes.map(mapPlan) : null,
      zonas:  rawZonas  ? rawZonas.map(mapZona)  : null,
      coberturas: rawCoberturas || [],
      pesos:  pesosMapped
    };
  } catch (err) {
    console.error('Error al conectar con Supabase Cloud:', err);
    return null;
  }
}

// ============================================================================
// BUG FIX #1: syncInsertPlan ahora retorna el idPlan real generado por Supabase
// El caller debe usar el idPlan devuelto para sincronizar el estado React.
// ============================================================================
export async function syncInsertPlan(plan) {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data, error } = await supabase
    .from('plantelecomunicacion')
    .insert([{
      proveedor:         plan.proveedor,
      nombreplan:        plan.nombrePlan,
      preciomensual:     plan.precioMensual,
      velocidadmbps:     plan.velocidadMbps,
      limitedatosgb:     plan.limiteDatosGB || 0,
      nivelcobertura:    plan.nivelCobertura,
      tecnologia:        plan.tecnologia,
      indiceestabilidad: plan.indiceEstabilidad || 90,
      activo:            plan.activo !== false,
      idzona:            plan.idZona || 1
    }])
    .select()   // ← retorna la fila insertada con el SERIAL idplan real
    .single();

  if (error) {
    console.error('Error al insertar plan en Supabase:', error);
    return null;
  }

  // Retorna el idPlan generado por la BD (SERIAL) para sincronizar React
  return data ? (data.idplan || data.idPlan) : null;
}

// ============================================================================
// BUG FIX #2: syncUpdatePlan ahora incluye activo e idzona
// ============================================================================
export async function syncUpdatePlan(plan) {
  if (!isSupabaseConfigured || !supabase) return;

  const { error } = await supabase
    .from('plantelecomunicacion')
    .update({
      proveedor:         plan.proveedor,
      nombreplan:        plan.nombrePlan,
      preciomensual:     plan.precioMensual,
      velocidadmbps:     plan.velocidadMbps,
      limitedatosgb:     plan.limiteDatosGB || 0,
      nivelcobertura:    plan.nivelCobertura,
      tecnologia:        plan.tecnologia,
      indiceestabilidad: plan.indiceEstabilidad || 90,
      activo:            plan.activo !== false,   // ← BUG FIX: campo faltante
      idzona:            plan.idZona || 1          // ← BUG FIX: campo faltante
    })
    .eq('idplan', plan.idPlan);

  if (error) console.error('Error al actualizar plan en Supabase:', error);
}

// ============================================================================
// syncDeletePlan — sin cambios necesarios
// ============================================================================
export async function syncDeletePlan(idPlan) {
  if (!isSupabaseConfigured || !supabase) return;

  const { error } = await supabase
    .from('plantelecomunicacion')
    .delete()
    .eq('idplan', idPlan);

  if (error) console.error('Error al eliminar plan en Supabase:', error);
}
