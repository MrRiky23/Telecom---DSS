import React, { useState } from 'react'
import { pesosDesdeCriteriosROC, ROC_TABLE } from '../../engine/sawEngine'

const CRITERIOS = [
  { key: 'precio', label: 'Precio Mensual (Costo)', color: 'var(--primary-500)' },
  { key: 'velocidad', label: 'Velocidad (Mbps)', color: '#D97706' },
  { key: 'cobertura', label: 'Cobertura por Zona', color: '#10B981' },
  { key: 'estabilidad', label: 'Índice de Estabilidad', color: '#6366F1' },
];

/**
 * Selección de 2 o 3 criterios (PRD §3.2 / HU-C05): nunca 4 (D-2).
 * Los pesos NO se ajustan libremente; salen de la tabla ROC fija según
 * cuántos criterios se eligen y en qué orden de importancia.
 */
export default function WeightAdjustModal({ criteriosSeleccionados, onSave, onClose }) {
  const [seleccion, setSeleccion] = useState(criteriosSeleccionados || ['precio', 'velocidad', 'cobertura']);

  const toggle = (key) => {
    setSeleccion((prev) => {
      if (prev.includes(key)) return prev.filter((c) => c !== key);
      if (prev.length >= 3) return prev; // nunca 4 (D-2)
      return [...prev, key];
    });
  };

  const mover = (key, dir) => {
    setSeleccion((prev) => {
      const idx = prev.indexOf(key);
      const nuevoIdx = idx + dir;
      if (nuevoIdx < 0 || nuevoIdx >= prev.length) return prev;
      const copia = [...prev];
      [copia[idx], copia[nuevoIdx]] = [copia[nuevoIdx], copia[idx]];
      return copia;
    });
  };

  const valido = seleccion.length === 2 || seleccion.length === 3;
  const tablaPesos = valido ? ROC_TABLE[seleccion.length] : null;

  const handleSave = () => {
    if (!valido) return;
    const pesos = pesosDesdeCriteriosROC(seleccion);
    onSave(pesos, seleccion);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h3 className="modal-title">
            <i className="fa-solid fa-sliders" style={{ color: 'var(--primary-500)', marginRight: '8px' }}></i>
            Criterios y pesos
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', marginBottom: '16px' }}>
            Elige entre 2 y 3 criterios, en orden de importancia. El peso de cada uno sale de la tabla ROC fija
            (nunca se seleccionan los 4). Usa las flechas para cambiar el orden de importancia.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {CRITERIOS.map(({ key, label, color }) => {
              const idx = seleccion.indexOf(key);
              const seleccionado = idx !== -1;
              const peso = seleccionado && valido ? tablaPesos[idx] : 0;
              return (
                <div
                  key={key}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 12px', borderRadius: 'var(--radius-md)',
                    border: `1px solid ${seleccionado ? color : 'var(--neutral-200)'}`,
                    background: seleccionado ? 'var(--neutral-50)' : 'transparent',
                  }}
                >
                  <input type="checkbox" checked={seleccionado} onChange={() => toggle(key)} />
                  <span style={{ flex: 1, fontWeight: '600', fontSize: '0.85rem' }}>{label}</span>
                  {seleccionado && (
                    <>
                      <span style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>#{idx + 1}</span>
                      <button type="button" onClick={() => mover(key, -1)} disabled={idx === 0}
                        style={{ border: 'none', background: 'none', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1 }}>
                        <i className="fa-solid fa-arrow-up"></i>
                      </button>
                      <button type="button" onClick={() => mover(key, 1)} disabled={idx === seleccion.length - 1}
                        style={{ border: 'none', background: 'none', cursor: idx === seleccion.length - 1 ? 'default' : 'pointer', opacity: idx === seleccion.length - 1 ? 0.3 : 1 }}>
                        <i className="fa-solid fa-arrow-down"></i>
                      </button>
                      <strong style={{ color, minWidth: '48px', textAlign: 'right' }}>{(peso * 100).toFixed(0)}%</strong>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{
            marginTop: '16px', padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: '0.78rem',
            background: valido ? 'var(--neutral-100)' : '#FEF2F2',
            color: valido ? 'var(--neutral-600)' : 'var(--danger)',
          }}>
            {valido
              ? 'Suma de pesos: 100% (tabla ROC).'
              : 'Selecciona 2 o 3 criterios para continuar.'}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!valido}>
            <i className="fa-solid fa-check"></i> Aplicar y Recalcular
          </button>
        </div>
      </div>
    </div>
  );
}
