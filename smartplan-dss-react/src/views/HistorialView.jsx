import React, { useState, useEffect, useMemo } from 'react';
import { getHistorialByPerfil } from '../services/recomendacionService';

const NOMBRES = { precio: 'Precio', velocidad: 'Velocidad', cobertura: 'Cobertura', estabilidad: 'Estabilidad' };
const CLAVES = { precio: 'pesoprecio', velocidad: 'pesovelocidad', cobertura: 'pesocobertura', estabilidad: 'pesoestabilidad' };
const pct = (v) => `${Math.round(Number(v || 0) * 100)}%`;
const idPlanDe = (det) => det.idplan ?? det.plantelecomunicacion?.idplan;

// Compara una simulación con su recomendación de origen y explica qué cambió.
function analizarSimulacion(sim, origen) {
  const r = sim.recomendacion || {};
  const o = origen?.recomendacion || null;
  const tipo = r.tiposimulacion;
  const criterio = r.criteriomodificado;

  let queCambio;
  if (tipo === 'PRESUPUESTO') {
    queCambio = o
      ? `Presupuesto: Bs ${Number(o.presupuestousado)} → Bs ${Number(r.presupuestousado)}`
      : `Presupuesto simulado: Bs ${Number(r.presupuestousado)}`;
  } else {
    const nombre = NOMBRES[criterio] || criterio || 'criterio';
    const clave = CLAVES[criterio];
    queCambio = o && clave
      ? `Peso de ${nombre.toLowerCase()}: ${pct(o[clave])} → ${pct(r[clave])} (los demás criterios se reajustaron)`
      : `Peso de ${nombre.toLowerCase()} simulado: ${clave ? pct(r[clave]) : '—'}`;
  }

  const sinCambios = !!o
    && Number(o.presupuestousado) === Number(r.presupuestousado)
    && Object.values(CLAVES).every((k) => Math.round(Number(o[k] || 0) * 100) === Math.round(Number(r[k] || 0) * 100));

  const detOrigen = origen?.detalles || [];
  const detSim = sim.detalles || [];
  const idsO = detOrigen.map(idPlanDe);
  const idsS = detSim.map(idPlanDe);
  const mismoOrden = idsO.length === idsS.length && idsO.every((id, i) => id === idsS[i]);

  let resumen = null;
  if (sinCambios) {
    resumen = { tono: 'aviso', texto: 'Esta simulación no cambió nada: tiene el mismo presupuesto y los mismos pesos que la recomendación original, por eso el resultado es idéntico.' };
  } else if (o && mismoOrden) {
    resumen = { tono: 'neutro', texto: 'El Top 3 no cambió con este ajuste: la recomendación es estable.' };
  } else if (o) {
    resumen = { tono: 'info', texto: 'El Top 3 cambió respecto a la recomendación original. Abajo se marca qué planes suben, bajan o entran.' };
  }

  const movimiento = (det) => {
    if (!o) return null;
    const previo = detOrigen.find((d) => idPlanDe(d) === idPlanDe(det));
    if (!previo) return { texto: 'Nuevo en el Top 3', color: '#1D4ED8', fondo: '#DBEAFE' };
    if (previo.posicion > det.posicion) return { texto: `▲ sube (era #${previo.posicion})`, color: '#15803D', fondo: '#DCFCE7' };
    if (previo.posicion < det.posicion) return { texto: `▼ baja (era #${previo.posicion})`, color: '#B91C1C', fondo: '#FEE2E2' };
    return { texto: '= igual posición', color: '#57534E', fondo: '#F5F5F4' };
  };

  return { queCambio, sinCambios, resumen, movimiento, criterio };
}

