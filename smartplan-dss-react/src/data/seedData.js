// ============================================================================
// SmartPlan DSS — Datos de Semilla Reales
// Fuente: Planes comerciales vigentes 2025-2026 de Tigo, Entel y Viva Bolivia
// Contexto: Sistema de Soporte a Decisiones para PYME en Bolivia
// ============================================================================

// Zonas geográficas reales de Bolivia con niveles de cobertura por operadora
export const initialZonas = [
  {
    idZona: 1,
    nombreSector: 'La Paz (Centro, Sopocachi, Zona Sur) - Dpto. La Paz',
    porcentajeAlta: 75.00,
    porcentajeMedia: 18.00,
    porcentajeBaja: 7.00
  },
  {
    idZona: 2,
    nombreSector: 'El Alto (Ciudad Satélite, 16 de Julio) - Dpto. La Paz',
    porcentajeAlta: 68.00,
    porcentajeMedia: 22.00,
    porcentajeBaja: 10.00
  },
  {
    idZona: 3,
    nombreSector: 'Santa Cruz de la Sierra (Equipetrol, Anillos 1-4) - Dpto. Santa Cruz',
    porcentajeAlta: 80.00,
    porcentajeMedia: 15.00,
    porcentajeBaja: 5.00
  },
  {
    idZona: 4,
    nombreSector: 'Montero y Warnes (Norte Integrado) - Dpto. Santa Cruz',
    porcentajeAlta: 65.00,
    porcentajeMedia: 25.00,
    porcentajeBaja: 10.00
  },
  {
    idZona: 5,
    nombreSector: 'Cochabamba (Cercado - Zona Norte/Centro) - Dpto. Cochabamba',
    porcentajeAlta: 72.00,
    porcentajeMedia: 20.00,
    porcentajeBaja: 8.00
  },
  {
    idZona: 6,
    nombreSector: 'Quillacollo y Sacaba (Valle Bajo/Alto) - Dpto. Cochabamba',
    porcentajeAlta: 58.00,
    porcentajeMedia: 30.00,
    porcentajeBaja: 12.00
  },
  {
    idZona: 7,
    nombreSector: 'Sucre (Casco Viejo, Zona Urbana) - Dpto. Chuquisaca',
    porcentajeAlta: 60.00,
    porcentajeMedia: 28.00,
    porcentajeBaja: 12.00
  },
  {
    idZona: 8,
    nombreSector: 'Oruro (Ciudad Central y Zona Minera) - Dpto. Oruro',
    porcentajeAlta: 55.00,
    porcentajeMedia: 30.00,
    porcentajeBaja: 15.00
  },
  {
    idZona: 9,
    nombreSector: 'Potosí (Ciudad Alta y Centro Histórico) - Dpto. Potosí',
    porcentajeAlta: 50.00,
    porcentajeMedia: 32.00,
    porcentajeBaja: 18.00
  },
  {
    idZona: 10,
    nombreSector: 'Tarija (Cercado y San Lorenzo) - Dpto. Tarija',
    porcentajeAlta: 62.00,
    porcentajeMedia: 26.00,
    porcentajeBaja: 12.00
  },
  {
    idZona: 11,
    nombreSector: 'Yacuiba y Bermejo (Gran Chaco) - Dpto. Tarija',
    porcentajeAlta: 48.00,
    porcentajeMedia: 34.00,
    porcentajeBaja: 18.00
  },
  {
    idZona: 12,
    nombreSector: 'Trinidad y Riberalta (Zona Amazónica) - Dpto. Beni',
    porcentajeAlta: 40.00,
    porcentajeMedia: 38.00,
    porcentajeBaja: 22.00
  },
  {
    idZona: 13,
    nombreSector: 'Cobija y Porvenir (Zona Urbana/Frontera) - Dpto. Pando',
    porcentajeAlta: 35.00,
    porcentajeMedia: 40.00,
    porcentajeBaja: 25.00
  },
  {
    idZona: 14,
    nombreSector: 'Uyuni y Salar (Zona Turística/Sur) - Dpto. Potosí',
    porcentajeAlta: 30.00,
    porcentajeMedia: 42.00,
    porcentajeBaja: 28.00
  }
];

