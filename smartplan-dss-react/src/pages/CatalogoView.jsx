import React, { useState, useRef } from 'react'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { getNivelCobertura } from '../services/supabaseServices'

export default function CatalogoView({ planes, zonas = [], selectedZonaId, onAddPlan, onUpdatePlan, onDeletePlan, onImportPlans, onToast }) {
  const zonaInicial = selectedZonaId ?? zonas[0]?.idZona ?? 1;
  const [providerFilter, setProviderFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPlan, setEditingPlan] = useState(null); // null = nuevo o seleccionando
  const [formData, setFormData] = useState({
    nombrePlan: 'Hogar 20 Mbps',
    proveedor: 'Entel',
    precioMensual: 120,
    velocidadMbps: 20,
    limiteDatosGB: 0,
    indiceEstabilidad: 85,
    nivelCobertura: 'Alta',
    idZona: zonaInicial,
    tecnologia: 'Fibra Óptica FTTH',
    descripcion: ''
  });

  const fileInputRef = useRef(null);

  // Importación de planes desde CSV o JSON (solo administrador: la vista recibe onImportPlans únicamente en ese caso).
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file || !onImportPlans) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target.result;
        if (file.name.toLowerCase().endsWith('.json')) {
          const json = JSON.parse(content);
          onImportPlans(Array.isArray(json) ? json : (json.planes || [json]));
        } else {
          const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
          if (lines.length <= 1) {
            onToast && onToast('El archivo no tiene filas para importar.', 'warning');
            return;
          }
          const importados = [];
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length >= 3) {
              importados.push({
                proveedor: values[0] || 'Proveedor',
                nombrePlan: values[1] || 'Plan importado',
                precioMensual: parseFloat(values[2]) || 150,
                velocidadMbps: parseInt(values[3]) || 50,
                indiceEstabilidad: parseInt(values[4]) || 90,
                tecnologia: values[5] || 'Fibra Óptica FTTH'
              });
            }
          }
          onImportPlans(importados);
        }
      } catch (err) {
        console.error('Error al importar archivo:', err);
        onToast && onToast('No se pudo leer el archivo. Revisa que sea un CSV o JSON válido.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const planesFiltrados = planes.filter(p => {
    const matchesProvider = providerFilter === 'todos' || p.proveedor.toLowerCase() === providerFilter;
    const matchesSearch = p.nombrePlan.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.proveedor.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesProvider && matchesSearch;
  });

  const countEntel = planes.filter(p => p.proveedor === 'Entel').length;
  const countTigo = planes.filter(p => p.proveedor === 'Tigo').length;
  const countViva = planes.filter(p => p.proveedor === 'Viva').length;

  const precioPromedio = Math.round(planes.reduce((acc, curr) => acc + Number(curr.precioMensual), 0) / (planes.length || 1));
  const velocidadPromedio = Math.round(planes.reduce((acc, curr) => acc + Number(curr.velocidadMbps), 0) / (planes.length || 1));

  // Solo cuentan los planes con dato real de cobertura; sin datos no se inventa un porcentaje.
  const planesConCobertura = planes.filter(p => p.nivelCobertura);
  const coberturaAlta = planesConCobertura.length
    ? Math.round((planesConCobertura.filter(p => p.nivelCobertura.toLowerCase() === 'alta').length / planesConCobertura.length) * 100)
    : null;

  const handleEditClick = (plan) => {
    setEditingPlan(plan);
    setFormData({
      idPlan: plan.idPlan,
      nombrePlan: plan.nombrePlan,
      proveedor: plan.proveedor,
      precioMensual: plan.precioMensual,
      velocidadMbps: plan.velocidadMbps,
      limiteDatosGB: plan.limiteDatosGB,
      indiceEstabilidad: plan.indiceEstabilidad ?? 90,
      nivelCobertura: plan.nivelCobertura || 'Alta',
      idZona: plan.idZona ?? zonaInicial,
      tecnologia: plan.tecnologia || 'FTTH',
      descripcion: plan.descripcion || ''
    });
  };

  const handleNewClick = () => {
    setEditingPlan(null);
    setFormData({
      nombrePlan: '',
      proveedor: 'Entel',
      precioMensual: 150,
      velocidadMbps: 50,
      limiteDatosGB: 0,
      indiceEstabilidad: 85,
      nivelCobertura: 'Alta',
      idZona: zonaInicial,
      tecnologia: 'Fibra Óptica FTTH',
      descripcion: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nombre = String(formData.nombrePlan ?? '').trim();
    const precio = formData.precioMensual;
    const velocidad = formData.velocidadMbps;
    const estab = formData.indiceEstabilidad;

    if (!nombre) {
      onToast('Ingrese el nombre del plan', 'error');
      return;
    }
    if (nombre.length > 80) {
      onToast('El nombre del plan no puede superar los 80 caracteres', 'error');
      return;
    }
    if (precio === '' || !Number.isFinite(Number(precio)) || Number(precio) < 0) {
      onToast('El precio mensual es obligatorio y no puede ser negativo', 'error');
      return;
    }
    if (Number(precio) > 99999999) {
      onToast('El precio mensual ingresado es demasiado alto', 'error');
      return;
    }
    if (velocidad === '' || !Number.isInteger(Number(velocidad)) || Number(velocidad) <= 0) {
      onToast('La velocidad debe ser un número entero mayor a 0 Mbps', 'error');
      return;
    }
    if (estab === '' || estab === null || estab === undefined
      || Number.isNaN(Number(estab)) || Number(estab) < 0 || Number(estab) > 100) {
      onToast('El Índice de Estabilidad es obligatorio y debe estar entre 0 y 100', 'error');
      return;
    }
    const idZona = Number(formData.idZona);
    if (!Number.isInteger(idZona) || idZona <= 0) {
      onToast('Seleccione la zona del plan', 'error');
      return;
    }
    // HU-C01.3: mismo proveedor + nombrePlan (sin distinguir mayúsculas) ya existente.
    const duplicado = planes.some((p) =>
      p.idPlan !== formData.idPlan &&
      p.proveedor.toLowerCase() === formData.proveedor.toLowerCase() &&
      p.nombrePlan.trim().toLowerCase() === nombre.toLowerCase()
    );
    if (duplicado) {
      onToast('Ya existe un plan con ese nombre para este proveedor.', 'error');
      return;
    }

    const datos = {
      ...formData,
      nombrePlan: nombre,
      precioMensual: Number(precio),
      velocidadMbps: Number(velocidad),
      indiceEstabilidad: Number(estab),
      idZona
    };

    // Solo se muestra "éxito" si el handler confirma que se guardó de verdad.
    if (editingPlan) {
      const ok = await onUpdatePlan(datos);
      if (ok) onToast(`Plan "${nombre}" actualizado con éxito`, 'success');
      else return;
    } else {
      const ok = await onAddPlan({ ...datos, idPlan: Date.now(), activo: true });
      if (ok) onToast(`Plan "${nombre}" creado exitosamente`, 'success');
      else return;
    }
    handleNewClick();
  };

  const handleDelete = async (plan) => {
    if (!window.confirm(`¿Dar de baja el plan "${plan.nombrePlan}" de ${plan.proveedor}? Dejará de aparecer en el catálogo y en las recomendaciones, pero el historial se conserva.`)) return;
    const ok = await onDeletePlan(plan.idPlan);
    if (ok) {
      onToast('Plan dado de baja (el historial se conserva)', 'success');
      if (editingPlan && editingPlan.idPlan === plan.idPlan) handleNewClick();
    }
  };

  return (
    <div>
      {/* Title */}
      <div className="page-title-section">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="reco-tag recomendado">
                <i className="fa-solid fa-shield-check"></i> Administración
              </span>
            </div>
            <h1 className="page-title">
              Catálogo de <span className="highlight">planes</span>
            </h1>
            <p className="page-subtitle">
              Agrega, edita y da de baja los planes que se usan para calcular las recomendaciones.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {onImportPlans && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".csv,.json"
                  onChange={handleFileSelect}
                />
                <button
                  className="btn btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  title="Columnas del CSV: proveedor, nombre del plan, precio, velocidad, estabilidad, tecnología"
                >
                  <i className="fa-solid fa-file-import"></i> Importar planes
                </button>
              </>
            )}
            <button className="btn btn-primary" onClick={handleNewClick}>
              <i className="fa-solid fa-plus"></i> Nuevo plan
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="metrics-strip">
        <div className="metric-card accent">
          <div className="metric-label">Total de planes</div>
          <div className="metric-value">{planes.length} <span className="unit">Disponibles</span></div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Precio promedio</div>
          <div className="metric-value">Bs {precioPromedio} <span className="unit">/mes</span></div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Velocidad promedio</div>
          <div className="metric-value">{velocidadPromedio} <span className="unit">Mbps</span></div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Cobertura</div>
          <div className="metric-value">{coberturaAlta === null ? '—' : `${coberturaAlta}%`} <span className="unit">Alta cobertura</span></div>
        </div>
      </div>

      {/* Content: Table + Edit Panel */}
      <div className="two-col-wide-left">
        {/* Table Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <i className="fa-solid fa-table-list" style={{ color: 'var(--primary-500)', marginRight: '8px' }}></i>
              Planes configurados
            </h3>
            <input
              type="text"
              placeholder="Buscar plan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '6px 12px', border: '1px solid var(--neutral-300)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem' }}
            />
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {/* Tab Filters */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--neutral-150)' }}>
              <div className="tab-filters">
                <button
                  className={`tab-filter ${providerFilter === 'todos' ? 'active' : ''}`}
                  onClick={() => setProviderFilter('todos')}
                >
                  Todos <span className="count">{planes.length}</span>
                </button>
                <button
                  className={`tab-filter ${providerFilter === 'entel' ? 'active' : ''}`}
                  onClick={() => setProviderFilter('entel')}
                >
                  Entel <span className="count">{countEntel}</span>
                </button>
                <button
                  className={`tab-filter ${providerFilter === 'tigo' ? 'active' : ''}`}
                  onClick={() => setProviderFilter('tigo')}
                >
                  Tigo <span className="count">{countTigo}</span>
                </button>
                <button
                  className={`tab-filter ${providerFilter === 'viva' ? 'active' : ''}`}
                  onClick={() => setProviderFilter('viva')}
                >
                  Viva <span className="count">{countViva}</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <table className="data-table">
              <thead>
                <tr>
                  <th>Proveedor</th>
                  <th>Plan & Tecnología</th>
                  <th>Precio</th>
                  <th>Velocidad</th>
                  <th>Estabilidad</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {planesFiltrados.map((plan) => {
                  const provClass = plan.proveedor.toLowerCase();

                  return (
                    <tr key={plan.idPlan} onClick={() => handleEditClick(plan)}>
                      <td>
                        <div className="provider-cell">
                          <div className={`provider-logo ${provClass}`}>
                            {plan.proveedor.substring(0, 1)}
                          </div>
                          <span>{plan.proveedor}</span>
                        </div>
                      </td>
                      <td>
                        <div>
                          <strong>{plan.nombrePlan}</strong>
                          <br />
                          <span style={{ fontSize: '0.7rem', color: 'var(--neutral-500)' }}>{plan.tecnologia || 'FTTH'}</span>
                        </div>
                      </td>
                      <td><strong>Bs {plan.precioMensual}</strong></td>
                      <td>{plan.velocidadMbps} Mbps</td>
                      <td>
                        <span style={{ color: 'var(--primary-500)', fontWeight: '700' }}>
                          {plan.indiceEstabilidad ?? 90}/100
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(plan); }}
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                          title="Dar de baja plan"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Panel */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              {editingPlan ? 'Editar Plan' : 'Nuevo Plan'}
            </h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px' }}>Proveedor *</label>
                <select
                  value={formData.proveedor}
                  onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-300)' }}
                >
                  <option value="Entel">Entel</option>
                  <option value="Tigo">Tigo</option>
                  <option value="Viva">Viva</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px' }}>Nombre del Plan *</label>
                <input
                  type="text"
                  maxLength={80}
                  value={formData.nombrePlan}
                  onChange={(e) => setFormData({ ...formData, nombrePlan: e.target.value })}
                  placeholder="Ej: Fibra Hogar 100"
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-300)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px' }}>Precio Mensual (Bs) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.precioMensual}
                    onChange={(e) => setFormData({ ...formData, precioMensual: e.target.value === '' ? '' : Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-300)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px' }}>Velocidad (Mbps) *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={formData.velocidadMbps}
                    onChange={(e) => setFormData({ ...formData, velocidadMbps: e.target.value === '' ? '' : Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-300)' }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8rem' }}>
                  <label style={{ fontWeight: '600' }}>Índice de Estabilidad (0-100):</label>
                  <strong style={{ color: 'var(--primary-500)' }}>{formData.indiceEstabilidad}</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.indiceEstabilidad}
                  onChange={(e) => setFormData({ ...formData, indiceEstabilidad: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--primary-500)' }}
                />
              </div>

              {isSupabaseConfigured ? (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px' }}>Nivel de Cobertura</label>
                  <div style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-200)', background: 'var(--neutral-50)', color: 'var(--neutral-700)', fontSize: '0.85rem', boxSizing: 'border-box' }}>
                    {getNivelCobertura(formData.idZona, formData.proveedor) ?? 'Sin dato'}
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--neutral-500)', margin: '4px 0 0' }}>
                    Se toma de la cobertura registrada para esta zona y proveedor.
                  </p>
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px' }}>Nivel de Cobertura</label>
                  <select
                    value={formData.nivelCobertura}
                    onChange={(e) => setFormData({ ...formData, nivelCobertura: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-300)' }}
                  >
                    <option value="Alta">Alta Cobertura</option>
                    <option value="Media">Media Cobertura</option>
                    <option value="Baja">Baja Cobertura</option>
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px' }}>Zona *</label>
                <select
                  value={formData.idZona}
                  onChange={(e) => setFormData({ ...formData, idZona: Number(e.target.value) })}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-300)' }}
                >
                  {zonas.map(z => (
                    <option key={z.idZona} value={z.idZona}>{z.nombreSector}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px' }}>Tecnología</label>
                <input
                  type="text"
                  value={formData.tecnologia}
                  onChange={(e) => setFormData({ ...formData, tecnologia: e.target.value })}
                  placeholder="Ej: Fibra Óptica FTTH"
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-300)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={handleNewClick} style={{ flex: 1 }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  <i className="fa-solid fa-check"></i> {editingPlan ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
