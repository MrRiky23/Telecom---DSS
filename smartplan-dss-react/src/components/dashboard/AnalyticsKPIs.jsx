import React, { useState, useEffect } from 'react'
import { fetchKpiPrecioVelocidad, fetchKpiZonas, fetchKpiSimulaciones } from '../../services/recomendacionService';
import { initialDWFacts } from '../../data/seedData';
import { isSupabaseConfigured } from '../../config/supabaseClient';

// Adaptadores: convierten las filas que devuelven las funciones SQL (snake_case, por mes / rango)
// al formato que usa la pantalla. Nada de esto inventa datos: si la BD no devuelve filas, queda vacío.
function agruparPrecioPorProveedor(filas = []) {
  const acc = new Map();
  filas.forEach((f) => {
    const n = Number(f.total_recomendaciones) || 0;
    const a = acc.get(f.proveedor) || { proveedor: f.proveedor, n: 0, sumPrecio: 0, sumVel: 0 };
    a.n += n;
    a.sumPrecio += (Number(f.precio_prom) || 0) * n;
    a.sumVel += (Number(f.velocidad_prom) || 0) * n;
    acc.set(f.proveedor, a);
  });
  return [...acc.values()]
    .filter((a) => a.n > 0)
    .map((a) => ({
      proveedor: a.proveedor,
      precioPromedio: a.sumPrecio / a.n,
      velocidadPromedio: a.sumVel / a.n,
      totalRecomendaciones: a.n
    }))
    .sort((x, y) => y.totalRecomendaciones - x.totalRecomendaciones);
}

function adaptarZona(filas = []) {
  if (!filas.length) return null;
  const f = filas[0]; // la función ya ordena por total descendente
  return {
    zona: f.nombresector,
    total: Number(f.total_recomendaciones) || 0,
    porcentaje: Number(f.pct_total) * 100,
    puntajePromedio: f.puntaje_global_prom == null ? null : Number(f.puntaje_global_prom) * 100
  };
}

function adaptarSimulaciones(filas = []) {
  if (!filas.length) return null;
  const totalRecomendaciones = filas.reduce((s, f) => s + (Number(f.originales) || 0), 0);
  const totalSimulaciones = filas.reduce((s, f) => s + (Number(f.con_simulacion) || 0), 0);
  const conCriterio = filas.filter((f) => f.criterio_mas_modificado);
  const criterio = conCriterio.sort((a, b) => (Number(b.con_simulacion) || 0) - (Number(a.con_simulacion) || 0))[0];
  return {
    totalRecomendaciones,
    totalSimulaciones,
    criterioDominante: criterio ? criterio.criterio_mas_modificado : null
  };
}

