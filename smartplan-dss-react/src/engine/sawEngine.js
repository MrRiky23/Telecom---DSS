/**
 * Motor SAW (Simple Additive Weighting) — SmartPlan DSS
 * Implementación alineada al PRD SmartPlan DSS v1.2, §3 (Motor analítico SAW).
 *
 * Referencias al PRD:
 * - §3.1 (HU-C07): candidatos, normalización, puntaje, desempate, casos borde.
 * - §3.2 (HU-C05): pesos ROC para 2 o 3 criterios (nunca 4).
 * - §3.3 (HU-C08): simulación de una sola variable (peso o presupuesto).
 * - §4: ejemplo oráculo usado para las pruebas (ver test/sawEngine.oracle.test.js).
 *
 * Cobertura por zona (D-6, HU-C02): si se pasa `opciones.coberturas`
 * (matriz zona × proveedor: [{ idzona, proveedor, nivelcobertura }]) junto con
 * `opciones.zonaId`, solo compiten los planes de proveedores con cobertura
 * registrada en esa zona, y `nivelCobertura` de cada plan se toma de esa matriz.
 * Sin matriz (modo demo sin base de datos) no se filtra por zona y se usa el
 * `nivelCobertura` propio del plan.
 */

// ── Tabla de pesos ROC (PRD §3.2 / §4.0) ────────────────────────────────────
// Nunca se seleccionan 4 criterios (D-2); solo 2 o 3.
export const ROC_TABLE = {
  2: [0.75, 0.25],
  3: [0.61, 0.28, 0.11],
};

// Orden fijo de criterios para desempates de reescalado (§3.3.3)
export const ORDEN_CRITERIOS = ['precio', 'velocidad', 'cobertura', 'estabilidad'];

const CLAVE_PESO = {
  precio: 'pesoPrecio',
  velocidad: 'pesoVelocidad',
  cobertura: 'pesoCobertura',
  estabilidad: 'pesoEstabilidad',
};

/**
 * Calcula los pesos ROC a partir de una lista ordenada de 2 o 3 criterios
 * (el primero es el más importante). Devuelve un objeto con las 4 claves de
 * peso; los criterios no seleccionados quedan en 0 (§3.2.3).
 */
export function pesosDesdeCriteriosROC(criteriosOrdenados) {
  const n = criteriosOrdenados.length;
  if (n !== 2 && n !== 3) {
    throw new Error('Debe seleccionar exactamente 2 o 3 criterios (D-2).');
  }
  const tabla = ROC_TABLE[n];
  const pesos = { pesoPrecio: 0, pesoVelocidad: 0, pesoCobertura: 0, pesoEstabilidad: 0 };
  criteriosOrdenados.forEach((criterio, i) => {
    const clave = CLAVE_PESO[criterio];
    if (!clave) throw new Error(`Criterio desconocido: ${criterio}`);
    pesos[clave] = tabla[i];
  });
  return pesos;
}

