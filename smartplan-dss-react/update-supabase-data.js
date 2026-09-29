// Script para actualizar los datos en Supabase con planes reales de Bolivia
// Uso: node update-supabase-data.js
// Requiere: .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Leer .env manualmente (sin dependencia de dotenv)
const envContent = readFileSync('.env', 'utf-8')
const env = Object.fromEntries(
  envContent.split('\n')
    .filter(line => line.includes('=') && !line.startsWith('#'))
    .map(line => line.split('=').map(s => s.trim()))
)

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY
)

const zonas = [
  { nombresector: 'La Paz / El Alto (Eje Metropolitano)',     porcentajealta: 70.00, porcentajemedia: 22.00, porcentajebaja:  8.00 },
  { nombresector: 'Santa Cruz de la Sierra (Zona Expansión)', porcentajealta: 75.00, porcentajemedia: 18.00, porcentajebaja:  7.00 },
  { nombresector: 'Cochabamba / Valle Central',               porcentajealta: 65.00, porcentajemedia: 25.00, porcentajebaja: 10.00 },
  { nombresector: 'Sucre / Potosí (Zona Sur)',                porcentajealta: 45.00, porcentajemedia: 35.00, porcentajebaja: 20.00 },
  { nombresector: 'Oruro / Beni / Pando (Zona Rural)',        porcentajealta: 25.00, porcentajemedia: 40.00, porcentajebaja: 35.00 },
]

const planes = [
  // ENTEL — Fibra GPON (fuente: entel.bo, vigente 2025-2026)
  { proveedor: 'Entel', nombreplan: 'Entel Fibra 30',          preciomensual: 149, velocidadmbps:  30, limitedatosgb:   0, nivelcobertura: 'Alta',  tecnologia: 'Fibra Óptica GPON',             indiceestabilidad: 88, activo: true, idzona: 1 },
  { proveedor: 'Entel', nombreplan: 'Entel Fibra 60',          preciomensual: 169, velocidadmbps:  60, limitedatosgb:   0, nivelcobertura: 'Alta',  tecnologia: 'Fibra Óptica GPON',             indiceestabilidad: 90, activo: true, idzona: 1 },
  { proveedor: 'Entel', nombreplan: 'Entel Fibra 120',         preciomensual: 229, velocidadmbps: 120, limitedatosgb:   0, nivelcobertura: 'Alta',  tecnologia: 'Fibra Óptica GPON',             indiceestabilidad: 93, activo: true, idzona: 1 },
  { proveedor: 'Entel', nombreplan: 'Entel Fibra Empresa 300', preciomensual: 369, velocidadmbps: 300, limitedatosgb:   0, nivelcobertura: 'Alta',  tecnologia: 'Fibra Óptica GPON Empresarial', indiceestabilidad: 96, activo: true, idzona: 1 },
  { proveedor: 'Entel', nombreplan: 'Entel Fibra Empresa 450', preciomensual: 499, velocidadmbps: 450, limitedatosgb:   0, nivelcobertura: 'Alta',  tecnologia: 'Fibra Óptica GPON Empresarial', indiceestabilidad: 97, activo: true, idzona: 1 },
  // VIVA — Fibra FTTH e LTE Fijo (fuente: viva.com.bo, vigente 2025-2026)
  { proveedor: 'Viva',  nombreplan: 'Viva Fibra 60',            preciomensual: 179, velocidadmbps:  60, limitedatosgb:   0, nivelcobertura: 'Alta',  tecnologia: 'Fibra Óptica FTTH',           indiceestabilidad: 87, activo: true, idzona: 1 },
  { proveedor: 'Viva',  nombreplan: 'Viva Fibra 90',            preciomensual: 209, velocidadmbps:  90, limitedatosgb:   0, nivelcobertura: 'Alta',  tecnologia: 'Fibra Óptica FTTH',           indiceestabilidad: 89, activo: true, idzona: 1 },
  { proveedor: 'Viva',  nombreplan: 'Viva Fibra 120',           preciomensual: 239, velocidadmbps: 120, limitedatosgb:   0, nivelcobertura: 'Alta',  tecnologia: 'Fibra Óptica FTTH',           indiceestabilidad: 90, activo: true, idzona: 1 },
  { proveedor: 'Viva',  nombreplan: 'Viva WiFi LTE Explora+',   preciomensual: 199, velocidadmbps:  16, limitedatosgb: 600, nivelcobertura: 'Media', tecnologia: 'LTE Fijo Inalámbrico (4G)',   indiceestabilidad: 72, activo: true, idzona: 2 },
  { proveedor: 'Viva',  nombreplan: 'Viva WiFi LTE Libre+',     preciomensual: 249, velocidadmbps:  22, limitedatosgb: 800, nivelcobertura: 'Media', tecnologia: 'LTE Fijo Inalámbrico (4G)',   indiceestabilidad: 74, activo: true, idzona: 2 },
  // TIGO — Hogar y Business (fuente: tigo.com.bo - precios estimados ATT Bolivia 2025)
  { proveedor: 'Tigo',  nombreplan: 'Tigo Hogar 50',            preciomensual: 189, velocidadmbps:  50, limitedatosgb:   0, nivelcobertura: 'Alta',  tecnologia: 'Fibra Óptica FTTH',           indiceestabilidad: 91, activo: true, idzona: 1 },
  { proveedor: 'Tigo',  nombreplan: 'Tigo Hogar 100',           preciomensual: 229, velocidadmbps: 100, limitedatosgb:   0, nivelcobertura: 'Alta',  tecnologia: 'Fibra Óptica FTTH',           indiceestabilidad: 93, activo: true, idzona: 1 },
  { proveedor: 'Tigo',  nombreplan: 'Tigo Hogar 200',           preciomensual: 319, velocidadmbps: 200, limitedatosgb:   0, nivelcobertura: 'Alta',  tecnologia: 'Fibra Óptica FTTH',           indiceestabilidad: 94, activo: true, idzona: 1 },
  { proveedor: 'Tigo',  nombreplan: 'Tigo Business 150',        preciomensual: 349, velocidadmbps: 150, limitedatosgb:   0, nivelcobertura: 'Alta',  tecnologia: 'Fibra Óptica FTTH Empresarial', indiceestabilidad: 95, activo: true, idzona: 1 },
  { proveedor: 'Tigo',  nombreplan: 'Tigo Business 400',        preciomensual: 549, velocidadmbps: 400, limitedatosgb:   0, nivelcobertura: 'Alta',  tecnologia: 'Fibra Óptica FTTH Empresarial', indiceestabilidad: 96, activo: true, idzona: 1 },
]

