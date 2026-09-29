import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../config/supabaseClient';
import { initialZonas } from '../data/seedData';

const DEMO_COBERTURA = [
  { idzona: 1, proveedor: 'Entel', nivelcobertura: 'alta' },
  { idzona: 1, proveedor: 'Viva', nivelcobertura: 'alta' },
  { idzona: 1, proveedor: 'Tigo', nivelcobertura: 'alta' },
  { idzona: 2, proveedor: 'Entel', nivelcobertura: 'alta' },
  { idzona: 2, proveedor: 'Viva', nivelcobertura: 'media' },
  { idzona: 2, proveedor: 'Tigo', nivelcobertura: 'alta' },
  { idzona: 3, proveedor: 'Entel', nivelcobertura: 'alta' },
  { idzona: 3, proveedor: 'Viva', nivelcobertura: 'alta' },
  { idzona: 3, proveedor: 'Tigo', nivelcobertura: 'alta' },
  { idzona: 4, proveedor: 'Entel', nivelcobertura: 'alta' },
  { idzona: 4, proveedor: 'Viva', nivelcobertura: 'media' },
  { idzona: 4, proveedor: 'Tigo', nivelcobertura: 'alta' },
  { idzona: 5, proveedor: 'Entel', nivelcobertura: 'alta' },
  { idzona: 5, proveedor: 'Viva', nivelcobertura: 'alta' },
  { idzona: 5, proveedor: 'Tigo', nivelcobertura: 'alta' },
  { idzona: 6, proveedor: 'Entel', nivelcobertura: 'alta' },
  { idzona: 6, proveedor: 'Viva', nivelcobertura: 'media' },
  { idzona: 6, proveedor: 'Tigo', nivelcobertura: 'media' },
  { idzona: 7, proveedor: 'Entel', nivelcobertura: 'alta' },
  { idzona: 7, proveedor: 'Viva', nivelcobertura: 'media' },
  { idzona: 7, proveedor: 'Tigo', nivelcobertura: 'alta' },
  { idzona: 8, proveedor: 'Entel', nivelcobertura: 'alta' },
  { idzona: 8, proveedor: 'Viva', nivelcobertura: 'media' },
  { idzona: 8, proveedor: 'Tigo', nivelcobertura: 'media' },
  { idzona: 9, proveedor: 'Entel', nivelcobertura: 'alta' },
  { idzona: 9, proveedor: 'Viva', nivelcobertura: 'baja' },
  { idzona: 9, proveedor: 'Tigo', nivelcobertura: 'media' },
  { idzona: 10, proveedor: 'Entel', nivelcobertura: 'alta' },
  { idzona: 10, proveedor: 'Viva', nivelcobertura: 'media' },
  { idzona: 10, proveedor: 'Tigo', nivelcobertura: 'alta' },
  { idzona: 11, proveedor: 'Entel', nivelcobertura: 'alta' },
  { idzona: 11, proveedor: 'Viva', nivelcobertura: 'baja' },
  { idzona: 11, proveedor: 'Tigo', nivelcobertura: 'media' },
  { idzona: 12, proveedor: 'Entel', nivelcobertura: 'alta' },
  { idzona: 12, proveedor: 'Viva', nivelcobertura: 'baja' },
  { idzona: 12, proveedor: 'Tigo', nivelcobertura: 'baja' },
  { idzona: 13, proveedor: 'Entel', nivelcobertura: 'alta' },
  { idzona: 13, proveedor: 'Viva', nivelcobertura: 'baja' },
  { idzona: 14, proveedor: 'Entel', nivelcobertura: 'media' },
  { idzona: 14, proveedor: 'Viva', nivelcobertura: 'baja' },
  { idzona: 14, proveedor: 'Tigo', nivelcobertura: 'baja' }
];

const PROVEEDORES = ['Entel', 'Viva', 'Tigo', 'AXS'];