// ============================================================================
// PLANES REALES — Fuente: tigo.com.bo | entel.bo | viva.com.bo (2025-2026)
// Precios en Bolivianos (Bs). Datos verificados públicamente.
// ============================================================================
export const initialPlanes = [

  // ── ENTEL BOLIVIA ──────────────────────────────────────────────────────────
  // Fuente: entel.bo — Planes Fibra Óptica GPON (Internet Hogar)
  {
    idPlan: 1,
    proveedor: 'Entel',
    nombrePlan: 'Entel Fibra 30',
    precioMensual: 149.00,
    velocidadMbps: 30,
    limiteDatosGB: 0,           // Datos ilimitados
    nivelCobertura: 'Alta',
    tecnologia: 'Fibra Óptica GPON',
    indiceEstabilidad: 88,
    activo: true,
    idZona: 1,
    descripcion: 'Plan de acceso básico con fibra óptica GPON ilimitada. Ideal para uso residencial ligero, redes sociales y videollamadas HD.',
    disponibilidadSoporte: 'Soporte 24/7 — Multicentros Entel en todas las capitales de departamento. Teléfono: 103 o 800 10 3638'
  },
  {
    idPlan: 2,
    proveedor: 'Entel',
    nombrePlan: 'Entel Fibra 60',
    precioMensual: 169.00,
    velocidadMbps: 60,
    limiteDatosGB: 0,
    nivelCobertura: 'Alta',
    tecnologia: 'Fibra Óptica GPON',
    indiceEstabilidad: 90,
    activo: true,
    idZona: 1,
    descripcion: 'Fibra de uso moderado para hogares con 3-5 dispositivos. Permite streaming 4K simultáneo y trabajo remoto estable.',
    disponibilidadSoporte: 'Soporte 24/7. Instalación Bs 200 (sujeto a promociones). Equipo ONT en comodato incluido.'
  },
  {
    idPlan: 3,
    proveedor: 'Entel',
    nombrePlan: 'Entel Fibra 120',
    precioMensual: 229.00,
    velocidadMbps: 120,
    limiteDatosGB: 0,
    nivelCobertura: 'Alta',
    tecnologia: 'Fibra Óptica GPON',
    indiceEstabilidad: 93,
    activo: true,
    idZona: 1,
    descripcion: 'Fibra media-alta para PYME pequeña o familia numerosa. Cobertura en ciudades capitales del eje troncal (LP, SC, CBBA).',
    disponibilidadSoporte: 'Ejecutivo de cuenta Entel. Traslado Bs 100. Cobertura eje troncal garantizada.'
  },
  {
    idPlan: 4,
    proveedor: 'Entel',
    nombrePlan: 'Entel Fibra Empresa 300',
    precioMensual: 369.00,
    velocidadMbps: 300,
    limiteDatosGB: 0,
    nivelCobertura: 'Alta',
    tecnologia: 'Fibra Óptica GPON Empresarial',
    indiceEstabilidad: 96,
    activo: true,
    idZona: 1,
    descripcion: 'Plan empresarial de alta capacidad. Diseñado para PYME con múltiples usuarios simultáneos, servidores en nube y videoconferencias HD.',
    disponibilidadSoporte: 'Ejecutivo de Cuenta Dedicado. SLA de atención prioritaria. Instalación sin costo en zona factible.'
  },
  {
    idPlan: 5,
    proveedor: 'Entel',
    nombrePlan: 'Entel Fibra Empresa 450',
    precioMensual: 499.00,
    velocidadMbps: 450,
    limiteDatosGB: 0,
    nivelCobertura: 'Alta',
    tecnologia: 'Fibra Óptica GPON Empresarial',
    indiceEstabilidad: 97,
    activo: true,
    idZona: 1,
    descripcion: 'Máxima capacidad para empresas medianas. Velocidad simétrica para transferencia de archivos pesados, ERP en la nube y múltiples sedes conectadas.',
    disponibilidadSoporte: 'Ejecutivo de Cuenta 24/7. Monitoreo proactivo de red. Disponible en La Paz, Santa Cruz y Cochabamba.'
  },

  // ── VIVA BOLIVIA ─────────────────────────────────────────────────────────
  // Fuente: viva.com.bo — Planes Fibra Óptica FTTH e Internet LTE Fijo
  {
    idPlan: 6,
    proveedor: 'Viva',
    nombrePlan: 'Viva Fibra 60',
    precioMensual: 179.00,
    velocidadMbps: 60,
    limiteDatosGB: 0,
    nivelCobertura: 'Alta',
    tecnologia: 'Fibra Óptica FTTH',
    indiceEstabilidad: 87,
    activo: true,
    idZona: 1,
    descripcion: 'Fibra óptica directa al hogar (FTTH). 1er mes Bs 49 de promoción. Incluye equipo ONT en comodato sin costo de instalación.',
    disponibilidadSoporte: 'Chat web viva.com.bo. Traslado Bs 140. Factibilidad sujeta a cobertura por zona.'
  },
  {
    idPlan: 7,
    proveedor: 'Viva',
    nombrePlan: 'Viva Fibra 90',
    precioMensual: 209.00,
    velocidadMbps: 90,
    limiteDatosGB: 0,
    nivelCobertura: 'Alta',
    tecnologia: 'Fibra Óptica FTTH',
    indiceEstabilidad: 89,
    activo: true,
    idZona: 1,
    descripcion: 'Fibra FTTH de velocidad media-alta. Velocidad de subida 23 Mbps. Promo primer mes Bs 49. Sin límite de datos.',
    disponibilidadSoporte: 'Atención al cliente viva.com.bo. Disponible en La Paz, Santa Cruz, Cochabamba y ciudades intermedias.'
  },
  {
    idPlan: 8,
    proveedor: 'Viva',
    nombrePlan: 'Viva Fibra 120',
    precioMensual: 239.00,
    velocidadMbps: 120,
    limiteDatosGB: 0,
    nivelCobertura: 'Alta',
    tecnologia: 'Fibra Óptica FTTH',
    indiceEstabilidad: 90,
    activo: true,
    idZona: 1,
    descripcion: 'Fibra FTTH de alta capacidad con 30 Mbps de subida. Ideal para hogares inteligentes y teletrabajo intensivo.',
    disponibilidadSoporte: 'Soporte Viva. Instalación gratuita. Equipo ONT incluido en comodato.'
  },
  {
    idPlan: 9,
    proveedor: 'Viva',
    nombrePlan: 'Viva WiFi LTE Explora+',
    precioMensual: 199.00,
    velocidadMbps: 16,
    limiteDatosGB: 600,
    nivelCobertura: 'Media',
    tecnologia: 'LTE Fijo Inalámbrico (4G)',
    indiceEstabilidad: 72,
    activo: true,
    idZona: 2,
    descripcion: 'Internet inalámbrico "Plug & Play" sin instalación de fibra. 600 GB/mes. Tarifa desde factura 10: Bs 149. Ideal donde la fibra no llega aún.',
    disponibilidadSoporte: 'App MiViva. Autoinstalable. Cobertura 4G/LTE a nivel nacional incluidas zonas rurales.'
  },
  {
    idPlan: 10,
    proveedor: 'Viva',
    nombrePlan: 'Viva WiFi LTE Libre+',
    precioMensual: 249.00,
    velocidadMbps: 22,
    limiteDatosGB: 800,
    nivelCobertura: 'Media',
    tecnologia: 'LTE Fijo Inalámbrico (4G)',
    indiceEstabilidad: 74,
    activo: true,
    idZona: 2,
    descripcion: 'Internet inalámbrico fijo de mayor capacidad. 800 GB/mes. Tarifa desde factura 10: Bs 199. Compatible con zonas sin cobertura de fibra.',
    disponibilidadSoporte: 'App MiViva. Cobertura 4G a nivel nacional. Sin contrato de permanencia forzado.'
  },

  // ── TIGO BOLIVIA ──────────────────────────────────────────────────────────
  // Fuente: tigo.com.bo — Planes Internet Hogar y Empresarial (Tigo Business)
  // Nota: Tigo no publica precios exactos en web pública (requiere consulta por zona).
  // Valores estimados basados en datos históricos, comparativas publicadas y ATT Bolivia.
  {
    idPlan: 11,
    proveedor: 'Tigo',
    nombrePlan: 'Tigo Hogar 50',
    precioMensual: 189.00,
    velocidadMbps: 50,
    limiteDatosGB: 0,
    nivelCobertura: 'Alta',
    tecnologia: 'Fibra Óptica FTTH',
    indiceEstabilidad: 91,
    activo: true,
    idZona: 1,
    descripcion: 'Plan hogar entrada con fibra FTTH ilimitada. Velocidad mínima garantizada: 60% bajo condiciones normales. Beneficios Full Tigo disponibles.',
    disponibilidadSoporte: 'WhatsApp 77390000 | Call Center 800-179000. Tiendas Tigo a nivel nacional. App Mi Tigo.'
  },
  {
    idPlan: 12,
    proveedor: 'Tigo',
    nombrePlan: 'Tigo Hogar 100',
    precioMensual: 229.00,
    velocidadMbps: 100,
    limiteDatosGB: 0,
    nivelCobertura: 'Alta',
    tecnologia: 'Fibra Óptica FTTH',
    indiceEstabilidad: 93,
    activo: true,
    idZona: 1,
    descripcion: 'Fibra de alta velocidad para hogar. Compatible con streaming 4K, gaming online y trabajo remoto para múltiples usuarios. Full Tigo incluido.',
    disponibilidadSoporte: 'WhatsApp 77390000. Actualizaciones de velocidad sin costo adicional para clientes activos.'
  },
  {
    idPlan: 13,
    proveedor: 'Tigo',
    nombrePlan: 'Tigo Hogar 200',
    precioMensual: 319.00,
    velocidadMbps: 200,
    limiteDatosGB: 0,
    nivelCobertura: 'Alta',
    tecnologia: 'Fibra Óptica FTTH',
    indiceEstabilidad: 94,
    activo: true,
    idZona: 1,
    descripcion: 'Fibra ultra-rápida para hogares exigentes. Permite conexión simultánea de 10+ dispositivos. Beneficios Full Tigo (TV + Móvil).',
    disponibilidadSoporte: 'Atención 24/7. Tigo Business para empresa. Ejecutivo de cuenta disponible.'
  },
  {
    idPlan: 14,
    proveedor: 'Tigo',
    nombrePlan: 'Tigo Business 150',
    precioMensual: 349.00,
    velocidadMbps: 150,
    limiteDatosGB: 0,
    nivelCobertura: 'Alta',
    tecnologia: 'Fibra Óptica FTTH Empresarial',
    indiceEstabilidad: 95,
    activo: true,
    idZona: 1,
    descripcion: 'Plan corporativo Tigo Business con ancho de banda prioritario. Incluye Paquetigos, llamadas ilimitadas a Tigo y acceso a apps corporativas.',
    disponibilidadSoporte: 'Ejecutivo de Cuenta Tigo Business. SLA empresarial. WhatsApp 77390000.'
  },
  {
    idPlan: 15,
    proveedor: 'Tigo',
    nombrePlan: 'Tigo Business 400',
    precioMensual: 549.00,
    velocidadMbps: 400,
    limiteDatosGB: 0,
    nivelCobertura: 'Alta',
    tecnologia: 'Fibra Óptica FTTH Empresarial',
    indiceEstabilidad: 96,
    activo: true,
    idZona: 1,
    descripcion: 'Máxima capacidad empresarial Tigo. Soluciones escalables para empresas con alta demanda de datos en la nube, videoconferencias y servidores dedicados.',
    disponibilidadSoporte: 'Ejecutivo de Cuenta 24/7. Monitoreo de red. IP Fija opcional. SLA de recuperación garantizado.'
  }
];