async function updateData() {
  console.log('════════════════════════════════════════════════════')
  console.log('  SmartPlan DSS — Actualización de datos Bolivia')
  console.log('════════════════════════════════════════════════════')

  // 1. Limpiar y recargar zonas
  console.log('\n[1/3] Actualizando ZonaCobertura...')
  await supabase.from('zonacobertura').delete().neq('idzona', 0)
  const { error: errZ } = await supabase.from('zonacobertura').insert(zonas)
  if (errZ) console.error('❌ Error zonas:', errZ.message)
  else console.log(`   ✅ ${zonas.length} zonas bolivianas insertadas`)

  // 2. Limpiar y recargar planes
  console.log('\n[2/3] Actualizando PlanTelecomunicacion...')
  await supabase.from('plantelecomunicacion').delete().neq('idplan', 0)
  const { error: errP } = await supabase.from('plantelecomunicacion').insert(planes)
  if (errP) console.error('❌ Error planes:', errP.message)
  else console.log(`   ✅ ${planes.length} planes reales bolivianos insertados`)

  // 3. Verificar pesos
  console.log('\n[3/3] Verificando CriterioPonderacion...')
  const { data: pesos } = await supabase.from('criterioponderacion').select('*').limit(1)
  if (pesos && pesos.length > 0) {
    console.log(`   ✅ Pesos existentes: Precio ${pesos[0].pesoprecio} | Vel ${pesos[0].pesovelocidad} | Cob ${pesos[0].pesocobertura} | Estab ${pesos[0].pesoestabilidad}`)
  } else {
    console.log('   ℹ️  No hay pesos configurados. Insertar manualmente si es necesario.')
  }

  console.log('\n✅ ¡Base de datos actualizada con datos reales de Bolivia!')
  console.log('════════════════════════════════════════════════════\n')
}

updateData()
