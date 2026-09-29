import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../config/supabaseClient';

export default function ZonasView({ onToast }) {
  const [zonas, setZonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newZonaName, setNewZonaName] = useState('');

  useEffect(() => {
    loadZonas();
  }, []);

  const loadZonas = async () => {
    setLoading(true);
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('zonacobertura')
      .select('*, zonaproveedor(*)')
      .order('idzona', { ascending: true });
    
    if (error) {
      if (onToast) onToast('Error al cargar zonas', 'error');
    } else {
      setZonas(data || []);
    }
    setLoading(false);
  };

  const handleCreateZona = async (e) => {
    e.preventDefault();
    if (!newZonaName.trim()) return;
    const { error } = await supabase.from('zonacobertura').insert({ nombresector: newZonaName });
    if (error) {
      if (onToast) onToast('Error al crear zona', 'error');
    } else {
      if (onToast) onToast('Zona creada exitosamente', 'success');
      setNewZonaName('');
      loadZonas();
    }
  };

  const handleToggleActive = async (zona) => {
    const { error } = await supabase
      .from('zonacobertura')
      .update({ activo: !zona.activo })
      .eq('idzona', zona.idzona);
    if (error) {
      if (onToast) onToast('Error al actualizar zona', 'error');
    } else {
      if (onToast) onToast(`Zona ${!zona.activo ? 'reactivada' : 'desactivada'}`, 'success');
      loadZonas();
    }
  };

  const getBadgeClass = (nivel) => {
    if (nivel === 'alta') return 'badge badge-info';
    if (nivel === 'media') return 'badge badge-warning';
    if (nivel === 'baja') return 'badge badge-error';
    return 'badge';
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="card" style={{ padding: '20px', backgroundColor: 'var(--neutral-100)', borderRadius: 'var(--radius-lg)' }}>
      <h2 className="card-title" style={{ color: 'var(--primary-500)', marginBottom: '20px' }}>Gestión de Zonas</h2>
      <form onSubmit={handleCreateZona} style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          value={newZonaName} 
          onChange={(e) => setNewZonaName(e.target.value)} 
          placeholder="Nombre nueva zona" 
          className="form-input"
          style={{ padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-300)', flex: 1 }}
        />
        <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px', backgroundColor: 'var(--primary-500)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)' }}>Crear Zona</button>
      </form>

      <div style={{ display: 'grid', gap: '20px' }}>
        {zonas.map(zona => (
          <div key={zona.idzona} className="card-body" style={{ backgroundColor: 'white', border: '1px solid var(--neutral-300)', borderRadius: 'var(--radius-md)', padding: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: 'var(--primary-500)' }}>{zona.nombresector} {zona.activo ? <span className="badge" style={{ backgroundColor: '#4CAF50', color: 'white', marginLeft: '10px', fontSize: '0.8rem' }}>Activa</span> : <span className="badge" style={{ backgroundColor: '#F44336', color: 'white', marginLeft: '10px', fontSize: '0.8rem' }}>Inactiva</span>}</h3>
              <button className="btn btn-secondary" onClick={() => handleToggleActive(zona)} style={{ padding: '8px 15px', border: '1px solid var(--neutral-300)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                {zona.activo ? 'Desactivar' : 'Reactivar'}
              </button>
            </div>
            {zona.zonaproveedor && zona.zonaproveedor.length > 0 ? (
              <table style={{ width: '100%', marginTop: '15px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--primary-50)' }}>
                    <th style={{ textAlign: 'left', padding: '10px 0' }}>Proveedor</th>
                    <th style={{ textAlign: 'left', padding: '10px 0' }}>Nivel Cobertura</th>
                  </tr>
                </thead>
                <tbody>
                  {zona.zonaproveedor.map(zp => (
                    <tr key={zp.proveedor} style={{ borderBottom: '1px solid var(--neutral-100)' }}>
                      <td style={{ padding: '10px 0' }}>{zp.proveedor}</td>
                      <td style={{ padding: '10px 0' }}><span className={getBadgeClass(zp.nivelcobertura)}>{zp.nivelcobertura}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ marginTop: '15px', color: 'var(--neutral-500)' }}>No hay datos de cobertura para esta zona.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