export default function AnalyticsKPIs({ zonaId = null }) {
  const [kpiPrecio, setKpiPrecio] = useState([]);
  const [zonaInfo, setZonaInfo] = useState(null);
  const [simInfo, setSimInfo] = useState(null);
  const [loadingKpi, setLoadingKpi] = useState(true);
  const [errorKpi, setErrorKpi] = useState(false);
  const [esDemo, setEsDemo] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoadingKpi(true);
      setErrorKpi(false);
      if (isSupabaseConfigured) {
        setEsDemo(false);
        try {
          const hasta = new Date();
          const desde = new Date();
          desde.setDate(desde.getDate() - 30);

          const [precio, zonas, sim] = await Promise.all([
            fetchKpiPrecioVelocidad(desde.toISOString(), hasta.toISOString(), zonaId),
            fetchKpiZonas(desde.toISOString(), hasta.toISOString()),
            fetchKpiSimulaciones(desde.toISOString(), hasta.toISOString())
          ]);

          setKpiPrecio(agruparPrecioPorProveedor(precio));
          setZonaInfo(adaptarZona(zonas));
          setSimInfo(adaptarSimulaciones(sim));
        } catch (error) {
          console.error("Error loading KPIs:", error);
          setKpiPrecio([]);
          setZonaInfo(null);
          setSimInfo(null);
          setErrorKpi(true);
        }
      } else {
        // Modo demostración (sin base de datos): datos de ejemplo, señalados como tales en pantalla.
        setEsDemo(true);
        const mockTotal = initialDWFacts.reduce((acc, curr) => acc + curr.recomendaciones, 0);
        setKpiPrecio(initialDWFacts.map(d => ({
          proveedor: d.proveedor,
          precioPromedio: d.precioPromedio,
          velocidadPromedio: d.velocidadPromedio,
          totalRecomendaciones: d.recomendaciones
        })));
        setZonaInfo({ zona: 'La Paz / El Alto', total: mockTotal, porcentaje: null, puntajePromedio: null });
        setSimInfo({ totalRecomendaciones: mockTotal, totalSimulaciones: Math.floor(mockTotal * 0.31), criterioDominante: 'Precio' });
      }
      setLoadingKpi(false);
    };

    loadData();
  }, [zonaId]);

  if (loadingKpi) {
    return (
      <div className="card" style={{ marginTop: '32px' }}>
        <div className="card-header">
          <h3 className="card-title">Cargando indicadores...</h3>
        </div>
        <div className="card-body" style={{ textAlign: 'center', padding: '40px' }}>
           <div style={{ width: '40px', height: '40px', border: '4px solid #E2E8F0', borderTop: '4px solid #3B82F6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
           <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (errorKpi) {
    return (
      <div className="card" style={{ marginTop: '32px' }}>
        <div className="card-header">
          <h3 className="card-title">Módulo Analítico</h3>
        </div>
        <div className="card-body">
          <p role="alert" style={{ color: 'var(--neutral-700)', fontSize: '0.85rem' }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }} aria-hidden="true"></i>
            No se pudieron cargar los indicadores. Revisa tu conexión e intenta nuevamente.
          </p>
        </div>
      </div>
    );
  }

  const hasData = kpiPrecio.length > 0 || zonaInfo || simInfo;

  if (!hasData) {
    return (
      <div className="card" style={{ marginTop: '32px' }}>
        <div className="card-header">
          <h3 className="card-title">Módulo Analítico</h3>
        </div>
        <div className="card-body">
          <p style={{ color: 'var(--neutral-500)', fontSize: '0.85rem' }}>No hay datos para este periodo (últimos 30 días).</p>
        </div>
      </div>
    );
  }

  const tasaPorcentaje = simInfo && simInfo.totalRecomendaciones > 0
    ? ((simInfo.totalSimulaciones / simInfo.totalRecomendaciones) * 100).toFixed(1)
    : '0';

  return (
    <div className="card" style={{ marginTop: '32px' }}>
      <div className="card-header">
        <h3 className="card-title">
          <i className="fa-solid fa-cubes-stacked" style={{ color: 'var(--primary-500)', marginRight: '8px' }}></i>
          Indicadores del sistema
        </h3>
        <span className="reco-tag recomendado">{esDemo ? 'Datos de demostración' : 'Últimos 30 días'}</span>
      </div>
      <div className="card-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>

          {/* HU-02: Precio y Velocidad promedio por Proveedor */}
          <div style={{ background: 'var(--neutral-50)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-200)' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '8px', color: 'var(--neutral-900)' }}>
              <i className="fa-solid fa-chart-bar" style={{ color: 'var(--primary-500)', marginRight: '6px' }}></i>
              Promedios por proveedor
            </h4>
            <p style={{ fontSize: '0.72rem', color: 'var(--neutral-500)', marginBottom: '12px' }}>
              Precio y velocidad promedio de los planes que aparecieron en el Top 3.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {kpiPrecio.length === 0 ? <p style={{fontSize: '0.75rem', color: 'var(--neutral-500)'}}>Sin datos</p> : kpiPrecio.map((p, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '6px 0', borderBottom: '1px solid var(--neutral-200)' }}>
                  <span><strong>{p.proveedor}:</strong></span>
                  <span style={{ color: 'var(--neutral-700)' }}>Bs {Math.round(p.precioPromedio)} / {Math.round(p.velocidadPromedio)} Mbps · <em>en {p.totalRecomendaciones} recomendaciones</em></span>
                </div>
              ))}
            </div>
          </div>

          {/* HU-01: Zona predominante y total recomendaciones */}
          <div style={{ background: 'var(--neutral-50)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-200)' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '8px', color: 'var(--neutral-900)' }}>
              <i className="fa-solid fa-map-pin" style={{ color: 'var(--primary-500)', marginRight: '6px' }}></i>
              Zona con más recomendaciones
            </h4>
            <p style={{ fontSize: '0.72rem', color: 'var(--neutral-500)', marginBottom: '12px' }}>
              Sector que más consultan los usuarios.
            </p>
            {zonaInfo ? (
              <>
                <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--primary-500)', marginBottom: '4px' }}>
                  {zonaInfo.zona}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--neutral-700)' }}>
                  Total de recomendaciones: <strong>{zonaInfo.total}</strong><br />
                  {zonaInfo.porcentaje != null && Number.isFinite(zonaInfo.porcentaje) && (
                    <>Participación: <strong>{zonaInfo.porcentaje.toFixed(1)}%</strong><br /></>
                  )}
                  {zonaInfo.puntajePromedio != null && (
                    <>Puntaje promedio del plan #1: <strong>{zonaInfo.puntajePromedio.toFixed(1)} / 100</strong><br /></>
                  )}
                </div>
              </>
            ) : (
              <p style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>No hay datos para este periodo.</p>
            )}
          </div>

          {/* HU-03: Tasa de simulaciones What-If */}
          <div style={{ background: 'var(--neutral-50)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-200)' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '8px', color: 'var(--neutral-900)' }}>
              <i className="fa-solid fa-flask" style={{ color: 'var(--primary-500)', marginRight: '6px' }}></i>
              Uso del simulador
            </h4>
            <p style={{ fontSize: '0.72rem', color: 'var(--neutral-500)', marginBottom: '12px' }}>
              Recomendaciones sobre las que se probó un escenario distinto.
            </p>
            {simInfo ? (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--neutral-900)' }}>{tasaPorcentaje}%</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--neutral-500)' }}>de las recomendaciones tienen una simulación</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--neutral-700)' }}>
                  Recomendaciones con simulación: <strong>{simInfo.totalSimulaciones} de {simInfo.totalRecomendaciones}</strong><br />
                  Criterio más modificado: <strong>{simInfo.criterioDominante || 'Sin datos'}</strong>
                </div>
              </>
            ) : (
              <p style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>No hay datos para este periodo.</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
