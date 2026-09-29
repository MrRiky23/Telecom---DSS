/**
 * Pruebas del oráculo — PRD SmartPlan DSS v1.2, §4.
 * Los 4 casos y sus valores exactos están definidos en el PRD (§4.1-§4.4);
 * los puntajes fueron recalculados ahí con decimal.Decimal y redondeo half-up.
 * RNF-13 exige que las 4 tablas del oráculo pasen antes de aprobar cualquier
 * PR que toque el motor SAW.
 */
import { describe, it, expect } from 'vitest';
import { calculateSAW, simularAjusteDePeso, pesosDesdeCriteriosROC } from '../sawEngine';

function pesos(precio, velocidad, cobertura, estabilidad) {
  return { pesoPrecio: precio, pesoVelocidad: velocidad, pesoCobertura: cobertura, pesoEstabilidad: estabilidad };
}

describe('§4.0 Tabla de pesos ROC', () => {
  it('2 criterios → 0.75 / 0.25', () => {
    expect(pesosDesdeCriteriosROC(['precio', 'velocidad'])).toEqual(
      pesos(0.75, 0.25, 0, 0)
    );
  });
  it('3 criterios → 0.61 / 0.28 / 0.11', () => {
    expect(pesosDesdeCriteriosROC(['precio', 'velocidad', 'cobertura'])).toEqual(
      pesos(0.61, 0.28, 0.11, 0)
    );
  });
});

describe('§4.1 Caso 1 — recomendación original y simulación de peso', () => {
  const planes = [
    { idPlan: 1, precioMensual: 100, velocidadMbps: 100, nivelCobertura: 'alta', indiceEstabilidad: 90, activo: true },
    { idPlan: 2, precioMensual: 80, velocidadMbps: 50, nivelCobertura: 'media', indiceEstabilidad: 80, activo: true },
    { idPlan: 3, precioMensual: 120, velocidadMbps: 200, nivelCobertura: 'alta', indiceEstabilidad: 70, activo: true },
    { idPlan: 4, precioMensual: 200, velocidadMbps: 300, nivelCobertura: 'alta', indiceEstabilidad: 95, activo: true },
    { idPlan: 5, precioMensual: 60, velocidadMbps: 30, nivelCobertura: 'baja', indiceEstabilidad: 60, activo: true },
  ];
  const pesosOriginales = pesos(0.61, 0.28, 0.11, 0);

  it('excluye D (200 > 150) y ordena E, B, A, con C fuera del Top 3', () => {
    const { top3, todos } = calculateSAW(planes, pesosOriginales, 150);
    expect(todos.map((p) => p.idPlan)).toEqual([5, 2, 1, 3]); // E, B, A, C
    expect(top3.map((p) => p.idPlan)).toEqual([5, 2, 1]);
    expect(todos.find((p) => p.idPlan === 5).puntajeGlobal).toBeCloseTo(0.61, 4);
    expect(todos.find((p) => p.idPlan === 2).puntajeGlobal).toBeCloseTo(0.4946, 3);
    expect(todos.find((p) => p.idPlan === 1).puntajeGlobal).toBeCloseTo(0.4286, 3);
    expect(todos.find((p) => p.idPlan === 3).puntajeGlobal).toBeCloseTo(0.39, 4);
  });

  it('simulación de peso (Precio 0.61 → 0.30) reordena a C, A, B con E fuera', () => {
    const pesosSimulados = simularAjusteDePeso(pesosOriginales, 'precio', 0.30);
    expect(pesosSimulados).toEqual(pesos(0.3, 0.5, 0.2, 0));

    const { top3, todos } = calculateSAW(planes, pesosSimulados, 150);
    expect(todos.map((p) => p.idPlan)).toEqual([3, 1, 2, 5]); // C, A, B, E
    expect(top3.map((p) => p.idPlan)).toEqual([3, 1, 2]);
    expect(todos.find((p) => p.idPlan === 3).puntajeGlobal).toBeCloseTo(0.7, 3);
    expect(todos.find((p) => p.idPlan === 1).puntajeGlobal).toBeCloseTo(0.5059, 3);
    expect(todos.find((p) => p.idPlan === 2).puntajeGlobal).toBeCloseTo(0.3588, 3);
    expect(todos.find((p) => p.idPlan === 5).puntajeGlobal).toBeCloseTo(0.3, 4);
  });
});

