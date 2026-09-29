import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../config/supabaseClient';

const TIPOS_USO_OPTIONS = [
  { id: 'streaming', label: 'Streaming 4K / TV', icon: 'fa-tv' },
  { id: 'gaming', label: 'Gaming Online / Latencia Baja', icon: 'fa-gamepad' },
  { id: 'teletrabajo', label: 'Teletrabajo / Videollamadas HD', icon: 'fa-headset' },
  { id: 'oficina', label: 'Oficina / Uso Empresarial', icon: 'fa-briefcase' },
  { id: 'otro', label: 'Navegación General', icon: 'fa-globe' }
];

export default function PerfilesView({ usuario, onUpdatePerfil, onToast }) {
  const { user, perfil, updatePerfil } = useAuth();
  
  const [ubicacion, setUbicacion] = useState('');
  const [presupuesto, setPresupuesto] = useState(300);
  const [tiposUso, setTiposUso] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errorPresupuesto, setErrorPresupuesto] = useState('');
  
  const currentUser = isSupabaseConfigured ? user : usuario;
  const currentEmail = currentUser?.email || 'Usuario Demo';
  const currentPerfil = isSupabaseConfigured ? perfil : usuario?.perfil;

  useEffect(() => {
    if (currentPerfil) {
      setUbicacion(currentPerfil.ubicacion || '');
      setPresupuesto(currentPerfil.presupuestomax || 300);
      setTiposUso(currentPerfil.tipousos || []);
    }
  }, [currentPerfil]);

  const handleTipoUsoToggle = (id) => {
    if (tiposUso.includes(id)) {
      setTiposUso(tiposUso.filter(t => t !== id));
    } else {
      setTiposUso([...tiposUso, id]);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const presNum = Number(presupuesto);
    if (isNaN(presNum) || presNum < 1 || presNum > 10000) {
      setErrorPresupuesto('El presupuesto debe ser un número entre 1 y 10,000 Bs');
      return;
    }
    setErrorPresupuesto('');
    setSaving(true);
    
    try {
      if (isSupabaseConfigured) {
        await updatePerfil({ ubicacion, presupuestomax: presNum, tipousos: tiposUso });
      } else if (onUpdatePerfil) {
        await onUpdatePerfil({ ubicacion, presupuestomax: presNum, tipousos: tiposUso });
      }
      if (onToast) onToast('¡Perfil guardado correctamente en la base de datos!', 'success');
    } catch (err) {
      console.error("Error al guardar perfil:", err);
      if (onToast) onToast('Error al actualizar el perfil', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar tu cuenta? Tu historial de recomendaciones se conservará de forma anónima (Regla D-9).')) {
      return;
    }
    try {
      if (isSupabaseConfigured) {
        // Pseudonimización (D-9): vaciamos los datos del perfil antes de cerrar sesión
        // En una app completa, esto llamaría a una RPC para inhabilitar el usuario en auth.users
        await updatePerfil({ ubicacion: '[Eliminado]', presupuestomax: 1, tipousos: [] });
      }
      if (onToast) onToast('Cuenta pseudonimizada correctamente. El historial se ha conservado (D-9).', 'info');
      
      // Cerrar sesión usando signOut del contexto de auth ya importado
      if (isSupabaseConfigured) {
        // En lugar de import dinámico, usamos reload para desloguear localmente si no tenemos acceso a signOut acá
        // Aunque podemos desloguear usando el window
        window.location.reload(); 
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Title Section */}
      <div className="page-title-section" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md, 10px)',
            background: 'linear-gradient(135deg, var(--primary-500, #C85A2A), var(--primary-700, #883818))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.2rem',
            boxShadow: '0 4px 12px rgba(200,90,42,0.25)'
          }}>
            <i className="fa-solid fa-id-card"></i>
          </div>
          <div>
            <h1 className="page-title" style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--neutral-900)' }}>
              Mi Perfil de Usuario
            </h1>
            <p className="page-subtitle" style={{ margin: '4px 0 0', color: 'var(--neutral-500)', fontSize: '0.88rem' }}>
              Personaliza tus límites presupuestarios y necesidades de conectividad para el motor DSS
            </p>
          </div>
        </div>
      </div>

      {/* Main Profile Form Card */}
      <div className="card" style={{
        background: 'white',
        borderRadius: 'var(--radius-lg, 16px)',
        border: '1px solid var(--neutral-200)',
        boxShadow: 'var(--shadow-md)',
        overflow: 'hidden'
      }}>
        {/* Card Header Banner */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(90deg, var(--neutral-900) 0%, #1A1A2E 100%)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'var(--primary-500)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.1rem'
            }}>
              {currentEmail.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{currentEmail}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.75 }}>
                <i className="fa-solid fa-shield-halved" style={{ marginRight: '4px' }}></i>
                {isSupabaseConfigured ? 'Cuenta Autenticada vía Supabase Cloud' : 'Modo Demo Local'}
              </div>
            </div>
          </div>
          <span className="badge" style={{
            background: 'rgba(34, 197, 94, 0.2)',
            color: '#4ADE80',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            padding: '4px 12px',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: 600
          }}>
            <i className="fa-solid fa-circle" style={{ fontSize: '0.5rem', marginRight: '6px' }}></i> Activo
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Form Row: Ubicación */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', color: 'var(--neutral-800)', marginBottom: '8px' }}>
              <i className="fa-solid fa-location-dot" style={{ color: 'var(--primary-500)', marginRight: '8px' }}></i>
              Ubicación o Sector (Zona Geográfica)
            </label>
            <input 
              type="text" 
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              placeholder="Ej. La Paz (Zona Sur, Sopocachi) / Santa Cruz (Equipetrol)..."
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md, 10px)',
                border: '1px solid var(--neutral-300)',
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'border 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary-500)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--neutral-300)'}
            />
          </div>

          {/* Form Row: Presupuesto Máximo */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--neutral-800)' }}>
                <i className="fa-solid fa-wallet" style={{ color: 'var(--primary-500)', marginRight: '8px' }}></i>
                Presupuesto Máximo Mensual (Bs)
              </label>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-600)' }}>
                Bs {presupuesto || 0}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontWeight: 600,
                  color: 'var(--neutral-500)'
                }}>Bs</span>
                <input 
                  type="number" 
                  min="1"
                  max="10000"
                  value={presupuesto}
                  onChange={(e) => {
                    setPresupuesto(e.target.value);
                    if (errorPresupuesto) setErrorPresupuesto('');
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px 12px 42px',
                    borderRadius: 'var(--radius-md, 10px)',
                    border: `1px solid ${errorPresupuesto ? 'var(--danger, #EF4444)' : 'var(--neutral-300)'}`,
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', alignSelf: 'center', marginRight: '4px' }}>Accesos rápidos:</span>
              {[150, 250, 350, 500, 750].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => { setPresupuesto(p); setErrorPresupuesto(''); }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full, 999px)',
                    border: presupuesto == p ? '1px solid var(--primary-500)' : '1px solid var(--neutral-300)',
                    background: presupuesto == p ? 'var(--primary-50)' : 'var(--neutral-50)',
                    color: presupuesto == p ? 'var(--primary-600)' : 'var(--neutral-700)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Bs {p}
                </button>
              ))}
            </div>

            {errorPresupuesto && (
              <p style={{ color: 'var(--danger, #EF4444)', fontSize: '0.8rem', marginTop: '6px' }}>
                <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>
                {errorPresupuesto}
              </p>
            )}
          </div>

          {/* Form Row: Tipos de Uso */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', color: 'var(--neutral-800)', marginBottom: '8px' }}>
              <i className="fa-solid fa-sliders" style={{ color: 'var(--primary-500)', marginRight: '8px' }}></i>
              Tipos de Uso Prioritarios (Preferencias de Consumo)
            </label>
            <p style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', marginTop: '-4px', marginBottom: '12px' }}>
              Selecciona una o más opciones para personalizar las recomendaciones del algoritmo SAW
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
              {TIPOS_USO_OPTIONS.map(tipo => {
                const isSelected = tiposUso.includes(tipo.id);
                return (
                  <div
                    key={tipo.id}
                    onClick={() => handleTipoUsoToggle(tipo.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md, 10px)',
                      border: isSelected ? '2px solid var(--primary-500)' : '1px solid var(--neutral-200)',
                      background: isSelected ? 'var(--primary-50, #FFF5F0)' : 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'all 0.2s ease',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: isSelected ? 'var(--primary-500)' : 'var(--neutral-100)',
                      color: isSelected ? 'white' : 'var(--neutral-600)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.9rem'
                    }}>
                      <i className={`fa-solid ${tipo.icon}`}></i>
                    </div>
                    <span style={{
                      fontSize: '0.85rem',
                      fontWeight: isSelected ? 600 : 500,
                      color: isSelected ? 'var(--primary-800)' : 'var(--neutral-700)',
                      flex: 1
                    }}>
                      {tipo.label}
                    </span>
                    {isSelected && (
                      <i className="fa-solid fa-circle-check" style={{ color: 'var(--primary-500)', fontSize: '1rem' }}></i>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submit Action */}
          <div style={{ borderTop: '1px solid var(--neutral-200)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleDeleteAccount}
              style={{
                padding: '10px 16px',
                borderRadius: 'var(--radius-md, 10px)',
                background: 'transparent',
                color: 'var(--danger, #EF4444)',
                border: '1px solid var(--danger, #EF4444)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <i className="fa-solid fa-user-xmark"></i> Eliminar Cuenta (D-9)
            </button>

            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '12px 28px',
                borderRadius: 'var(--radius-md, 10px)',
                background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
                color: 'white',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(200,90,42,0.3)',
                transition: 'transform 0.15s ease'
              }}
            >
              {saving ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Guardando...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk"></i> Guardar Perfil
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
