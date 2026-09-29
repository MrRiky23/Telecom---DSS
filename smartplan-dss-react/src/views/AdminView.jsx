import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../config/supabaseClient';

export default function AdminView({ onToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    
    // We assume user_roles contains a mapping of user_id to role. 
    // In a real app we might join with auth.users if we had access, but typically we query user_roles.
    const { data, error } = await supabase.from('user_roles').select('*');
    if (error) {
      if (onToast) onToast('Error al cargar roles de usuario', 'error');
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const handleChangeRole = async (userId, newRole) => {
    if (newRole !== 'usuario' && newRole !== 'gerente') {
      if (onToast) onToast('Solo puedes asignar roles de usuario o gerente', 'error');
      return;
    }

    const { error } = await supabase
      .from('user_roles')
      .update({ rol: newRole })
      .eq('user_id', userId);

    if (error) {
      if (onToast) onToast('Error al cambiar rol', 'error');
    } else {
      if (onToast) onToast('Rol actualizado exitosamente', 'success');
      loadUsers();
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando usuarios...</div>;

  return (
    <div className="card" style={{ padding: '30px', backgroundColor: 'var(--neutral-100)', borderRadius: 'var(--radius-lg)', maxWidth: '1000px', margin: '0 auto' }}>
      <h2 className="card-title" style={{ color: 'var(--primary-500)', marginBottom: '25px', borderBottom: '2px solid var(--primary-50)', paddingBottom: '10px' }}>
        <i className="fa-solid fa-users-gear" style={{ marginRight: '10px' }}></i>
        Panel de Administración
      </h2>
      
      <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: 'var(--neutral-100)' }}>
            <tr>
              <th style={{ padding: '15px', textAlign: 'left', color: 'var(--neutral-700)', fontWeight: 'bold' }}>ID de Usuario</th>
              <th style={{ padding: '15px', textAlign: 'left', color: 'var(--neutral-700)', fontWeight: 'bold' }}>Rol Actual</th>
              <th style={{ padding: '15px', textAlign: 'left', color: 'var(--neutral-700)', fontWeight: 'bold' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? users.map(user => (
              <tr key={user.user_id} style={{ borderBottom: '1px solid var(--neutral-100)', transition: 'background-color 0.2s' }}>
                <td style={{ padding: '15px', color: 'var(--neutral-800)', fontFamily: 'monospace' }}>{user.user_id}</td>
                <td style={{ padding: '15px' }}>
                  <span className={`badge ${user.rol === 'admin' ? 'badge-error' : user.rol === 'gerente' ? 'badge-warning' : 'badge-info'}`} style={{ padding: '5px 10px', borderRadius: '15px', textTransform: 'capitalize' }}>
                    {user.rol}
                  </span>
                </td>
                <td style={{ padding: '15px', display: 'flex', gap: '10px' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handleChangeRole(user.user_id, 'usuario')}
                    disabled={user.rol === 'usuario'}
                    style={{ opacity: user.rol === 'usuario' ? 0.5 : 1, cursor: user.rol === 'usuario' ? 'not-allowed' : 'pointer', padding: '8px 12px', fontSize: '0.9rem' }}
                  >
                    Hacer Usuario
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => handleChangeRole(user.user_id, 'gerente')}
                    disabled={user.rol === 'gerente'}
                    style={{ opacity: user.rol === 'gerente' ? 0.5 : 1, cursor: user.rol === 'gerente' ? 'not-allowed' : 'pointer', padding: '8px 12px', fontSize: '0.9rem' }}
                  >
                    Hacer Gerente
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="3" style={{ padding: '30px', textAlign: 'center', color: 'var(--neutral-500)' }}>
                  No se encontraron usuarios
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