describe('§4.2 Caso 2 — estabilidad activa y desempate en 3 niveles', () => {
  const planes = [
    { idPlan: 7, precioMensual: 100, velocidadMbps: 100, nivelCobertura: 'alta', indiceEstabilidad: 80, activo: true },
    { idPlan: 12, precioMensual: 100, velocidadMbps: 150, nivelCobertura: 'media', indiceEstabilidad: 80, activo: true },
    { idPlan: 3, precioMensual: 150, velocidadMbps: 120, nivelCobertura: 'alta', indiceEstabilidad: 90, activo: true },
    { idPlan: 9, precioMensual: 200, velocidadMbps: 300, nivelCobertura: 'alta', indiceEstabilidad: 60, activo: true },
  ];
  const pesosCaso = pesos(0.25, 0, 0, 0.75); // Estabilidad, Precio → 0.75/0.25

  it('Q (idPlan 7) gana el desempate contra P (idPlan 12) por idPlan menor', () => {
    const { todos } = calculateSAW(planes, pesosCaso, 200);
    expect(todos.map((p) => p.idPlan)).toEqual([7, 12, 3, 9]);
    expect(todos[0].puntajeGlobal).toBeCloseTo(0.85, 3);
    expect(todos[1].puntajeGlobal).toBeCloseTo(0.85, 3);
    expect(todos[2].puntajeGlobal).toBeCloseTo(0.8, 3);
    expect(todos[3].puntajeGlobal).toBeCloseTo(0.45, 3);
  });
});

describe('§4.3 Caso 3 — max = min con solo 2 candidatos', () => {
  const planes = [
    { idPlan: 21, precioMensual: 90, velocidadMbps: 100, nivelCobertura: 'alta', indiceEstabilidad: 0, activo: true },
    { idPlan: 22, precioMensual: 90, velocidadMbps: 100, nivelCobertura: 'baja', indiceEstabilidad: 0, activo: true },
    { idPlan: 23, precioMensual: 95, velocidadMbps: 100, nivelCobertura: 'alta', indiceEstabilidad: 0, activo: true },
  ];
  const pesosCaso = pesos(0, 0.75, 0.25, 0);

  it('H se excluye (95 > 90); F y G reciben 1.0000 en velocidad por max=min', () => {
    const { candidatos, todos, mensaje } = calculateSAW(planes, pesosCaso, 90);
    expect(candidatos.map((p) => p.idPlan)).toEqual([21, 22]);
    expect(todos.find((p) => p.idPlan === 21).normVelocidad).toBe(1);
    expect(todos.find((p) => p.idPlan === 22).normVelocidad).toBe(1);
    expect(todos.map((p) => p.idPlan)).toEqual([21, 22]);
    expect(todos[0].puntajeGlobal).toBeCloseTo(1, 4);
    expect(todos[1].puntajeGlobal).toBeCloseTo(0.75, 4);
    expect(mensaje).toMatch(/Solo se encontraron 2/);
  });
});

describe('§3.1.5 Caso borde: 0 candidatos', () => {
  it('devuelve top3 vacío y el mensaje exacto, sin lanzar error', () => {
    const planes = [{ idPlan: 1, precioMensual: 500, velocidadMbps: 100, nivelCobertura: 'alta', indiceEstabilidad: 80, activo: true }];
    const { top3, mensaje } = calculateSAW(planes, pesos(0.5, 0.5, 0, 0), 100);
    expect(top3).toEqual([]);
    expect(mensaje).toBe('No hay planes disponibles en tu zona para ese presupuesto.');
  });
});

describe('§4.5 Reescalado de pesos: la suma siempre da 1.00 exacto', () => {
  it('barre las 19 combinaciones de w_nuevo (0.05 a 0.95) para 2 y 3 criterios', () => {
    const combinaciones = [
      pesosDesdeCriteriosROC(['precio', 'velocidad']),
      pesosDesdeCriteriosROC(['precio', 'velocidad', 'cobertura']),
    ];
    combinaciones.forEach((pesosOriginales) => {
      for (let paso = 1; paso <= 19; paso += 1) {
        const wNuevo = Number((paso * 0.05).toFixed(2));
        const resultado = simularAjusteDePeso(pesosOriginales, 'precio', wNuevo);
        const suma = Object.values(resultado).reduce((a, b) => a + b, 0);
        expect(Number(suma.toFixed(2))).toBe(1);
        Object.values(resultado).forEach((w) => expect(w).toBeGreaterThanOrEqual(0));
      }
    });
  });
});