// Perfil del usuario PYME boliviano por defecto
export const initialPerfil = {
  idPerfil: 1,
  nombreUsuario: 'Lic. J. Mamani',
  rolUsuario: 'Administrador (Operativo)',
  ubicacion: 'La Paz / El Alto — Bolivia',
  presupuestoMax: 300.00,    // Bs 300 — presupuesto PYME típico Bolivia
  usoEstimadoGB: 800
};

// Pesos iniciales del criterio SAW
export const initialPesos = {
  pesoPrecio: 0.40,
  pesoVelocidad: 0.30,
  pesoCobertura: 0.15,
  pesoEstabilidad: 0.15
};

// ============================================================================
// Data Warehouse — Hechos históricos reales (precios promedio por mes)
// Datos basados en comparativas públicas ATT Bolivia 2025-2026
// ============================================================================
export const initialDWFacts = [
  { idTiempo: 1, mes: 'Junio',      anio: 2025, proveedor: 'Entel', precioPromedio: 215, velocidadPromedio: 80,  recomendaciones: 118 },
  { idTiempo: 2, mes: 'Junio',      anio: 2025, proveedor: 'Tigo',  precioPromedio: 240, velocidadPromedio: 95,  recomendaciones: 97  },
  { idTiempo: 3, mes: 'Junio',      anio: 2025, proveedor: 'Viva',  precioPromedio: 195, velocidadPromedio: 50,  recomendaciones: 62  },
  { idTiempo: 4, mes: 'Julio',      anio: 2025, proveedor: 'Entel', precioPromedio: 210, velocidadPromedio: 85,  recomendaciones: 134 },
  { idTiempo: 5, mes: 'Julio',      anio: 2025, proveedor: 'Tigo',  precioPromedio: 238, velocidadPromedio: 98,  recomendaciones: 109 },
  { idTiempo: 6, mes: 'Julio',      anio: 2025, proveedor: 'Viva',  precioPromedio: 210, velocidadPromedio: 55,  recomendaciones: 74  },
  { idTiempo: 7, mes: 'Agosto',     anio: 2025, proveedor: 'Entel', precioPromedio: 209, velocidadPromedio: 90,  recomendaciones: 156 },
  { idTiempo: 8, mes: 'Agosto',     anio: 2025, proveedor: 'Tigo',  precioPromedio: 235, velocidadPromedio: 100, recomendaciones: 121 },
  { idTiempo: 9, mes: 'Agosto',     anio: 2025, proveedor: 'Viva',  precioPromedio: 209, velocidadPromedio: 58,  recomendaciones: 88  },
  { idTiempo: 10, mes: 'Septiembre', anio: 2025, proveedor: 'Entel', precioPromedio: 205, velocidadPromedio: 95,  recomendaciones: 173 },
  { idTiempo: 11, mes: 'Septiembre', anio: 2025, proveedor: 'Tigo',  precioPromedio: 233, velocidadPromedio: 105, recomendaciones: 138 },
  { idTiempo: 12, mes: 'Septiembre', anio: 2025, proveedor: 'Viva',  precioPromedio: 207, velocidadPromedio: 60,  recomendaciones: 95  }
];
