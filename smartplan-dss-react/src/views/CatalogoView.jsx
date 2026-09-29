import React, { useState } from 'react'

export default function CatalogoView({ planes, onAddPlan, onUpdatePlan, onDeletePlan, onToast }) {
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
    tecnologia: 'Fibra Óptica FTTH',
    descripcion: ''
  });

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
      nivelCobertura: plan.nivelCobertura,
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
      tecnologia: 'Fibra Óptica FTTH',
      descripcion: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nombrePlan) {
      onToast('Ingrese el nombre del plan');
      return;
    }
    if (formData.indiceEstabilidad === '' || formData.indiceEstabilidad === null || formData.indiceEstabilidad === undefined
      || Number.isNaN(Number(formData.indiceEstabilidad)) || formData.indiceEstabilidad < 0 || formData.indiceEstabilidad > 100) {
      onToast('El Índice de Estabilidad es obligatorio y debe estar entre 0 y 100');
      return;
    }
    // HU-C01.3: mismo proveedor + nombrePlan (sin distinguir mayúsculas) ya existente.
    const duplicado = planes.some((p) =>
      p.idPlan !== formData.idPlan &&
      p.proveedor.toLowerCase() === formData.proveedor.toLowerCase() &&
      p.nombrePlan.toLowerCase() === formData.nombrePlan.toLowerCase()
    );
    if (duplicado) {
      onToast('Ya existe un plan con ese nombre para este proveedor.');
      return;
    }

    if (editingPlan) {
      onUpdatePlan(formData);
      onToast(`Plan "${formData.nombrePlan}" actualizado con éxito`, 'success');
    } else {
      const newPlan = {
        ...formData,
        idPlan: Date.now(),
        activo: true,
        idZona: 1
      };
      onAddPlan(newPlan);
      onToast(`Plan "${formData.nombrePlan}" creado exitosamente`, 'success');
    }
    handleNewClick();
  };

  return (
    <div>
      {/* Title */}
      <div className="page-title-section">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="reco-tag recomendado">
                <i className="fa-solid fa-shield-check"></i> Módulo Operativo (CRUD OLTP)
              </span>
            </div>
            <h1 className="page-title">
              Gestión de Catálogo de <span className="highlight">Planes</span>
            </h1>
            <p className="page-subtitle">
              Administrador (Perfil Operativo) — Carga, audita y mantiene la oferta activa en la tabla <code>PlanTelecomunicacion</code>.
            </p>
          </div>
          <button className="btn btn-primary" onClick={handleNewClick}>
            <i className="fa-solid fa-plus"></i> Nuevo Plan
          </button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="metrics-strip">
        <div className="metric-card accent">
          <div className="metric-label">Total Planes</div>
          <div className="metric-value">{planes.length} <span className="unit">Disponibles</span></div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Precio Promedio</div>
          <div className="metric-value">Bs {precioPromedio} <span className="unit">/mes</span></div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Velocidad Promedio</div>
          <div className="metric-value">{velocidadPromedio} <span className="unit">Mbps</span></div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Cobertura</div>
          <div className="metric-value">78% <span className="unit">Catálogo</span></div>
        </div>
      </div>

      {/* Content: Table + Edit Panel */}
      <div className="two-col-wide-left">
        {/* Table Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <i className="fa-solid fa-table-list" style={{ color: 'var(--primary-500)', marginRight: '8px' }}></i>
              Planes Configurados
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
                          onClick={(e) => { e.stopPropagation(); onDeletePlan(plan.idPlan); onToast('Plan eliminado'); }}
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                          title="Eliminar Plan"
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
                    value={formData.precioMensual}
                    onChange={(e) => setFormData({ ...formData, precioMensual: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-300)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px' }}>Velocidad (Mbps) *</label>
                  <input
                    type="number"
                    value={formData.velocidadMbps}
                    onChange={(e) => setFormData({ ...formData, velocidadMbps: Number(e.target.value) })}
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
