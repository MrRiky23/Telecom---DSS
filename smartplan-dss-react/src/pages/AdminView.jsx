import React, { useState, useEffect, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const ROLES = {
  admin:   { label: 'Administrador', pill: 'pill pill-danger' },
  gerente: { label: 'Gerente',       pill: 'pill pill-warning' },
  usuario: { label: 'Usuario',       pill: 'pill pill-info' }
};

const fmtFecha = (iso, conHora = false) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-BO', conHora
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function AdminView({ onToast }) {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('todos');
  const [guardando, setGuardando] = useState(null);

  const toast = (msg, tipo = 'info') => { if (onToast) onToast(msg, tipo); };

  const cargarUsuarios = async () => {
    setLoading(true);
    setErrorCarga(null);
    if (!isSupabaseConfigured || !supabase) {
      setErrorCarga('Sin conexión a la base de datos.');
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc('admin_listar_usuarios');
    if (error) {
      console.error('admin_listar_usuarios:', error);
      const faltaFuncion = error.code === 'PGRST202' || error.code === '42883';
      setErrorCarga(faltaFuncion
        ? 'Falta ejecutar parche-admin-zonas.sql en Supabase para listar usuarios con su correo.'
        : (error.code === '42501'
            ? 'Tu cuenta no tiene permisos de administrador en la base de datos.'
            : `No se pudo cargar la lista de usuarios (${error.message}).`));
      setUsuarios([]);
    } else {
      setUsuarios(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { cargarUsuarios(); }, []);

  const cambiarRol = async (u, nuevoRol) => {
    if (nuevoRol === u.rol) return;
    const ok = window.confirm(`¿Cambiar el rol de ${u.email} a "${ROLES[nuevoRol].label}"?`);
    if (!ok) return;
    setGuardando(u.user_id);
    const { error } = await supabase.rpc('admin_cambiar_rol', { p_user: u.user_id, p_rol: nuevoRol });
    setGuardando(null);
    if (error) {
      console.error('admin_cambiar_rol:', error);
      toast(error.message || 'No se pudo cambiar el rol', 'error');
      return;
    }
    toast(`Rol de ${u.email} actualizado a ${ROLES[nuevoRol].label}`, 'success');
    cargarUsuarios();
  };

  const conteo = useMemo(() => ({
    total: usuarios.length,
    admin: usuarios.filter(u => u.rol === 'admin').length,
    gerente: usuarios.filter(u => u.rol === 'gerente').length,
    usuario: usuarios.filter(u => u.rol === 'usuario').length
  }), [usuarios]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return usuarios.filter(u =>
      (filtroRol === 'todos' || u.rol === filtroRol) &&
      (!q || (u.email || '').toLowerCase().includes(q))
    );
  }, [usuarios, busqueda, filtroRol]);

  return (
    <div className="mgmt-page">
      <div className="mgmt-head">
        <h2><i className="fa-solid fa-users-gear" style={{ marginRight: 10, color: 'var(--primary-500)' }}></i>Usuarios y roles</h2>
        <p>Gestiona quién puede ver y modificar cada parte del sistema.</p>
      </div>

      <div className="stat-grid">
        <div className="stat-box"><div className="n">{conteo.total}</div><div className="l">Cuentas</div></div>
        <div className="stat-box"><div className="n">{conteo.admin}</div><div className="l">Administradores</div></div>
        <div className="stat-box"><div className="n">{conteo.gerente}</div><div className="l">Gerentes</div></div>
        <div className="stat-box"><div className="n">{conteo.usuario}</div><div className="l">Usuarios</div></div>
      </div>

      <div className="mgmt-card">
        <h3>Qué puede hacer cada rol</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, fontSize: '0.85rem', color: 'var(--neutral-700)' }}>
          <div><span className={ROLES.usuario.pill}>Usuario</span><p style={{ margin: '8px 0 0' }}>Dashboard, cobertura, historial y perfiles.</p></div>
          <div><span className={ROLES.gerente.pill}>Gerente</span><p style={{ margin: '8px 0 0' }}>Lo anterior y consulta del catálogo de planes (no puede modificarlo).</p></div>
          <div><span className={ROLES.admin.pill}>Administrador</span><p style={{ margin: '8px 0 0' }}>Todo lo anterior, más catálogo editable, zonas y este panel.</p></div>
        </div>
      </div>

      {errorCarga && <div className="mgmt-alert err">{errorCarga}</div>}

      <div className="mgmt-card">
        <div className="mgmt-toolbar" style={{ marginBottom: 14 }}>
          <input
            className="field"
            style={{ flex: 1, minWidth: 200 }}
            type="search"
            placeholder="Buscar por correo…"
            aria-label="Buscar usuario por correo"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <select className="field" aria-label="Filtrar por rol" value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)}>
            <option value="todos">Todos los roles</option>
            <option value="admin">Administradores</option>
            <option value="gerente">Gerentes</option>
            <option value="usuario">Usuarios</option>
          </select>
          <button className="mgmt-btn" onClick={cargarUsuarios} disabled={loading}>
            <i className="fa-solid fa-rotate" style={{ marginRight: 6 }}></i>Actualizar
          </button>
        </div>

        {loading ? (
          <p style={{ padding: 24, textAlign: 'center', color: 'var(--neutral-500)' }}>Cargando usuarios…</p>
        ) : (
          <div className="mgmt-table-wrap">
            <table className="mgmt-table">
              <thead>
                <tr>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Registro</th>
                  <th>Último acceso</th>
                  <th>Cambiar rol</th>
                </tr>
              </thead>
              <tbody>
                {visibles.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--neutral-500)', padding: 28 }}>
                    {usuarios.length === 0 ? 'No hay usuarios para mostrar.' : 'Ningún usuario coincide con el filtro.'}
                  </td></tr>
                ) : visibles.map(u => {
                  const esYo = user && u.user_id === user.id;
                  const protegido = u.rol === 'admin' || esYo;
                  const info = ROLES[u.rol] || ROLES.usuario;
                  return (
                    <tr key={u.user_id}>
                      <td>
                        {u.email || <em style={{ color: 'var(--neutral-500)' }}>sin correo</em>}
                        {esYo && <span className="pill pill-neutral" style={{ marginLeft: 8 }}>Tú</span>}
                      </td>
                      <td><span className={info.pill}>{info.label}</span></td>
                      <td>{fmtFecha(u.creado)}</td>
                      <td>{u.ultimo_acceso ? fmtFecha(u.ultimo_acceso, true) : 'Sin ingresar'}</td>
                      <td>
                        {protegido ? (
                          <span style={{ color: 'var(--neutral-500)', fontSize: '0.8rem' }}>
                            <i className="fa-solid fa-lock" style={{ marginRight: 6 }}></i>Protegido
                          </span>
                        ) : (
                          <select
                            className="field"
                            aria-label={`Rol de ${u.email}`}
                            value={u.rol}
                            disabled={guardando === u.user_id}
                            onChange={(e) => cambiarRol(u, e.target.value)}
                          >
                            <option value="usuario">Usuario</option>
                            <option value="gerente">Gerente</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p style={{ margin: '14px 0 0', fontSize: '0.78rem', color: 'var(--neutral-500)' }}>
          Los administradores y tu propia cuenta están protegidos: su rol solo se cambia desde la base de datos.
        </p>
      </div>
    </div>
  );
}
