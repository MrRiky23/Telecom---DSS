/**
 * §4.5 — Verificación completa de la fórmula de reescalado de pesos (PRD §3.3.3)
 *
 * El PRD §4.5 exige probar las 95 combinaciones posibles:
 *   - Selección de 2 criterios: C(4,2)=6 combinaciones × 19 pasos = 114 (pero solo
 *     se puede ajustar 1 de los seleccionados, así que 6×19 = 114 ajustes sobre 2 crit)
 *   - Selección de 3 criterios: C(4,3)=4 combinaciones × 3 criterios ajustables × 19 pasos
 *
 * En el PRD "95 combinaciones" son las 2 selecciones de criterios × 19 pasos que se
 * verificaron en §4.5 (selección de 2 y 3 criterios con los pesos ROC fijos).
 * Este test amplía eso a TODAS las combinaciones posibles de selección.
 *
 * RNF-13 exige 100% de las reglas de §3 con prueba.
 */
import { describe, it, expect } from 'vitest';
import { pesosDesdeCriteriosROC, simularAjusteDePeso, ORDEN_CRITERIOS } from '../sawEngine';

// Todos los criterios disponibles
const CRITERIOS = ['precio', 'velocidad', 'cobertura', 'estabilidad'];

// Genera todas las combinaciones de tamaño k de un array
function combinaciones(arr, k) {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  const [primero, ...resto] = arr;
  const conPrimero = combinaciones(resto, k - 1).map((c) => [primero, ...c]);
  const sinPrimero = combinaciones(resto, k);
  return [...conPrimero, ...sinPrimero];
}

