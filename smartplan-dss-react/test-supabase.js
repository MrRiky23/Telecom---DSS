// test-supabase.js
// Script de prueba de conectividad con Supabase Cloud — Bolivia
// Uso: node test-supabase.js
// NOTA: Este archivo es solo para pruebas de desarrollo. No usar en producción.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Leer .env manualmente sin dotenv
const envContent = readFileSync('.env', 'utf-8')
const env = Object.fromEntries(
  envContent.split('\n')
    .filter(line => line.includes('=') && !line.startsWith('#'))
    .map(line => line.split('=').map(s => s.trim()))
)

const supabaseUrl     = env.VITE_SUPABASE_URL
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  console.log('══════════════════════════════════════════════════════')
  console.log('  SmartPlan DSS — Prueba de Conexión Supabase Bolivia')
  console.log('══════════════════════════════════════════════════════')
  console.log('URL:', supabaseUrl)
  console.log()

  // 1. ZonaCobertura
  const { data: zonas, error: errZonas } = await supabase.from('zonacobertura').select('*')
  if (errZonas) {
    console.log('❌ Error en zonacobertura:', errZonas.message)
  } else {
    console.log(`✅ zonacobertura — ${zonas?.length || 0} registros`)
    zonas?.forEach(z => console.log(`   • ${z.nombresector || z.nombreSector}`))
  }

  // 2. PlanTelecomunicacion
  const { data: planes, error: errPlanes } = await supabase.from('plantelecomunicacion').select('*').order('idplan')
  if (errPlanes) {
    console.log('❌ Error en plantelecomunicacion:', errPlanes.message)
  } else {
    console.log(`\n✅ plantelecomunicacion — ${planes?.length || 0} registros`)
    planes?.forEach(p => console.log(`   • [${p.proveedor}] ${p.nombreplan || p.nombrePlan} — Bs ${p.preciomensual || p.precioMensual} / ${p.velocidadmbps || p.velocidadMbps} Mbps`))
  }

  // 3. CriterioPonderacion
  const { data: criterios, error: errCriterios } = await supabase.from('criterioponderacion').select('*')
  if (errCriterios) {
    console.log('❌ Error en criterioponderacion:', errCriterios.message)
  } else {
    console.log(`\n✅ criterioponderacion — ${criterios?.length || 0} registros`)
    criterios?.forEach(c => console.log(`   • Precio: ${c.pesoprecio} | Vel: ${c.pesovelocidad} | Cob: ${c.pesocobertura} | Estab: ${c.pesoestabilidad}`))
  }

  console.log('\n══════════════════════════════════════════════════════')
}

testConnection()