function PesosAplicados({ reco, criterioResaltado }) {
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', marginRight: '4px' }}>Pesos:</span>
      {Object.keys(CLAVES).map((c) => {
        const v = Number(reco[CLAVES[c]] || 0);
        if (v <= 0) return null;
        const resaltado = criterioResaltado === c;
        return (
          <span key={c} style={{ background: resaltado ? 'var(--primary-50)' : 'white', border: resaltado ? '1px solid var(--primary-400)' : '1px solid var(--neutral-300)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
            {NOMBRES[c]}: {pct(v)}
          </span>
        );
      })}
    </div>
  );
}

function TarjetaReco({ item, origen, esSimulacion }) {
  const reco = item.recomendacion || {};
  const fecha = reco.fechacalculo ? new Date(reco.fechacalculo).toLocaleString() : 'Fecha recien guardada';
  const analisis = esSimulacion ? analizarSimulacion(item, origen) : null;
  const tonos = {
    aviso: { fondo: '#FEF3C7', borde: '#FCD34D', color: '#92400E' },
    info: { fondo: '#DBEAFE', borde: '#93C5FD', color: '#1E40AF' },
    neutro: { fondo: '#F5F5F4', borde: '#D6D3D1', color: '#44403C' }
  };

  return (
    <div className="card" style={{
      background: 'white',
      borderRadius: 'var(--radius-lg, 16px)',
      border: esSimulacion ? '1px solid #93C5FD' : '1px solid var(--neutral-200)',
      padding: '20px',
      boxShadow: 'var(--shadow-md)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--neutral-150)', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <i className="fa-regular fa-calendar-check" style={{ color: 'var(--primary-500)', fontSize: '1.1rem' }}></i>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--neutral-900)' }}>{fecha}</span>
          <span style={{ background: 'var(--neutral-100)', color: 'var(--neutral-600)', padding: '2px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600 }}>
            Zona #{reco.idzona || 1}
          </span>
        </div>

        {esSimulacion ? (
          <span style={{ background: '#DBEAFE', color: '#1E40AF', padding: '4px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-flask"></i> SIMULACIÓN · {reco.tiposimulacion === 'PRESUPUESTO' ? 'PRESUPUESTO' : 'PESO'}
          </span>
        ) : (
          <span style={{ background: '#DCFCE7', color: '#166534', padding: '4px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-circle-check"></i> RECOMENDACIÓN ORIGINAL
          </span>
        )}
      </div>

      {esSimulacion && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--neutral-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-arrow-right-arrow-left" style={{ color: '#2563EB' }}></i>
            {analisis.queCambio}
          </div>
          {analisis.resumen && (
            <div style={{ marginTop: '8px', padding: '8px 12px', borderRadius: 'var(--radius-md, 10px)', fontSize: '0.82rem', background: tonos[analisis.resumen.tono].fondo, border: `1px solid ${tonos[analisis.resumen.tono].borde}`, color: tonos[analisis.resumen.tono].color }}>
              {analisis.resumen.texto}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center', background: 'var(--neutral-50)', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}>
        <div>
          <span style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', display: 'block' }}>Presupuesto usado</span>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary-600)' }}>Bs {reco.presupuestousado || 300}</span>
        </div>
        <div style={{ width: '1px', height: '24px', background: 'var(--neutral-300)' }}></div>
        <PesosAplicados reco={reco} criterioResaltado={esSimulacion && reco.tiposimulacion === 'PESO' ? analisis.criterio : null} />
      </div>

      <div>
        <h4 style={{ margin: '0 0 12px', fontSize: '0.88rem', fontWeight: 700, color: 'var(--neutral-700)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Top 3 registrado
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {(item.detalles || []).map((det) => {
            const mov = esSimulacion ? analisis.movimiento(det) : null;
            return (
              <div key={det.iddetalle || det.posicion} style={{
                border: '1px solid var(--neutral-200)',
                borderRadius: 'var(--radius-md, 10px)',
                padding: '14px',
                background: 'white',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  left: '12px',
                  background: 'var(--primary-500)',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}>
                  Posición #{det.posicion}
                </div>
                <h5 style={{ margin: '8px 0 6px', fontSize: '1rem', fontWeight: 700, color: 'var(--neutral-900)' }}>
                  {det.plantelecomunicacion?.nombreplan || det.plantelecomunicacion?.nombrePlan || det.nombrePlan || `Plan #${det.idplan || det.posicion}`}
                </h5>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--neutral-600)', flexWrap: 'wrap', gap: '4px' }}>
                  <span>Tarifa: <strong style={{ color: 'var(--neutral-900)' }}>Bs {det.preciosnapshot}</strong>/mes</span>
                  <span>Velocidad: <strong style={{ color: 'var(--neutral-900)' }}>{det.velocidadsnapshot} Mbps</strong></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.8rem', color: 'var(--neutral-600)', gap: '6px', flexWrap: 'wrap' }}>
                  {det.puntajetotal != null && (
                    <span>Puntaje: <strong style={{ color: 'var(--neutral-900)' }}>{(Number(det.puntajetotal) * 100).toFixed(1)}</strong>/100</span>
                  )}
                  {mov && (
                    <span style={{ background: mov.fondo, color: mov.color, padding: '1px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700 }}>
                      {mov.texto}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function HistorialView({ perfilId, onSaveRecomendacion, onToast }) {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistorial();
  }, [perfilId]);

  // Cada simulación se muestra debajo de la recomendación de la que salió.
  const grupos = useMemo(() => {
    const fechaDe = (it) => new Date(it?.recomendacion?.fechacalculo || 0).getTime();
    const originales = historial.filter((h) => !h.recomendacion?.essimulacion);
    const simulaciones = historial.filter((h) => h.recomendacion?.essimulacion);
    const usadas = new Set();
    const lista = originales.map((o) => {
      const id = o.recomendacion?.idrecomendacion;
      const sims = simulaciones.filter((s) => s.recomendacion?.idrecomendacionorigen === id);
      sims.forEach((s) => usadas.add(s));
      return { origen: o, sims, fecha: fechaDe(o) };
    });
    simulaciones.filter((s) => !usadas.has(s)).forEach((s) => lista.push({ origen: null, sims: [s], fecha: fechaDe(s) }));
    return lista.sort((a, b) => b.fecha - a.fecha);
  }, [historial]);

  const loadHistorial = async () => {
    setLoading(true);
    const data = await getHistorialByPerfil(perfilId);
    setHistorial(data || []);
    setLoading(false);
  };

  const handleQuickSave = async () => {
    if (onSaveRecomendacion) {
      await onSaveRecomendacion();
      setTimeout(loadHistorial, 600);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px' }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary-500)', marginBottom: '16px' }}></i>
        <span style={{ color: 'var(--neutral-600)', fontWeight: 500 }}>Cargando tu historial...</span>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Title Header */}
      <div className="page-title-section" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md, 10px)',
            background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.2rem',
            boxShadow: '0 4px 12px rgba(200,90,42,0.25)'
          }}>
            <i className="fa-solid fa-clock-rotate-left"></i>
          </div>
          <div>
            <h1 className="page-title" style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--neutral-900)' }}>
              Historial de recomendaciones
            </h1>
            <p className="page-subtitle" style={{ margin: '4px 0 0', color: 'var(--neutral-500)', fontSize: '0.88rem' }}>
              Tus recomendaciones y simulaciones guardadas
            </p>
          </div>
        </div>

        <button
          onClick={handleQuickSave}
          style={{
            padding: '10px 20px',
            borderRadius: 'var(--radius-md, 10px)',
            background: 'var(--primary-50, #FFF5F0)',
            color: 'var(--primary-600, #A84820)',
            border: '1px solid var(--primary-300, #FFB088)',
            fontWeight: 600,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <i className="fa-solid fa-floppy-disk"></i> Guardar recomendación actual
        </button>
      </div>

      {/* Empty State Card */}
      {!historial.length ? (
        <div className="card" style={{
          background: 'white',
          borderRadius: 'var(--radius-lg, 16px)',
          border: '1px solid var(--neutral-200)',
          padding: '48px 24px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--primary-50, #FFF5F0)',
            color: 'var(--primary-500)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            margin: '0 auto 16px'
          }}>
            <i className="fa-solid fa-folder-open"></i>
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 700, color: 'var(--neutral-800)' }}>
            No hay recomendaciones guardadas aún
          </h3>
          <p style={{ margin: '0 0 20px', color: 'var(--neutral-500)', fontSize: '0.9rem', maxWidth: '450px', marginLeft: 'auto', marginRight: 'auto' }}>
            Cada vez que presiones el botón <strong>"Guardar Recomendación"</strong> en el Dashboard o confirmes una simulación, el Top 3 y sus atributos se registrarán aquí automáticamente.
          </p>
          <button
            onClick={handleQuickSave}
            style={{
              padding: '12px 24px',
              borderRadius: 'var(--radius-md, 10px)',
              background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
              color: 'white',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(200,90,42,0.3)'
            }}
          >
            <i className="fa-solid fa-plus"></i> Guardar mi primera recomendación
          </button>
        </div>
      ) : (
        /* Historial: cada recomendación con su simulación debajo */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {grupos.map((g, idx) => (
            <div key={g.origen?.recomendacion?.idrecomendacion || g.sims[0]?.recomendacion?.idrecomendacion || idx} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {g.origen && <TarjetaReco item={g.origen} origen={null} esSimulacion={false} />}
              {g.sims.map((sim, i) => (
                <div key={sim.recomendacion?.idrecomendacion || i} style={{ marginLeft: g.origen ? '28px' : 0, borderLeft: g.origen ? '3px solid #93C5FD' : 'none', paddingLeft: g.origen ? '16px' : 0 }}>
                  {g.origen && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', marginBottom: '8px', fontWeight: 600 }}>
                      Simulación de la recomendación de arriba
                    </div>
                  )}
                  <TarjetaReco item={sim} origen={g.origen} esSimulacion={true} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