export default function CoberturaView() {
  const [coberturas, setCoberturas] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [selectedZona, setSelectedZona] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      if (isSupabaseConfigured) {
        try {
          const { data: rawZonas } = await supabase.from('zonacobertura').select('*').order('idzona');
          const { data: rawCob } = await supabase.from('zonaproveedor').select('*');
          if (rawZonas && rawZonas.length > 0) setZonas(rawZonas);
          else setZonas(initialZonas.map(z => ({ idzona: z.idZona, nombresector: z.nombreSector })));
          setCoberturas(rawCob || DEMO_COBERTURA);
        } catch (error) {
          console.error("Error cargando coberturas:", error);
          setZonas(initialZonas.map(z => ({ idzona: z.idZona, nombresector: z.nombreSector })));
          setCoberturas(DEMO_COBERTURA);
        }
      } else {
        setZonas(initialZonas.map(z => ({ idzona: z.idZona, nombresector: z.nombreSector })));
        setCoberturas(DEMO_COBERTURA);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const getCobertura = (idzona, proveedor) => {
    return coberturas.find(c => c.idzona === idzona && c.proveedor === proveedor);
  };

  const getBadgeStyle = (nivel) => {
    switch (nivel?.toLowerCase()) {
      case 'alta':
        return { background: '#DEF7EC', color: '#03543F', border: '1px solid #84E1BC' };
      case 'media':
        return { background: '#FEF08A', color: '#713F12', border: '1px solid #FDE047' };
      case 'baja':
        return { background: '#FDE8E8', color: '#9B1C1C', border: '1px solid #F8B4B4' };
      default:
        return { background: '#F3F4F6', color: '#4B5563', border: '1px solid #E5E7EB' };
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Page Title */}
      <div className="page-title-section" style={{ marginBottom: '24px' }}>
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
            <i className="fa-solid fa-signal"></i>
          </div>
          <div>
            <h1 className="page-title" style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--neutral-900)' }}>
              Cobertura por zona
            </h1>
            <p className="page-subtitle" style={{ margin: '4px 0 0', color: 'var(--neutral-500)', fontSize: '0.88rem' }}>
              Disponibilidad de infraestructura fija y móvil por operadora en Bolivia
            </p>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="card" style={{
        background: 'white',
        borderRadius: 'var(--radius-lg, 16px)',
        border: '1px solid var(--neutral-200)',
        boxShadow: 'var(--shadow-md)',
        overflow: 'hidden'
      }}>
        {/* Selector Header */}
        <div style={{
          padding: '16px 24px',
          background: 'var(--neutral-50)',
          borderBottom: '1px solid var(--neutral-200)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <label style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--neutral-800)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-map-pin" style={{ color: 'var(--primary-500)' }}></i>
            Seleccionar Zona Geográfica:
          </label>
          <select
            value={selectedZona}
            onChange={(e) => setSelectedZona(Number(e.target.value))}
            style={{
              padding: '10px 16px',
              borderRadius: 'var(--radius-md, 10px)',
              border: '1px solid var(--neutral-300)',
              fontSize: '0.9rem',
              fontWeight: 600,
              background: 'white',
              color: 'var(--neutral-800)',
              outline: 'none',
              cursor: 'pointer',
              minWidth: '280px'
            }}
          >
            {zonas.map(z => (
              <option key={z.idzona || z.id} value={z.idzona || z.id}>
                {z.nombresector || z.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Table Body */}
        <div style={{ padding: '0', overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--neutral-500)' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Cargando coberturas...
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textLeft: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--neutral-100)', borderBottom: '1px solid var(--neutral-200)' }}>
                  <th style={{ padding: '14px 24px', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--neutral-600)', fontWeight: 700 }}>
                    Operadora / Proveedor
                  </th>
                  <th style={{ padding: '14px 24px', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--neutral-600)', fontWeight: 700 }}>
                    Nivel de cobertura registrado
                  </th>
                  <th style={{ padding: '14px 24px', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--neutral-600)', fontWeight: 700 }}>
                    Estado en la recomendación
                  </th>
                </tr>
              </thead>
              <tbody>
                {PROVEEDORES.map(prov => {
                  const cob = getCobertura(selectedZona, prov);
                  return (
                    <tr key={prov} style={{ borderBottom: '1px solid var(--neutral-150)', transition: 'background 0.15s ease' }}>
                      <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--neutral-900)', fontSize: '0.95rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: prov === 'Entel' ? '#1D4ED8' : prov === 'Tigo' ? '#0284C7' : prov === 'Viva' ? '#E11D48' : '#6B7280',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem'
                          }}>
                            {prov.charAt(0)}
                          </div>
                          <span>{prov}</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        {cob ? (
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '999px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            ...getBadgeStyle(cob.nivelcobertura)
                          }}>
                            <i className="fa-solid fa-circle" style={{ fontSize: '0.45rem' }}></i>
                            {cob.nivelcobertura.toUpperCase()}
                          </span>
                        ) : (
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '999px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            background: '#F3F4F6',
                            color: '#6B7280',
                            border: '1px solid #E5E7EB',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <i className="fa-solid fa-circle-xmark" style={{ color: '#9CA3AF' }}></i>
                            SIN REGISTRO
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '0.85rem' }}>
                        {cob ? (
                          <span style={{ color: '#15803D', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fa-solid fa-check" style={{ color: '#22C55E' }}></i> Evaluación Habilitada
                          </span>
                        ) : (
                          <span style={{ color: '#B91C1C', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fa-solid fa-ban" style={{ color: '#EF4444' }}></i> Excluido (sin cobertura en esta zona)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