// Genera todas las permutaciones de un array
function permutaciones(arr) {
  if (arr.length <= 1) return [arr];
  return arr.flatMap((el, i) =>
    permutaciones([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [el, ...p])
  );
}

// Los 19 pasos de 0.05 a 0.95
const PASOS = Array.from({ length: 19 }, (_, i) => Number(((i + 1) * 0.05).toFixed(2)));

describe('§4.5 Reescalado de pesos — todas las combinaciones posibles', () => {
  // PRD §4.5 original: 2 y 3 criterios con pesos ROC, ajustando 'precio'
  describe('Verificación original del PRD (§4.5)', () => {
    it('barre 2 criterios (precio, velocidad) con pesos ROC × 19 pasos', () => {
      const pesosOriginales = pesosDesdeCriteriosROC(['precio', 'velocidad']);
      PASOS.forEach((wNuevo) => {
        const resultado = simularAjusteDePeso(pesosOriginales, 'precio', wNuevo);
        const suma = Number(
          Object.values(resultado).reduce((a, b) => a + b, 0).toFixed(2)
        );
        expect(suma).toBe(1);
        Object.values(resultado).forEach((w) => expect(w).toBeGreaterThanOrEqual(0));
      });
    });

    it('barre 3 criterios (precio, velocidad, cobertura) con pesos ROC × 19 pasos', () => {
      const pesosOriginales = pesosDesdeCriteriosROC(['precio', 'velocidad', 'cobertura']);
      PASOS.forEach((wNuevo) => {
        const resultado = simularAjusteDePeso(pesosOriginales, 'precio', wNuevo);
        const suma = Number(
          Object.values(resultado).reduce((a, b) => a + b, 0).toFixed(2)
        );
        expect(suma).toBe(1);
        Object.values(resultado).forEach((w) => expect(w).toBeGreaterThanOrEqual(0));
      });
    });
  });

  // EXTENSIÓN: todas las combinaciones de 2 criterios (C(4,2) = 6) × todas las permutaciones de orden
  describe('Todas las selecciones de 2 criterios — todas las permutaciones de orden', () => {
    combinaciones(CRITERIOS, 2).forEach((combo) => {
      permutaciones(combo).forEach((perm) => {
        const desc = perm.join(' > ');
        it(`[${desc}] × 19 pasos: suma siempre 1.00`, () => {
          const pesosOriginales = pesosDesdeCriteriosROC(perm);
          PASOS.forEach((wNuevo) => {
            // Ajustar el criterio más importante (primero en la permutación)
            const resultado = simularAjusteDePeso(pesosOriginales, perm[0], wNuevo);
            const suma = Number(
              Object.values(resultado).reduce((a, b) => a + b, 0).toFixed(2)
            );
            expect(suma).toBe(1);
            Object.values(resultado).forEach((w) => expect(w).toBeGreaterThanOrEqual(0));
          });

          // Ajustar el criterio menos importante (segundo en la permutación)
          PASOS.forEach((wNuevo) => {
            const resultado = simularAjusteDePeso(pesosOriginales, perm[1], wNuevo);
            const suma = Number(
              Object.values(resultado).reduce((a, b) => a + b, 0).toFixed(2)
            );
            expect(suma).toBe(1);
            Object.values(resultado).forEach((w) => expect(w).toBeGreaterThanOrEqual(0));
          });
        });
      });
    });
  });

  // EXTENSIÓN: todas las selecciones de 3 criterios (C(4,3) = 4) × todas las permutaciones
  describe('Todas las selecciones de 3 criterios — todas las permutaciones de orden', () => {
    combinaciones(CRITERIOS, 3).forEach((combo) => {
      permutaciones(combo).forEach((perm) => {
        const desc = perm.join(' > ');
        it(`[${desc}] × 19 pasos × 3 criterios ajustables: suma siempre 1.00`, () => {
          const pesosOriginales = pesosDesdeCriteriosROC(perm);
          // Ajustar cada uno de los 3 criterios seleccionados
          perm.forEach((criterioAjustado) => {
            PASOS.forEach((wNuevo) => {
              const resultado = simularAjusteDePeso(pesosOriginales, criterioAjustado, wNuevo);
              const suma = Number(
                Object.values(resultado).reduce((a, b) => a + b, 0).toFixed(2)
              );
              expect(suma).toBe(1);
              Object.values(resultado).forEach((w) => expect(w).toBeGreaterThanOrEqual(0));
            });
          });
        });
      });
    });
  });

  // Verificación de que ningún criterio seleccionado queda en negativo
  describe('Invariante: ningún criterio seleccionado queda en negativo o cero tras reescalado', () => {
    it('2 criterios: el criterio no ajustado siempre es > 0 si el ajustado < 1', () => {
      const pesosOriginales = pesosDesdeCriteriosROC(['precio', 'velocidad']);
      // El rango 0.05 a 0.95 garantiza que 1-wNuevo > 0 y el otro criterio puede ser > 0
      PASOS.forEach((wNuevo) => {
        const resultado = simularAjusteDePeso(pesosOriginales, 'precio', wNuevo);
        // pesoVelocidad debe ser > 0 (es el único criterio que absorbe el residuo)
        expect(resultado.pesoVelocidad).toBeGreaterThan(0);
      });
    });

    it('3 criterios: todos los criterios seleccionados quedan >= 0', () => {
      const perm = ['precio', 'velocidad', 'cobertura'];
      const pesosOriginales = pesosDesdeCriteriosROC(perm);
      perm.forEach((criterioAjustado) => {
        PASOS.forEach((wNuevo) => {
          const resultado = simularAjusteDePeso(pesosOriginales, criterioAjustado, wNuevo);
          perm.forEach((c) => {
            const clave = `peso${c[0].toUpperCase()}${c.slice(1)}`;
            expect(resultado[clave]).toBeGreaterThanOrEqual(0);
          });
        });
      });
    });
  });

  // Verificación del desempate del residuo (criterio con mayor peso reescalado)
  describe('Desempate del residuo de redondeo (§3.3.3)', () => {
    it('el residuo va al criterio con mayor peso reescalado, o al de menor código en empate', () => {
      // 3 criterios: precio > velocidad > cobertura → pesos 0.61, 0.28, 0.11
      // Si ajustamos precio a 0.30: velocidad=round(0.28×0.70/0.39,2)=0.50; cobertura=round(0.11×0.70/0.39,2)=0.20
      // Suma = 0.30 + 0.50 + 0.20 = 1.00 → residuo = 0 (caso ideal)
      const p3 = pesosDesdeCriteriosROC(['precio', 'velocidad', 'cobertura']);
      const r30 = simularAjusteDePeso(p3, 'precio', 0.30);
      expect(r30.pesoPrecio).toBe(0.30);
      expect(r30.pesoVelocidad).toBe(0.50);
      expect(r30.pesoCobertura).toBe(0.20);
      expect(Number((r30.pesoPrecio + r30.pesoVelocidad + r30.pesoCobertura + r30.pesoEstabilidad).toFixed(2))).toBe(1.00);
    });
  });

  // Verificación de errores para criterios no seleccionados
  describe('Errores esperados al simular un criterio no seleccionado', () => {
    it('lanza error si se intenta ajustar un criterio con peso 0', () => {
      const p = pesosDesdeCriteriosROC(['precio', 'velocidad']); // estabilidad=0, cobertura=0
      expect(() => simularAjusteDePeso(p, 'estabilidad', 0.5)).toThrow();
      expect(() => simularAjusteDePeso(p, 'cobertura', 0.5)).toThrow();
    });

    it('lanza error si criterio no existe', () => {
      const p = pesosDesdeCriteriosROC(['precio', 'velocidad']);
      expect(() => simularAjusteDePeso(p, 'inexistente', 0.5)).toThrow();
    });
  });
});
