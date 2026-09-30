import React, { useState } from 'react';
import { calculateSAW, pesosDesdeCriteriosROC } from '../engine/sawEngine';

const CRITERIOS_DISPONIBLES = [
  { id: 'precio', nombre: 'Precio' },
  { id: 'velocidad', nombre: 'Velocidad' },
  { id: 'cobertura', nombre: 'Cobertura' },
  { id: 'estabilidad', nombre: 'Estabilidad' }
];

const TIPOS_USO_OPTIONS = ['streaming', 'gaming', 'teletrabajo', 'oficina', 'otro'];

export default function RecomendacionWizard({ zonas = [], planes = [], onSaveRecomendacion, onToast }) {
  const [paso, setPaso] = useState(1);
  
  // Paso 1
  const [zonaId, setZonaId] = useState(zonas[0]?.id || 1);
  const [presupuesto, setPresupuesto] = useState(250);
  const [tiposUso, setTiposUso] = useState([]);
  
  // Paso 2
  const [criteriosSeleccionados, setCriteriosSeleccionados] = useState([]);
  
  // Paso 3
  const [resultadosSAW, setResultadosSAW] = useState([]);
  const [pesosCalculados, setPesosCalculados] = useState({});

  const handleSiguiente = () => {
    if (paso === 1) {
      if (presupuesto < 1 || presupuesto > 10000) {
        if(onToast) onToast('El presupuesto debe estar entre 1 y 10,000 Bs', 'error');
        return;
      }
      setPaso(2);
    } else if (paso === 2) {
      if (criteriosSeleccionados.length < 2 || criteriosSeleccionados.length > 3) {
        if(onToast) onToast('Debe seleccionar 2 o 3 criterios', 'error');
        return;
      }
      
      const pesos = pesosDesdeCriteriosROC(criteriosSeleccionados);
      setPesosCalculados(pesos);
      
      const resultado = calculateSAW(planes, { presupuesto, zonaId }, pesos, criteriosSeleccionados);
      setResultadosSAW(resultado.slice(0, 3));
      
      setPaso(3);
    }
  };

  const handleAnterior = () => {
    setPaso(paso - 1);
  };

  const handleCriterioToggle = (id) => {
    if (criteriosSeleccionados.includes(id)) {
      setCriteriosSeleccionados(criteriosSeleccionados.filter(c => c !== id));
    } else {
      if (criteriosSeleccionados.length < 3) {
        setCriteriosSeleccionados([...criteriosSeleccionados, id]);
      } else {
        if(onToast) onToast('Máximo 3 criterios permitidos', 'warning');
      }
    }
  };

  const moverCriterio = (index, direccion) => {
    const nuevos = [...criteriosSeleccionados];
    if (direccion === 'up' && index > 0) {
      [nuevos[index - 1], nuevos[index]] = [nuevos[index], nuevos[index - 1]];
    } else if (direccion === 'down' && index < nuevos.length - 1) {
      [nuevos[index + 1], nuevos[index]] = [nuevos[index], nuevos[index + 1]];
    }
    setCriteriosSeleccionados(nuevos);
  };

  const handleGuardar = () => {
    if (onSaveRecomendacion) {
      onSaveRecomendacion(zonaId, pesosCalculados, presupuesto, resultadosSAW);
    }
  };

  const handleNuevaConsulta = () => {
    setPaso(1);
    setCriteriosSeleccionados([]);
    setResultadosSAW([]);
  };

  const getPesosRocDisplay = () => {
    if (criteriosSeleccionados.length === 2) return [0.75, 0.25];
    if (criteriosSeleccionados.length === 3) return [0.61, 0.28, 0.11];
    return [];
  };

  const rocPesos = getPesosRocDisplay();

  return (
    <div className="card bg-white shadow-lg rounded-lg max-w-4xl mx-auto overflow-hidden">
      <div className="bg-gray-50 border-b p-4">
        <h2 className="text-xl font-bold text-center" style={{ color: 'var(--primary-500)' }}>Asistente de recomendación</h2>
        <div className="flex justify-center mt-4">
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${paso >= 1 ? 'text-white' : 'bg-gray-200 text-gray-500'}`} style={paso >= 1 ? {backgroundColor: 'var(--primary-500)'} : {}}>1</span>
            <div className={`h-1 w-12 ${paso >= 2 ? '' : 'bg-gray-200'}`} style={paso >= 2 ? {backgroundColor: 'var(--primary-500)'} : {}}></div>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${paso >= 2 ? 'text-white' : 'bg-gray-200 text-gray-500'}`} style={paso >= 2 ? {backgroundColor: 'var(--primary-500)'} : {}}>2</span>
            <div className={`h-1 w-12 ${paso >= 3 ? '' : 'bg-gray-200'}`} style={paso >= 3 ? {backgroundColor: 'var(--primary-500)'} : {}}></div>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${paso >= 3 ? 'text-white' : 'bg-gray-200 text-gray-500'}`} style={paso >= 3 ? {backgroundColor: 'var(--primary-500)'} : {}}>3</span>
          </div>
        </div>
      </div>

      <div className="p-6 min-h-[400px]">
        {paso === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Paso 1: Parámetros básicos</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Zona</label>
                <select 
                  className="w-full p-3 border rounded-md"
                  value={zonaId}
                  onChange={(e) => setZonaId(Number(e.target.value))}
                >
                  {zonas.map(z => (
                    <option key={z.id || z.idzona} value={z.id || z.idzona}>{z.nombre || z.nombrezona}</option>
                  ))}
                  {zonas.length === 0 && <option value={1}>Zona Demo</option>}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Presupuesto (Bs)</label>
                <input 
                  type="number" 
                  className="w-full p-3 border rounded-md"
                  value={presupuesto}
                  onChange={(e) => setPresupuesto(Number(e.target.value))}
                  min="1" max="10000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Tipos de uso</label>
              <div className="flex flex-wrap gap-4">
                {TIPOS_USO_OPTIONS.map(tipo => (
                  <label key={tipo} className="flex items-center gap-2 bg-gray-50 p-2 rounded border cursor-pointer hover:bg-gray-100">
                    <input 
                      type="checkbox" 
                      checked={tiposUso.includes(tipo)}
                      onChange={() => {
                        if (tiposUso.includes(tipo)) setTiposUso(tiposUso.filter(t => t !== tipo));
                        else setTiposUso([...tiposUso, tipo]);
                      }}
                    />
                    <span className="capitalize">{tipo}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {paso === 2 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Paso 2: Selección y orden de criterios</h3>
            <p className="text-gray-600 text-sm">Seleccione 2 o 3 criterios y ordénelos por importancia (el primero es el más importante).</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold mb-3">Criterios disponibles</h4>
                <div className="space-y-2">
                  {CRITERIOS_DISPONIBLES.map(c => (
                    <label key={c.id} className="flex items-center gap-3 p-3 border rounded-md cursor-pointer hover:bg-gray-50">
                      <input 
                        type="checkbox" 
                        checked={criteriosSeleccionados.includes(c.id)}
                        onChange={() => handleCriterioToggle(c.id)}
                        disabled={!criteriosSeleccionados.includes(c.id) && criteriosSeleccionados.length >= 3}
                      />
                      <span>{c.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold mb-3">Orden de importancia</h4>
                {criteriosSeleccionados.length === 0 ? (
                  <div className="p-4 bg-gray-100 text-gray-500 rounded text-center italic">Seleccione criterios para ordenarlos</div>
                ) : (
                  <div className="space-y-2">
                    {criteriosSeleccionados.map((id, index) => {
                      const crit = CRITERIOS_DISPONIBLES.find(c => c.id === id);
                      return (
                        <div key={id} className="flex items-center justify-between p-3 border border-l-4 rounded-md bg-white shadow-sm" style={{borderLeftColor: 'var(--primary-500)'}}>
                          <div className="flex items-center gap-3">
                            <span className="font-bold w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">{index + 1}</span>
                            <span>{crit?.nombre}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-gray-600">{(rocPesos[index] * 100).toFixed(0)}%</span>
                            <div className="flex flex-col gap-1">
                              <button onClick={() => moverCriterio(index, 'up')} disabled={index === 0} className="px-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50">↑</button>
                              <button onClick={() => moverCriterio(index, 'down')} disabled={index === criteriosSeleccionados.length - 1} className="px-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50">↓</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {criteriosSeleccionados.length > 0 && criteriosSeleccionados.length < 2 && (
                  <p className="text-sm mt-3 font-semibold" style={{ color: 'var(--danger)' }}>⚠️ Debe seleccionar al menos 2 criterios.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {paso === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-center mb-6">Top 3 recomendaciones</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {resultadosSAW.map((plan, index) => (
                <div key={plan.idplan} className={`card border-t-4 shadow-md bg-white rounded-lg overflow-hidden relative ${index === 0 ? 'transform scale-105 border-yellow-400' : 'border-gray-300'}`}>
                  {index === 0 && <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-bl-lg">MEJOR OPCIÓN</div>}
                  <div className="p-4 text-center border-b bg-gray-50">
                    <div className="text-3xl font-black text-gray-300 mb-1">#{index + 1}</div>
                    <h4 className="text-xl font-bold">{plan.nombre}</h4>
                    <span className="badge bg-gray-200 text-gray-800 px-2 py-1 rounded text-xs font-semibold">{plan.proveedor}</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-gray-500">Precio</span>
                      <span className="font-bold">{plan.precio} Bs</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-gray-500">Velocidad</span>
                      <span className="font-bold">{plan.velocidad} Mbps</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-gray-500">Puntaje SAW</span>
                      <span className="font-bold" style={{ color: 'var(--success)' }}>{(plan.score * 100).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {resultadosSAW.length === 0 && (
                <div className="col-span-3 text-center py-8 text-gray-500">
                  No se encontraron planes que cumplan con los criterios.
                </div>
              )}
            </div>
            
            <div className="flex justify-center gap-4 mt-8">
              <button className="btn btn-secondary px-6 py-2 border rounded hover:bg-gray-100 font-semibold" onClick={handleNuevaConsulta}>
                Nueva Consulta
              </button>
              {resultadosSAW.length > 0 && (
                <button className="btn btn-primary px-6 py-2 rounded text-white font-semibold" style={{ backgroundColor: 'var(--primary-500)' }} onClick={handleGuardar}>
                  Guardar Recomendación
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-50 border-t p-4 flex justify-between items-center">
        {paso > 1 && paso < 3 ? (
          <button className="btn btn-secondary px-4 py-2 border rounded hover:bg-gray-100" onClick={handleAnterior}>Anterior</button>
        ) : <div></div>}
        
        {paso < 3 && (
          <button className="btn btn-primary px-6 py-2 rounded text-white font-semibold" style={{ backgroundColor: 'var(--primary-500)' }} onClick={handleSiguiente}>
            {paso === 2 ? 'Generar Recomendación' : 'Siguiente'}
          </button>
        )}
      </div>
    </div>
  );
}
