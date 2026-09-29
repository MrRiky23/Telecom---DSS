import React, { useState, useMemo } from 'react';
import { simularAjusteDePeso } from '../../engine/sawEngine';

const NOMBRE_CRITERIO = {
  precio: 'Precio',
  velocidad: 'Velocidad',
  cobertura: 'Cobertura',
  estabilidad: 'Estabilidad'
};

const CLAVE_PESO = {
  precio: 'pesoPrecio',
  velocidad: 'pesoVelocidad',
  cobertura: 'pesoCobertura',
  estabilidad: 'pesoEstabilidad'
};

// Posición inicial del slider = peso actual del criterio ajustado al paso de 0,05.
// Dejarlo ahí significa "sin cambios".
const pesoInicialDe = (pesos, criterio) => {
  const actual = Number(pesos?.[CLAVE_PESO[criterio]] ?? 0.5);
  const ajustado = Math.round(actual * 20) / 20;
  return Math.min(0.95, Math.max(0.05, ajustado));
};

const ICONO_CRITERIO = {
  precio: 'fa-tag',
  velocidad: 'fa-bolt',
  cobertura: 'fa-signal',
  estabilidad: 'fa-shield-halved'
};

export default function SimulationModal({
  currentPresupuesto = 300,
  criteriosSeleccionados = ['precio', 'velocidad', 'cobertura'],
  pesos = { pesoPrecio: 0.61, pesoVelocidad: 0.28, pesoCobertura: 0.11, pesoEstabilidad: 0.00 },
  onRunSimulation,
  onConfirmSimulation,
  validarSimulacion,
  onClose
}) {
  const [tipoSimulacion, setTipoSimulacion] = useState('PESO');
  
  // Lista limpia de criterios
  const listaCriterios = criteriosSeleccionados.length > 0
    ? criteriosSeleccionados
    : ['precio', 'velocidad', 'cobertura'];

  const [criterioModificado, setCriterioModificado] = useState(listaCriterios[0]);
  const [nuevoPeso, setNuevoPeso] = useState(() => pesoInicialDe(pesos, listaCriterios[0]));
  const [nuevoPresupuesto, setNuevoPresupuesto] = useState(currentPresupuesto || 300);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Cálculo en tiempo real de los pesos reescalados (§3.3.3)
  const pesosPrevisualizados = useMemo(() => {
    if (tipoSimulacion !== 'PESO' || !criterioModificado) return pesos;
    try {
      return simularAjusteDePeso(pesos, criterioModificado, Number(nuevoPeso));
    } catch (err) {
      return pesos;
    }
  }, [pesos, tipoSimulacion, criterioModificado, nuevoPeso]);

  const pesoBase = pesoInicialDe(pesos, criterioModificado);
  const pesoActualPct = Math.round(Number(pesos?.[CLAVE_PESO[criterioModificado]] ?? 0) * 100);
  const sinCambioPeso = Math.abs(Number(nuevoPeso) - pesoBase) < 1e-9;

  const armarParametros = () => {
    if (tipoSimulacion === 'PESO') {
      if (!criterioModificado) return { error: 'Elige el criterio que quieres modificar.' };
      return { params: { tipoSimulacion: 'PESO', criterioModificado, nuevoPeso: Number(nuevoPeso) } };
    }
    const valor = Number(nuevoPresupuesto);
    if (isNaN(valor) || valor < 1 || valor > 10000) {
      return { error: 'El presupuesto simulado debe estar entre 1 y 10,000 Bs' };
    }
    return { params: { tipoSimulacion: 'PRESUPUESTO', nuevoPresupuesto: valor } };
  };

  // Devuelve un mensaje de error (o null si la simulación es válida y distinta del original).
  const revisar = () => {
    const { params, error } = armarParametros();
    if (error) return { error };
    if (tipoSimulacion === 'PESO' && sinCambioPeso) {
      return { error: 'El peso sigue igual que el actual. Mueve el control para ver qué cambia.' };
    }
    if (tipoSimulacion === 'PRESUPUESTO' && Number(params.nuevoPresupuesto) === Number(currentPresupuesto)) {
      return { error: 'El presupuesto sigue igual que el actual (Bs ' + currentPresupuesto + '). Cámbialo para compararlo.' };
    }
    const errorApp = validarSimulacion ? validarSimulacion(params) : null;
    if (errorApp) return { error: errorApp };
    return { params };
  };

  const handleSimulate = () => {
    setErrorMsg('');
    const { params, error } = revisar();
    if (error) { setErrorMsg(error); return; }
    onRunSimulation(params);
    onClose();
  };

  const handleConfirmAndSave = async () => {
    setErrorMsg('');
    const { params, error } = revisar();
    if (error) { setErrorMsg(error); return; }
    setIsSaving(true);
    try {
      const result = await onConfirmSimulation(params);
      if (result === 'DUPLICADO') {
        setErrorMsg('Ya guardaste una simulación para esta recomendación. Solo se permite una por recomendación.');
      } else if (result) {
        onClose();
      }
    } catch (error) {
      console.error("Error confirmando simulación:", error);
      setErrorMsg('Error al comunicar con la base de datos');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius-lg, 16px)',
        width: '100%',
        maxWidth: '560px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
        border: '1px solid var(--neutral-200)',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(90deg, #1A1A2E 0%, #16213E 100%)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--primary-400), var(--primary-600))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem'
            }}>
              <i className="fa-solid fa-flask"></i>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>
                Simulador de escenarios
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#A0A0B8' }}>
                Cambia una sola cosa a la vez: un peso o el presupuesto
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#A0A0B8',
              fontSize: '1.2rem',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px'
            }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px' }}>
          {errorMsg && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#DC2626',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md, 10px)',
              marginBottom: '16px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Mode Selector Tabs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            background: 'var(--neutral-100)',
            padding: '4px',
            borderRadius: 'var(--radius-md, 10px)',
            marginBottom: '20px'
          }}>
            <button
              type="button"
              onClick={() => { setTipoSimulacion('PESO'); setErrorMsg(''); }}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: tipoSimulacion === 'PESO' ? 'white' : 'transparent',
                color: tipoSimulacion === 'PESO' ? 'var(--primary-600)' : 'var(--neutral-600)',
                fontWeight: tipoSimulacion === 'PESO' ? 700 : 500,
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: tipoSimulacion === 'PESO' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <i className="fa-solid fa-sliders"></i> Ajustar un peso
            </button>

            <button
              type="button"
              onClick={() => { setTipoSimulacion('PRESUPUESTO'); setErrorMsg(''); }}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: tipoSimulacion === 'PRESUPUESTO' ? 'white' : 'transparent',
                color: tipoSimulacion === 'PRESUPUESTO' ? 'var(--primary-600)' : 'var(--neutral-600)',
                fontWeight: tipoSimulacion === 'PRESUPUESTO' ? 700 : 500,
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: tipoSimulacion === 'PRESUPUESTO' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <i className="fa-solid fa-wallet"></i> Ajustar presupuesto
            </button>
          </div>

          {/* Controls Form */}
          {tipoSimulacion === 'PESO' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

              {/* Selector Criterio */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', color: 'var(--neutral-800)', marginBottom: '8px' }}>
                  Criterio a modificar:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                  {listaCriterios.map(c => {
                    const isSelected = criterioModificado === c;
                    return (
                      <div
                        key={c}
                        onClick={() => { setCriterioModificado(c); setNuevoPeso(pesoInicialDe(pesos, c)); setErrorMsg(''); }}
                        style={{
                          padding: '10px',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid var(--primary-500)' : '1px solid var(--neutral-300)',
                          background: isSelected ? 'var(--primary-50)' : 'white',
                          color: isSelected ? 'var(--primary-800)' : 'var(--neutral-700)',
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <i className={`fa-solid ${ICONO_CRITERIO[c] || 'fa-sliders'}`} style={{ color: isSelected ? 'var(--primary-500)' : 'var(--neutral-400)' }}></i>
                        <span>{NOMBRE_CRITERIO[c] || c}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Slider Peso */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--neutral-800)' }}>
                    Nuevo Peso para "{NOMBRE_CRITERIO[criterioModificado] || criterioModificado}":
                  </label>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-600)' }}>
                    {sinCambioPeso
                      ? `${pesoActualPct}% (actual, sin cambios)`
                      : `${Math.round(nuevoPeso * 100)}% (actual: ${pesoActualPct}%)`}
                  </span>
                </div>

                <input
                  type="range"
                  min="0.05"
                  max="0.95"
                  step="0.05"
                  value={nuevoPeso}
                  onChange={(e) => { setNuevoPeso(parseFloat(e.target.value)); if (errorMsg) setErrorMsg(''); }}
                  style={{
                    width: '100%',
                    accentColor: 'var(--primary-500)',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--neutral-500)', marginTop: '4px' }}>
                  <span>5% (Mínimo)</span>
                  <span>50%</span>
                  <span>95% (Máximo)</span>
                </div>
              </div>

              {/* Live Preview Bar Matrix */}
              <div style={{ background: 'var(--neutral-50)', padding: '14px', borderRadius: 'var(--radius-md, 10px)', border: '1px solid var(--neutral-200)' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--neutral-600)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Pesos: antes → después (los demás criterios se reajustan solos)
                </span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {Object.entries(pesosPrevisualizados).map(([k, val]) => {
                    const cName = k.replace('peso', '').toLowerCase();
                    const antes = Number(pesos?.[k] ?? 0);
                    if (val <= 0 && antes <= 0) return null;
                    const cambio = Math.round(val * 100) !== Math.round(antes * 100);
                    return (
                      <span key={k} style={{ background: cambio ? 'var(--primary-50)' : 'white', border: cambio ? '1px solid var(--primary-300)' : '1px solid var(--neutral-300)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600 }}>
                        {NOMBRE_CRITERIO[cName] || cName}:{' '}
                        {cambio && <span style={{ color: 'var(--neutral-500)', fontWeight: 500 }}>{Math.round(antes * 100)}% → </span>}
                        <strong style={{ color: 'var(--primary-600)' }}>{Math.round(val * 100)}%</strong>
                      </span>
                    );
                  })}
                </div>
              </div>

            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', color: 'var(--neutral-800)', marginBottom: '8px' }}>
                  Nuevo presupuesto máximo mensual (Bs) — actual: Bs {currentPresupuesto}
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: 'var(--neutral-500)' }}>Bs</span>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={nuevoPresupuesto}
                    onChange={(e) => {
                      setNuevoPresupuesto(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 42px',
                      borderRadius: 'var(--radius-md, 10px)',
                      border: '1px solid var(--neutral-300)',
                      fontSize: '1rem',
                      fontWeight: 700,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', alignSelf: 'center' }}>Accesos rápidos:</span>
                {[150, 200, 300, 450, 600].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setNuevoPresupuesto(val)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '999px',
                      border: '1px solid var(--neutral-300)',
                      background: nuevoPresupuesto == val ? 'var(--primary-50)' : 'white',
                      color: nuevoPresupuesto == val ? 'var(--primary-600)' : 'var(--neutral-700)',
                      fontWeight: 600,
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    Bs {val}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          background: 'var(--neutral-50)',
          borderTop: '1px solid var(--neutral-200)',
          display: 'flex',
          gap: '10px',
          justifyContent: 'flex-end',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            style={{
              padding: '10px 16px',
              borderRadius: 'var(--radius-md, 10px)',
              border: '1px solid var(--neutral-300)',
              background: 'white',
              color: 'var(--neutral-700)',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: isSaving ? 'not-allowed' : 'pointer'
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSimulate}
            disabled={isSaving}
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--radius-md, 10px)',
              border: '1px solid var(--primary-300)',
              background: 'var(--primary-50)',
              color: 'var(--primary-700)',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className="fa-solid fa-eye"></i> Previsualizar
          </button>

          {onConfirmSimulation && (
            <button
              type="button"
              onClick={handleConfirmAndSave}
              disabled={isSaving}
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--radius-md, 10px)',
                background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
                color: 'white',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(200,90,42,0.3)'
              }}
            >
              {isSaving ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Guardando...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk"></i> Confirmar y guardar simulación
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
