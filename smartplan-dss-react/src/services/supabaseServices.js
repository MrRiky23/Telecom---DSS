import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

// ============================================================================
// Helper: mapea columnas snake_case de Postgres → camelCase de React
// ============================================================================
// La cobertura NO vive en plantelecomunicacion: está en zonaproveedor (zona × proveedor).
// Se guarda aquí el último mapa cargado para poder resolverla también al crear/editar planes.
let coberturaLookup = new Map();

const claveCobertura = (idZona, proveedor) =>
  `${Number(idZona)}|${String(proveedor ?? '').trim().toLowerCase()}`;

function capitalizarNivel(nivel) {
  const n = String(nivel ?? '').trim().toLowerCase();
  if (n === 'alta') return 'Alta';
  if (n === 'media') return 'Media';
  if (n === 'baja') return 'Baja';
  return null;
}

// Devuelve 'Alta' | 'Media' | 'Baja', o null si no hay dato para esa zona y proveedor.
export function getNivelCobertura(idZona, proveedor) {
  return coberturaLookup.get(claveCobertura(idZona, proveedor)) ?? null;
}

function mapPlan(p) {
  const idZona = p.idzona || p.idZona || 1;
  return {
    idPlan:            p.idplan            || p.idPlan,
    proveedor:         p.proveedor,
    nombrePlan:        p.nombreplan        || p.nombrePlan,
    precioMensual:     Number(p.preciomensual   ?? p.precioMensual   ?? 0),
    velocidadMbps:     Number(p.velocidadmbps   || p.velocidadMbps   || 0),
    limiteDatosGB:     Number(p.limitedatosgb   ?? p.limiteDatosGB   ?? 0),
    // Sin dato real → null (no se asume 'Alta'); el KPI y el motor tratan null como "sin dato".
    nivelCobertura:    getNivelCobertura(idZona, p.proveedor)
                       ?? capitalizarNivel(p.nivelcobertura ?? p.nivelCobertura),
    tecnologia:        p.tecnologia        || 'FTTH',
    indiceEstabilidad: Number(p.indiceestabilidad ?? p.indiceEstabilidad ?? 90),
    activo:            p.activo !== false,
    idZona,
    descripcion:       p.descripcion       || '',
    disponibilidadSoporte: p.disponibilidadsoporte || p.disponibilidadSoporte || ''
  };
}

function mapZona(z) {
  return {
    idZona:           z.idzona           || z.idZona,
    nombreSector:     z.nombresector     || z.nombreSector,
    activo:           z.activo !== false,
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

    // 2b. Cargar cobertura por zona y proveedor (fuente real del nivel de cobertura)
    const { data: rawCob, error: errCob } = await supabase
      .from('zonaproveedor')
      .select('idzona, proveedor, nivelcobertura');

    if (errCob) console.warn('Supabase fetch zonaproveedor error:', errCob);

    coberturaLookup = new Map(
      (rawCob || [])
        .map(r => [claveCobertura(r.idzona, r.proveedor), capitalizarNivel(r.nivelcobertura)])
        .filter(([, nivel]) => nivel)
    );

    // 3. Cargar Pesos
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
      pesos:  pesosMapped,
      // Matriz zona × proveedor (D-6) para que el motor filtre candidatos por zona.
      coberturas: (rawCob || [])
        .map(r => ({
          idzona: Number(r.idzona),
          proveedor: r.proveedor,
          nivelcobertura: capitalizarNivel(r.nivelcobertura)
        }))
        .filter(c => c.nivelcobertura)
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
      limitedatosgb:     plan.limiteDatosGB ?? 0,
      tecnologia:        plan.tecnologia,
      indiceestabilidad: plan.indiceEstabilidad ?? 90,
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
  if (!isSupabaseConfigured || !supabase) return true;

  const { error } = await supabase
    .from('plantelecomunicacion')
    .update({
      proveedor:         plan.proveedor,
      nombreplan:        plan.nombrePlan,
      preciomensual:     plan.precioMensual,
      velocidadmbps:     plan.velocidadMbps,
      limitedatosgb:     plan.limiteDatosGB ?? 0,
      tecnologia:        plan.tecnologia,
      indiceestabilidad: plan.indiceEstabilidad ?? 90,
      activo:            plan.activo !== false,   // ← BUG FIX: campo faltante
      idzona:            plan.idZona || 1          // ← BUG FIX: campo faltante
    })
    .eq('idplan', plan.idPlan);

  if (error) {
    console.error('Error al actualizar plan en Supabase:', error);
    return false;
  }
  return true;
}

// ============================================================================
// syncDeletePlan — baja lógica (activo = false). No hay borrado físico: el plan
// puede estar referenciado por el historial de recomendaciones y este debe quedar intacto.
// ============================================================================
export async function syncDeletePlan(idPlan) {
  if (!isSupabaseConfigured || !supabase) return true;

  const { error } = await supabase
    .from('plantelecomunicacion')
    .update({ activo: false })
    .eq('idplan', idPlan);

  if (error) {
    console.error('Error al dar de baja el plan en Supabase:', error);
    return false;
  }
  return true;
}