// ── Redondeo half-up a 4 y 2 decimales ──────────────────────────────────────
// El PRD exige `decimal` con redondeo half-up (nunca `double`). JavaScript no
// tiene un tipo decimal nativo; este redondeo con Number es una aproximación
// razonable para los rangos de este dominio (precios/velocidades/pesos con
// pocos decimales), pero no da la garantía binaria exacta de `decimal` en
// .NET/SQL. Si el PRD exige esa garantía a nivel de pruebas de precisión
// arbitraria, hace falta una librería de decimales (p. ej. decimal.js) o
// mover el cálculo al backend.
function roundHalfUp(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
const round4 = (v) => roundHalfUp(v, 4);
const round2 = (v) => roundHalfUp(v, 2);

function mapCoberturaToScore(nivel) {
  switch ((nivel || '').toLowerCase()) {
    case 'alta': return 1;
    case 'media': return 0.5;
    case 'baja': return 0;
    default: return 0; // sin dato de cobertura → tratado como "baja" (no premia sin evidencia)
  }
}

/**
 * Normaliza un criterio min-max. Si max === min, todos los candidatos
 * reciben 1,0000 (§3.1.2: no se divide por cero, no premia ni penaliza).
 */
function normalizarMinMax(valor, min, max, esCosto) {
  if (max === min) return 1;
  return esCosto ? (max - valor) / (max - min) : (valor - min) / (max - min);
}

/**
 * Motor SAW.
 *
 * @param {Array} planes - catálogo completo de planes.
 * @param {Object} pesos - { pesoPrecio, pesoVelocidad, pesoCobertura, pesoEstabilidad }, deben sumar 1 (a 2 decimales).
 * @param {number} presupuestoMax - filtro duro de precio (D-5): precio <= presupuesto.
 * @param {Object} [opciones]
 * @param {Array} [opciones.coberturas] - matriz zona × proveedor [{ idzona, proveedor, nivelcobertura }].
 * @param {number} [opciones.zonaId] - zona seleccionada; con `opciones.coberturas` filtra por proveedor con cobertura en esa zona (D-6).
 * @returns {{ candidatos: Array, top3: Array, todos: Array, mensaje: string|null }}
 */
export function calculateSAW(planes = [], pesos = {}, presupuestoMax = Infinity, opciones = {}) {
  const { zonaId, coberturas } = opciones;

  const wPrecio = Number(pesos.pesoPrecio ?? 0);
  const wVelocidad = Number(pesos.pesoVelocidad ?? 0);
  const wCobertura = Number(pesos.pesoCobertura ?? 0);
  const wEstabilidad = Number(pesos.pesoEstabilidad ?? 0);

  // Candidatos (§3.1.1): activos, precio <= presupuesto (filtro duro, D-5),
  // y de la zona solicitada si se especifica la matriz de cobertura (D-6).
  const normProv = (v) => String(v ?? '').trim().toLowerCase();
  const usaMatriz = Array.isArray(coberturas) && coberturas.length > 0 && zonaId != null;

  const candidatos = planes.reduce((acc, p) => {
    if (p.activo === false) return acc;
    if (Number(p.precioMensual) > presupuestoMax) return acc;
    if (usaMatriz) {
      const cob = coberturas.find(
        c => Number(c.idzona) === Number(zonaId) && normProv(c.proveedor) === normProv(p.proveedor)
      );
      if (!cob) return acc; // Excluido por regla D-6 (sin cobertura registrada en la zona)
      // La cobertura del plan es la de su proveedor EN LA ZONA seleccionada.
      acc.push({ ...p, nivelCobertura: cob.nivelcobertura });
    } else {
      acc.push(p);
    }
    return acc;
  }, []);

  // Caso borde: 0 candidatos (§3.1.5) — no se persiste nada, solo se informa.
  if (candidatos.length === 0) {
    return {
      candidatos: [],
      top3: [],
      todos: [],
      kpis: {
        mejorScore: 0,
        mejorPlanNombre: 'Sin candidatos',
        ahorroMaximo: 0,
        planesEvaluados: 0,
        proveedoresActivos: 0,
        indiceCalidadPromedio: 0
      },
      breakdownPromedio: {
        precio: round2(wPrecio * 100),
        velocidad: round2(wVelocidad * 100),
        cobertura: round2(wCobertura * 100),
        estabilidad: round2(wEstabilidad * 100)
      },
      mensaje: 'No hay planes disponibles en tu zona para ese presupuesto.',
    };
  }

  const precios = candidatos.map((p) => Number(p.precioMensual));
  const velocidades = candidatos.map((p) => Number(p.velocidadMbps));
  const minPrecio = Math.min(...precios);
  const maxPrecio = Math.max(...precios);
  const minVelocidad = Math.min(...velocidades);
  const maxVelocidad = Math.max(...velocidades);

  const evaluados = candidatos.map((plan) => {
    const precio = Number(plan.precioMensual);
    const velocidad = Number(plan.velocidadMbps);
    const estabilidad = Number(plan.indiceEstabilidad ?? 0); // 0 es un valor válido: NO usar `||`

    const nPrecio = normalizarMinMax(precio, minPrecio, maxPrecio, true);
    const nVelocidad = normalizarMinMax(velocidad, minVelocidad, maxVelocidad, false);
    const nCobertura = mapCoberturaToScore(plan.nivelCobertura);
    const nEstabilidad = estabilidad / 100;

    const puntajePrecio = wPrecio * nPrecio;
    const puntajeVelocidad = wVelocidad * nVelocidad;
    const puntajeCobertura = wCobertura * nCobertura;
    const puntajeEstabilidad = wEstabilidad * nEstabilidad;

    const puntajeGlobal = round4(puntajePrecio + puntajeVelocidad + puntajeCobertura + puntajeEstabilidad);

    return {
      ...plan,
      normPrecio: nPrecio,
      normVelocidad: nVelocidad,
      normCobertura: nCobertura,
      normEstabilidad: nEstabilidad,
      puntajePrecio,
      puntajeVelocidad,
      puntajeCobertura,
      puntajeEstabilidad,
      puntajeGlobal,
    };
  });

  // Desempate (§3.1.4): (1) menor precio, (2) mayor estabilidad, (3) menor idPlan.
  evaluados.sort((a, b) => {
    if (b.puntajeGlobal !== a.puntajeGlobal) return b.puntajeGlobal - a.puntajeGlobal;
    if (a.precioMensual !== b.precioMensual) return a.precioMensual - b.precioMensual;
    const eA = Number(a.indiceEstabilidad ?? 0);
    const eB = Number(b.indiceEstabilidad ?? 0);
    if (eB !== eA) return eB - eA;
    return a.idPlan - b.idPlan;
  });

  const ranking = evaluados.map((plan, index) => ({ ...plan, posicionRanking: index + 1 }));
  const top3 = ranking.slice(0, 3);

  // Calcular KPIs para el MetricStrip
  const mejorPlan = top3[0];
  const mejorScore = mejorPlan ? round2(mejorPlan.puntajeGlobal * 100) : 0;
  const mejorPlanNombre = mejorPlan ? `${mejorPlan.proveedor} ${mejorPlan.nombrePlan}` : 'Cargando...';

  const precioMasCaro = Math.max(...precios, 0);
  const ahorroMaximo = mejorPlan ? round2(Math.max(0, precioMasCaro - Number(mejorPlan.precioMensual))) : 0;

  const planesEvaluados = ranking.length;
  const proveedoresActivos = new Set(ranking.map(p => p.proveedor)).size;

  const indiceCalidadPromedio = ranking.length > 0
    ? round2((ranking.reduce((acc, p) => acc + (Number(p.indiceEstabilidad ?? 90)), 0) / (ranking.length * 10)))
    : 0;

  const kpis = {
    mejorScore,
    mejorPlanNombre,
    ahorroMaximo,
    planesEvaluados,
    proveedoresActivos,
    indiceCalidadPromedio
  };

  const breakdownPromedio = {
    precio: round2(wPrecio * 100),
    velocidad: round2(wVelocidad * 100),
    cobertura: round2(wCobertura * 100),
    estabilidad: round2(wEstabilidad * 100),
  };

  // Caso borde: 1 o 2 candidatos (§3.1.5) — se devuelven los que haya, con aviso.
  const mensaje = candidatos.length < 3
    ? `Solo se encontraron ${candidatos.length} planes que cumplen tus criterios.`
    : null;

  return { candidatos, top3, todos: ranking, kpis, breakdownPromedio, mensaje };
}

// ── Simulación (PRD §3.3, HU-C08) ───────────────────────────────────────────
// D-4: una simulación modifica EXACTAMENTE una variable: el peso de un
// criterio seleccionado, o el presupuesto máximo. Nunca ambas.

/**
 * Reescala los pesos de los demás criterios seleccionados cuando se cambia
 * el peso de uno de ellos (§3.3.3).
 *
 * w_i' = round(w_i * (1 - w_nuevo) / (1 - w_original), 2)
 *
 * El residuo de redondeo (para que la suma sea exactamente 1,00) se asigna
 * al criterio con mayor peso resultante entre los reescalados; en empate,
 * al de menor código de criterio (Precio < Velocidad < Cobertura < Estabilidad).
 *
 * @param {Object} pesosOriginales - pesos actuales (deben sumar 1,00).
 * @param {string} criterioModificado - uno de 'precio'|'velocidad'|'cobertura'|'estabilidad'.
 * @param {number} nuevoPeso - nuevo peso para criterioModificado, en pasos de 0,05 entre 0,05 y 0,95.
 * @returns {Object} nuevos pesos, sumando exactamente 1,00.
 */
export function simularAjusteDePeso(pesosOriginales, criterioModificado, nuevoPeso) {
  const claveModificada = CLAVE_PESO[criterioModificado];
  if (!claveModificada) throw new Error(`Criterio desconocido: ${criterioModificado}`);

  const wOriginal = Number(pesosOriginales[claveModificada]);
  if (wOriginal <= 0) {
    throw new Error('Solo se puede simular el peso de un criterio seleccionado (peso > 0).');
  }
  if (wOriginal >= 1) {
    throw new Error('No hay otros criterios seleccionados para reescalar.');
  }

  const otros = ORDEN_CRITERIOS.filter((c) => c !== criterioModificado && pesosOriginales[CLAVE_PESO[c]] > 0);

  const reescalados = {};
  otros.forEach((c) => {
    const clave = CLAVE_PESO[c];
    const wi = Number(pesosOriginales[clave]);
    reescalados[c] = round2(wi * (1 - nuevoPeso) / (1 - wOriginal));
  });

  const nuevosPesos = { pesoPrecio: 0, pesoVelocidad: 0, pesoCobertura: 0, pesoEstabilidad: 0 };
  nuevosPesos[claveModificada] = round2(nuevoPeso);
  otros.forEach((c) => { nuevosPesos[CLAVE_PESO[c]] = reescalados[c]; });

  // Ajustar el residuo de redondeo para que la suma sea exactamente 1,00.
  const suma = round2(Object.values(nuevosPesos).reduce((a, b) => a + b, 0));
  const residuo = round2(1 - suma);
  if (residuo !== 0 && otros.length > 0) {
    // Mayor peso reescalado; empate → menor código de criterio (orden fijo).
    let destino = otros[0];
    otros.forEach((c) => {
      if (reescalados[c] > reescalados[destino]) destino = c;
    });
    nuevosPesos[CLAVE_PESO[destino]] = round2(nuevosPesos[CLAVE_PESO[destino]] + residuo);
  }

  return nuevosPesos;
}

/**
 * Simulación de presupuesto (§3.3.4): recalcula candidatos y normalización
 * desde cero con el nuevo presupuesto. No modifica los pesos.
 */
export function simularPresupuesto(planes, pesos, nuevoPresupuesto, opciones = {}) {
  return calculateSAW(planes, pesos, nuevoPresupuesto, opciones);
}
