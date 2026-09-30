import React, { useState, useEffect, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const PROVEEDORES_BASE = ['Entel', 'Viva', 'Tigo'];
const NIVELES = [
  { v: '',      l: 'Sin cobertura' },
  { v: 'alta',  l: 'Alta' },
  { v: 'media', l: 'Media' },
  { v: 'baja',  l: 'Baja' }
];
const PILL_NIVEL = { alta: 'pill pill-success', media: 'pill pill-warning', baja: 'pill pill-danger' };

const coberturaVacia = () => Object.fromEntries(PROVEEDORES_BASE.map(p => [p, '']));

export default function ZonasView({ onToast, onZonasChanged }) {
  const [zonas, setZonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todas');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaCob, setNuevaCob] = useState(coberturaVacia());
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState(null); // { idzona, nombre }
  const [ocupada, setOcupada] = useState(null);   // idzona con una operación en curso

  const toast = (msg, tipo = 'info') => { if (onToast) onToast(msg, tipo); };
  const sinConexion = !isSupabaseConfigured || !supabase;

  const cargarZonas = async () => {
    setLoading(true);
    setErrorCarga(null);
    if (sinConexion) {
      setErrorCarga('Sin conexión a la base de datos.');
      setLoading(false);
      return;
    }
    // Dos consultas y unión en el cliente: no depende de que exista una llave foránea
    // entre zonacobertura y zonaproveedor (PostgREST la exige para anidar tablas).
    const [resZonas, resCob] = await Promise.all([
      supabase.from('zonacobertura').select('*').order('idzona', { ascending: true }),
      supabase.from('zonaproveedor').select('*')
    ]);
    const error = resZonas.error || resCob.error;
    if (error) {
      console.error('Zonas:', error);
      setErrorCarga(`No se pudieron cargar las zonas (${error.message}).`);
    } else {
      const porZona = new Map();
      (resCob.data || []).forEach(zp => {
        if (!porZona.has(zp.idzona)) porZona.set(zp.idzona, []);
        porZona.get(zp.idzona).push(zp);
      });
      setZonas((resZonas.data || []).map(z => ({ ...z, zonaproveedor: porZona.get(z.idzona) || [] })));
    }
    setLoading(false);
  };

  useEffect(() => { cargarZonas(); }, []);

  // Tras cualquier cambio: recarga esta vista y avisa a la app para refrescar el selector de zonas.
  const refrescar = async () => {
    await cargarZonas();
    if (onZonasChanged) onZonasChanged();
  };

  // Proveedores a mostrar: los base más cualquier otro que exista en los datos.
  const proveedores = useMemo(() => {
    const extra = new Set();
    zonas.forEach(z => (z.zonaproveedor || []).forEach(zp => {
      if (!PROVEEDORES_BASE.includes(zp.proveedor)) extra.add(zp.proveedor);
    }));
    return [...PROVEEDORES_BASE, ...extra];
  }, [zonas]);

  const nombreDuplicado = (nombre, idIgnorar = null) =>
    zonas.some(z => z.idzona !== idIgnorar &&
      (z.nombresector || '').trim().toLowerCase() === nombre.toLowerCase());

  const validarNombre = (nombre, idIgnorar = null) => {
    if (!nombre) return 'Ingresa el nombre de la zona';
    if (nombre.length > 80) return 'El nombre no puede superar los 80 caracteres';
    if (nombreDuplicado(nombre, idIgnorar)) return 'Ya existe una zona con ese nombre';
    return null;
  };

  // Una escritura bloqueada por RLS no devuelve error: devuelve 0 filas. Se trata como fallo.
  const resultadoOk = ({ data, error }) => !error && Array.isArray(data) && data.length > 0;
  const mensajeFallo = (res, porDefecto) =>
    res.error ? `${porDefecto} (${res.error.message})` : `${porDefecto}: sin permisos de administrador`;

  const crearZona = async (e) => {
    e.preventDefault();
    const nombre = nuevoNombre.trim();
    const problema = validarNombre(nombre);
    if (problema) return toast(problema, 'error');
    if (sinConexion) return toast('Sin conexión a la base de datos', 'error');

    const filasCob = Object.entries(nuevaCob).filter(([, nivel]) => nivel);
    if (filasCob.length === 0) {
      const seguir = window.confirm('No elegiste ningún proveedor con cobertura. Una zona sin proveedores no genera recomendaciones. ¿Crearla de todos modos?');
      if (!seguir) return;
    }

    setCreando(true);
    const resZona = await supabase.from('zonacobertura').insert({ nombresector: nombre }).select();
    if (!resultadoOk(resZona)) {
      setCreando(false);
      return toast(resZona.error?.code === '23505' ? 'Ya existe una zona con ese nombre' : mensajeFallo(resZona, 'No se pudo crear la zona'), 'error');
    }
    const idzona = resZona.data[0].idzona;

    if (filasCob.length > 0) {
      const resCob = await supabase.from('zonaproveedor')
        .insert(filasCob.map(([proveedor, nivelcobertura]) => ({ idzona, proveedor, nivelcobertura })))
        .select();
      if (!resultadoOk(resCob)) {
        // Sin transacción en el cliente: se deshace la zona para no dejarla vacía.
        await supabase.from('zonacobertura').delete().eq('idzona', idzona);
        setCreando(false);
        return toast(mensajeFallo(resCob, 'No se pudo guardar la cobertura; la zona no se creó'), 'error');
      }
    }

    setCreando(false);
    setNuevoNombre('');
    setNuevaCob(coberturaVacia());
    toast('Zona creada correctamente', 'success');
    refrescar();
  };

  const cambiarNivel = async (zona, proveedor, nivel) => {
    if (sinConexion) return toast('Sin conexión a la base de datos', 'error');
    const actual = (zona.zonaproveedor || []).find(zp => zp.proveedor === proveedor);
    if ((actual?.nivelcobertura || '') === nivel) return;

    setOcupada(zona.idzona);
    let res;
    if (nivel === '') {
      res = await supabase.from('zonaproveedor').delete()
        .eq('idzona', zona.idzona).eq('proveedor', proveedor).select();
    } else {
      res = await supabase.from('zonaproveedor')
        .upsert({ idzona: zona.idzona, proveedor, nivelcobertura: nivel }, { onConflict: 'idzona,proveedor' })
        .select();
    }
    setOcupada(null);
    if (!resultadoOk(res)) return toast(mensajeFallo(res, 'No se pudo actualizar la cobertura'), 'error');
    toast(`Cobertura de ${proveedor} actualizada`, 'success');
    refrescar();
  };

  const guardarNombre = async (zona) => {
    const nombre = (editando?.nombre || '').trim();
    const problema = validarNombre(nombre, zona.idzona);
    if (problema) return toast(problema, 'error');
    setOcupada(zona.idzona);
    const res = await supabase.from('zonacobertura')
      .update({ nombresector: nombre }).eq('idzona', zona.idzona).select();
    setOcupada(null);
    if (!resultadoOk(res)) return toast(mensajeFallo(res, 'No se pudo renombrar la zona'), 'error');
    setEditando(null);
    toast('Zona renombrada', 'success');
    refrescar();
  };

  const alternarActiva = async (zona) => {
    const activar = !zona.activo;
    if (!activar && !window.confirm(`¿Desactivar "${zona.nombresector}"? Dejará de aparecer en el selector de zonas de la app.`)) return;
    setOcupada(zona.idzona);
    const res = await supabase.from('zonacobertura')
      .update({ activo: activar }).eq('idzona', zona.idzona).select();
    setOcupada(null);
    if (!resultadoOk(res)) return toast(mensajeFallo(res, 'No se pudo actualizar la zona'), 'error');
    toast(activar ? 'Zona reactivada' : 'Zona desactivada', 'success');
    refrescar();
  };

  const resumen = useMemo(() => ({
    total: zonas.length,
    activas: zonas.filter(z => z.activo).length,
    inactivas: zonas.filter(z => !z.activo).length,
    sinCobertura: zonas.filter(z => !(z.zonaproveedor || []).length).length
  }), [zonas]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return zonas.filter(z =>
      (filtro === 'todas' || (filtro === 'activas' ? z.activo : !z.activo)) &&
      (!q || (z.nombresector || '').toLowerCase().includes(q))
    );
  }, [zonas, busqueda, filtro]);

  return (
    <div className="mgmt-page">
      <div className="mgmt-head">
        <h2><i className="fa-solid fa-map-location-dot" style={{ marginRight: 10, color: 'var(--primary-500)' }}></i>Zonas</h2>
        <p>Cada zona necesita al menos un proveedor con cobertura para poder generar recomendaciones.</p>
      </div>

      <div className="stat-grid">
        <div className="stat-box"><div className="n">{resumen.total}</div><div className="l">Zonas</div></div>
        <div className="stat-box"><div className="n">{resumen.activas}</div><div className="l">Activas</div></div>
        <div className="stat-box"><div className="n">{resumen.inactivas}</div><div className="l">Inactivas</div></div>
        <div className="stat-box"><div className="n">{resumen.sinCobertura}</div><div className="l">Sin proveedores</div></div>
      </div>

      <form className="mgmt-card" onSubmit={crearZona}>
        <h3>Nueva zona</h3>
        <input
          className="field"
          style={{ width: '100%', boxSizing: 'border-box' }}
          type="text"
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
          placeholder="Ej.: Tarija (Cercado y San Lorenzo) - Dpto. Tarija"
          maxLength={80}
          aria-label="Nombre de la nueva zona"
        />
        <div className="cob-grid">
          {PROVEEDORES_BASE.map(p => (
            <div className="cob-item" key={p}>
              <label htmlFor={`nueva-${p}`}>{p}</label>
              <select
                id={`nueva-${p}`}
                className="field"
                value={nuevaCob[p]}
                onChange={(e) => setNuevaCob(prev => ({ ...prev, [p]: e.target.value }))}
              >
                {NIVELES.map(n => <option key={n.v} value={n.v}>{n.l}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <button type="submit" className="mgmt-btn mgmt-btn-primary" disabled={creando}>
            {creando ? 'Creando…' : 'Crear zona'}
          </button>
        </div>
      </form>

      {errorCarga && <div className="mgmt-alert err">{errorCarga}</div>}

      <div className="mgmt-toolbar">
        <input
          className="field"
          style={{ flex: 1, minWidth: 200 }}
          type="search"
          placeholder="Buscar zona…"
          aria-label="Buscar zona"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select className="field" aria-label="Filtrar por estado" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="todas">Todas</option>
          <option value="activas">Solo activas</option>
          <option value="inactivas">Solo inactivas</option>
        </select>
      </div>

      {loading ? (
        <p style={{ padding: 24, textAlign: 'center', color: 'var(--neutral-500)' }}>Cargando zonas…</p>
      ) : visibles.length === 0 ? (
        <p style={{ padding: 24, textAlign: 'center', color: 'var(--neutral-500)' }}>
          {zonas.length === 0 ? 'Aún no hay zonas registradas.' : 'Ninguna zona coincide con el filtro.'}
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {visibles.map(zona => {
            const cob = zona.zonaproveedor || [];
            const enEdicion = editando && editando.idzona === zona.idzona;
            const bloqueada = ocupada === zona.idzona;
            return (
              <div key={zona.idzona} className={`zona-card${zona.activo ? '' : ' inactiva'}`}>
                <div className="zona-head">
                  <div style={{ flex: 1, minWidth: 220 }}>
                    {enEdicion ? (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <input
                          className="field"
                          style={{ flex: 1, minWidth: 200 }}
                          value={editando.nombre}
                          maxLength={80}
                          autoFocus
                          aria-label="Nuevo nombre de la zona"
                          onChange={(e) => setEditando({ idzona: zona.idzona, nombre: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') guardarNombre(zona); if (e.key === 'Escape') setEditando(null); }}
                        />
                        <button className="mgmt-btn mgmt-btn-primary" onClick={() => guardarNombre(zona)} disabled={bloqueada}>Guardar</button>
                        <button className="mgmt-btn" onClick={() => setEditando(null)}>Cancelar</button>
                      </div>
                    ) : (
                      <h3 className="zona-title">
                        {zona.nombresector}{' '}
                        <span className={zona.activo ? 'pill pill-success' : 'pill pill-neutral'}>{zona.activo ? 'Activa' : 'Inactiva'}</span>
                      </h3>
                    )}
                  </div>
                  {!enEdicion && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="mgmt-btn" onClick={() => setEditando({ idzona: zona.idzona, nombre: zona.nombresector })} disabled={bloqueada}>Renombrar</button>
                      <button className={`mgmt-btn${zona.activo ? ' mgmt-btn-danger' : ''}`} onClick={() => alternarActiva(zona)} disabled={bloqueada}>
                        {zona.activo ? 'Desactivar' : 'Reactivar'}
                      </button>
                    </div>
                  )}
                </div>

                {cob.length === 0 && zona.activo && (
                  <div className="mgmt-alert warn" style={{ marginTop: 12 }}>
                    Esta zona no tiene proveedores: aparece en la app pero no generará recomendaciones. Asigna cobertura abajo.
                  </div>
                )}

                <div className="cob-grid">
                  {proveedores.map(p => {
                    const fila = cob.find(zp => zp.proveedor === p);
                    return (
                      <div className="cob-item" key={p}>
                        <label htmlFor={`z${zona.idzona}-${p}`}>
                          {p} {fila && <span className={PILL_NIVEL[fila.nivelcobertura] || 'pill pill-neutral'} style={{ marginLeft: 4 }}>{fila.nivelcobertura}</span>}
                        </label>
                        <select
                          id={`z${zona.idzona}-${p}`}
                          className="field"
                          value={fila?.nivelcobertura || ''}
                          disabled={bloqueada}
                          onChange={(e) => cambiarNivel(zona, p, e.target.value)}
                        >
                          {NIVELES.map(n => <option key={n.v} value={n.v}>{n.l}</option>)}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
