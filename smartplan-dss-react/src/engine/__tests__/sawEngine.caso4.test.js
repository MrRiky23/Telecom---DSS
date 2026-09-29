/**
 * §4.4 Caso 4 — simulación de PRESUPUESTO (no de peso)
 * Mismo perfil y catálogo del Caso 1 (pesos 0.61/0.28/0.11).
 */
import { describe, it, expect } from 'vitest';
import { calculateSAW } from '../sawEngine';

describe('§4.4 Caso 4 — simulación de presupuesto', () => {
  const planes = [
    { idPlan: 1, precioMensual: 100, velocidadMbps: 100, nivelCobertura: 'alta', indiceEstabilidad: 90, activo: true },
    { idPlan: 2, precioMensual: 80, velocidadMbps: 50, nivelCobertura: 'media', indiceEstabilidad: 80, activo: true },
    { idPlan: 3, precioMensual: 120, velocidadMbps: 200, nivelCobertura: 'alta', indiceEstabilidad: 70, activo: true },
    { idPlan: 4, precioMensual: 200, velocidadMbps: 300, nivelCobertura: 'alta', indiceEstabilidad: 95, activo: true },
    { idPlan: 5, precioMensual: 60, velocidadMbps: 30, nivelCobertura: 'baja', indiceEstabilidad: 60, activo: true },
  ];
  const pesos = { pesoPrecio: 0.61, pesoVelocidad: 0.28, pesoCobertura: 0.11, pesoEstabilidad: 0 };

  it('presupuesto 200: entra D (200<=200), C queda 1°', () => {
    // Precio ∈[60,200]; velocidad ∈[30,300]
    const { top3, todos } = calculateSAW(planes, pesos, 200);
    expect(top3.map(p => p.idPlan)).toEqual([3, 1, 5]); // C, A, E
    expect(todos.find(p => p.idPlan === 3).puntajeGlobal).toBeCloseTo(0.6349, 3);
    expect(todos.find(p => p.idPlan === 1).puntajeGlobal).toBeCloseTo(0.6183, 3);
    expect(todos.find(p => p.idPlan === 5).puntajeGlobal).toBeCloseTo(0.6100, 4);
    expect(todos.find(p => p.idPlan === 2).puntajeGlobal).toBeCloseTo(0.5986, 3);
    expect(todos.find(p => p.idPlan === 4).puntajeGlobal).toBeCloseTo(0.3900, 4);
  });

  it('presupuesto 90: solo B y E (A/C/D excluidos); E queda 1°', () => {
    const { top3, todos, candidatos, mensaje } = calculateSAW(planes, pesos, 90);
    expect(candidatos.map(p => p.idPlan)).toEqual([2, 5]); // B, E
    expect(top3.map(p => p.idPlan)).toEqual([5, 2]); // E primero
    expect(todos.find(p => p.idPlan === 5).puntajeGlobal).toBeCloseTo(0.6100, 4);
    expect(todos.find(p => p.idPlan === 2).puntajeGlobal).toBeCloseTo(0.3350, 3);
    expect(mensaje).toMatch(/Solo se encontraron 2/);
  });

  it('presupuesto exactamente igual al precio de un plan lo incluye (<=, no <)', () => {
    // Plan 4 tiene precio 200; presupuesto 200 debe incluirlo
    const { candidatos } = calculateSAW(planes, pesos, 200);
    expect(candidatos.some(p => p.idPlan === 4)).toBe(true);
  });
});
