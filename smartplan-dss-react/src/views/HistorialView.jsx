import React, { useState, useEffect } from 'react';
import { getHistorialByPerfil } from '../services/recomendacionService';

export default function HistorialView({ perfilId, onSaveRecomendacion, onToast }) {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistorial();
  }, [perfilId]);

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
        <span style={{ color: 'var(--neutral-600)', fontWeight: 500 }}>Cargando tu historial de recomendaciones desde Supabase...</span>
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
              Historial de Recomendaciones
            </h1>
            <p className="page-subtitle" style={{ margin: '4px 0 0', color: 'var(--neutral-500)', fontSize: '0.88rem' }}>
              Registro persistente de análisis SAW y simulaciones ejecutadas
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
          <i className="fa-solid fa-floppy-disk"></i> Guardar Recomendación Actual
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
            <i className="fa-solid fa-plus"></i> Guardar Mi Primera Recomendación
          </button>
        </div>
      ) : (
        /* Historial Item List */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {historial.map((item, idx) => {
            const reco = item.recomendacion || {};
            const fecha = reco.fechacalculo ? new Date(reco.fechacalculo).toLocaleString() : 'Fecha recien guardada';
            const esSim = reco.essimulacion;

            return (
              <div key={reco.idrecomendacion || idx} className="card" style={{
                background: 'white',
                borderRadius: 'var(--radius-lg, 16px)',
                border: esSim ? '1px solid #93C5FD' : '1px solid var(--neutral-200)',
                padding: '20px',
                boxShadow: 'var(--shadow-md)'
              }}>
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--neutral-150)', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fa-regular fa-calendar-check" style={{ color: 'var(--primary-500)', fontSize: '1.1rem' }}></i>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--neutral-900)' }}>{fecha}</span>
                    <span style={{ background: 'var(--neutral-100)', color: 'var(--neutral-600)', padding: '2px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600 }}>
                      Zona #{reco.idzona || 1}
                    </span>
                  </div>

                  {esSim ? (
                    <span style={{ background: '#DBEAFE', color: '#1E40AF', padding: '4px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-flask"></i> SIMULACIÓN (D-3)
                    </span>
                  ) : (
                    <span style={{ background: '#DCFCE7', color: '#166534', padding: '4px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-circle-check"></i> RECOMENDACIÓN ORIGINAL
                    </span>
                  )}
                </div>

                {/* Parameters Strip */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center', background: 'var(--neutral-50)', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', display: 'block' }}>Presupuesto Usado</span>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary-600)' }}>Bs {reco.presupuestousado || 300}</span>
                  </div>

                  <div style={{ width: '1px', height: '24px', background: 'var(--neutral-300)' }}></div>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', marginRight: '4px' }}>Pesos Aplicados:</span>
                    <span style={{ background: 'white', border: '1px solid var(--neutral-300)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>Precio: {reco.pesoprecio}</span>
                    <span style={{ background: 'white', border: '1px solid var(--neutral-300)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>Vel: {reco.pesovelocidad}</span>
                    <span style={{ background: 'white', border: '1px solid var(--neutral-300)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>Cob: {reco.pesocobertura}</span>
                    <span style={{ background: 'white', border: '1px solid var(--neutral-300)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>Est: {reco.pesoestabilidad}</span>
                  </div>
                </div>

                {/* Details Top 3 Cards */}
                <div>
                  <h4 style={{ margin: '0 0 12px', fontSize: '0.88rem', fontWeight: 700, color: 'var(--neutral-700)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Top 3 Recomendaciones Registradas:
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                    {(item.detalles || []).map(det => (
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--neutral-600)' }}>
                          <span>Tarifa: <strong style={{ color: 'var(--neutral-900)' }}>Bs {det.preciosnapshot}</strong>/mes</span>
                          <span>Velocidad: <strong style={{ color: 'var(--neutral-900)' }}>{det.velocidadsnapshot} Mbps</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
