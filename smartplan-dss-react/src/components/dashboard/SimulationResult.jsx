import React, { useEffect, useRef, useState } from 'react';

const NOMBRE = { precio: 'precio', velocidad: 'velocidad', cobertura: 'cobertura', estabilidad: 'estabilidad' };
const CLAVE = { precio: 'pesoPrecio', velocidad: 'pesoVelocidad', cobertura: 'pesoCobertura', estabilidad: 'pesoEstabilidad' };

// El motor entrega el puntaje en escala 0–1; aquí se muestra sobre 100.
const sobre100 = (v) => (Number(v || 0) * 100).toFixed(1);

function etiquetaMovimiento(posicionSimulada, posicionOriginal) {
  if (!posicionOriginal) return { texto: 'Nuevo', color: '#1D4ED8', fondo: '#DBEAFE' };
  if (posicionOriginal > posicionSimulada) return { texto: `▲ sube (era #${posicionOriginal})`, color: '#15803D', fondo: '#DCFCE7' };
  if (posicionOriginal < posicionSimulada) return { texto: `▼ baja (era #${posicionOriginal})`, color: '#B91C1C', fondo: '#FEE2E2' };
  return { texto: '= igual', color: '#57534E', fondo: '#F5F5F4' };
}

export default function SimulationResult({
  sawResult,
  sawResultSimulado,
  simulacion,
  presupuestoOriginal,
  onClear,
  onSave
}) {
  const ref = useRef(null);
  const [estado, setEstado] = useState('idle');

  // Al lanzar (o cambiar) una simulación, se lleva la vista hasta este resultado.
  useEffect(() => {
    setEstado('idle');
    if (ref.current && typeof ref.current.scrollIntoView === 'function') {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [simulacion]);

  const topOriginal = sawResult?.top3 || [];
  const topSimulado = sawResultSimulado?.top3 || [];
  const posOriginal = (idPlan) => (sawResult?.todos || []).find((p) => p.idPlan === idPlan)?.posicionRanking;

  let queCambio;
  if (simulacion.tipoSimulacion === 'PESO') {
    const c = simulacion.criterioModificado;
    const antes = Math.round(Number(sawResult?.breakdownPromedio?.[c] ?? 0));
    const despues = Math.round(Number(simulacion.pesos?.[CLAVE[c]] ?? 0) * 100);
    queCambio = `Peso de ${NOMBRE[c] || c}: ${antes}% → ${despues}%`;
  } else {
    queCambio = `Presupuesto: Bs ${presupuestoOriginal} → Bs ${simulacion.presupuesto}`;
  }

  const idsOriginal = topOriginal.map((p) => p.idPlan);
  const idsSimulado = topSimulado.map((p) => p.idPlan);
  const mismoOrden = idsOriginal.length === idsSimulado.length && idsOriginal.every((id, i) => id === idsSimulado[i]);
  const mismoConjunto = idsOriginal.length === idsSimulado.length && idsOriginal.every((id) => idsSimulado.includes(id));
  const entran = topSimulado.filter((p) => !idsOriginal.includes(p.idPlan)).map((p) => p.nombrePlan);
  const salen = topOriginal.filter((p) => !idsSimulado.includes(p.idPlan)).map((p) => p.nombrePlan);

  let resumen;
  if (topSimulado.length === 0) {
    resumen = sawResultSimulado?.mensaje || 'Ningún plan cumple con esta simulación.';
  } else if (mismoOrden) {
    resumen = 'El Top 3 no cambia con este ajuste: la recomendación es estable.';
  } else if (mismoConjunto) {
    resumen = `Los mismos 3 planes, en otro orden. El #1 pasa de ${topOriginal[0]?.nombrePlan} a ${topSimulado[0]?.nombrePlan}.`;
  } else {
    resumen = `Cambia el Top 3: entra ${entran.join(', ') || '—'} y sale ${salen.join(', ') || '—'}. El #1 ahora es ${topSimulado[0]?.nombrePlan}.`;
  }

  const guardar = async () => {
    setEstado('saving');
    try {
      const ok = onSave ? await onSave() : null;
      setEstado(ok ? 'saved' : 'idle');
    } catch (err) {
      console.error('Error guardando simulación:', err);
      setEstado('idle');
    }
  };

  const columna = (titulo, lista, esSimulado) => (
    <div>
      <strong>{titulo}</strong>
      {lista.length === 0 ? (
        <p style={{ margin: '6px 0 0', color: '#92400E' }}>Sin planes.</p>
      ) : (
        <ol style={{ margin: '6px 0 0', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {lista.map((p, i) => {
            const mov = esSimulado ? etiquetaMovimiento(i + 1, posOriginal(p.idPlan)) : null;
            return (
              <li key={p.idPlan}>
                {p.nombrePlan} — <strong>{sobre100(p.puntajeGlobal)}</strong>/100
                {mov && (
                  <span style={{ marginLeft: '8px', background: mov.fondo, color: mov.color, padding: '1px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700 }}>
                    {mov.texto}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );

  return (
    <div ref={ref} style={{ background: '#FEF9C3', border: '1px solid #FDE047', padding: '14px 16px', borderRadius: 'var(--radius-md)', marginTop: '16px', fontSize: '0.82rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
        <span>
          <i className="fa-solid fa-flask" style={{ color: '#D97706', marginRight: '8px' }}></i>
          <strong>Simulación activa</strong> · {queCambio}
        </span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={guardar}
            disabled={estado === 'saving' || estado === 'saved' || topSimulado.length === 0}
            style={estado === 'saved' ? { background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC' } : undefined}
          >
            {estado === 'saving' && <><i className="fa-solid fa-spinner fa-spin"></i> Guardando...</>}
            {estado === 'saved' && <><i className="fa-solid fa-circle-check"></i> Simulación guardada</>}
            {estado === 'idle' && <><i className="fa-solid fa-floppy-disk"></i> Guardar esta simulación</>}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onClear}>Volver al original</button>
        </div>
      </div>

      <p style={{ margin: '0 0 12px', color: '#713F12' }}>
        {resumen} <span style={{ color: '#92400E' }}>Es una previsualización: no se guarda hasta que pulses "Guardar esta simulación".</span>
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
        {columna('Original — Top 3', topOriginal, false)}
        {columna('Simulado — Top 3', topSimulado, true)}
      </div>
    </div>
  );
}
