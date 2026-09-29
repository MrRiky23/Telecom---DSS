// Limpieza de zonas antiguas que quedaron en la BD
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envContent = readFileSync('.env', 'utf-8')
const env = Object.fromEntries(
  envContent.split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => l.split('=').map(s => s.trim()))
)
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

// Eliminar las zonas antiguas que no son de Bolivia
const zonasAntiguasAEliminar = [
  'Región Metropolitana / Centro',
  'Zona Norte / Industrial',
  'Zona Sur / Periferia Rural'
]

for (const nombre of zonasAntiguasAEliminar) {
  const { error } = await supabase.from('zonacobertura').delete().eq('nombresector', nombre)
  if (error) console.log(`⚠️  No se pudo eliminar "${nombre}":`, error.message)
  else console.log(`🗑️  Eliminada zona antigua: "${nombre}"`)
}

const { data: zonas } = await supabase.from('zonacobertura').select('*').order('idzona')
console.log('\n✅ Zonas actuales en BD:')
zonas?.forEach(z => console.log(`   [${z.idzona}] ${z.nombresector}`))
