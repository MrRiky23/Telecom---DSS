# SmartPlan DSS

Sistema de apoyo a la decisión para comparar planes de telecomunicaciones en Bolivia (motor SAW con pesos ROC). React + Vite + Supabase.

## Puesta en marcha

```bash
npm install
cp .env.example .env      # completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev               # http://localhost:3000
npm test                  # pruebas del motor SAW (vitest)
npm run build
```

Sin variables de Supabase la app funciona en modo demo con los datos de `src/data/seedData.js`.

## Estructura

```
├─ database/            SQL de Supabase
│  ├─ schema.sql          esquema completo
│  └─ patches/            parches incrementales (aplicar en orden 01, 02, 03…)
├─ docs/                BUGFIXES.md, PRD_Telecom.md
├─ scripts/             utilidades de Node (se ejecutan desde la raíz, leen .env)
│                       npm run db:test | db:update | db:cleanup-zones
├─ src/
│  ├─ main.jsx            punto de entrada (Router + estilos)
│  ├─ App.jsx             estado global de la app, rutas y modales
│  ├─ pages/              pantallas que cuelgan de una ruta (Login, Dashboard, Catálogo,
│  │                      Cobertura, Perfiles, Zonas, Historial, Admin, Wizard)
│  ├─ components/         piezas reutilizables, agrupadas por dominio
│  │  ├─ auth/  common/  dashboard/  layout/  modals/
│  ├─ context/            AuthContext (sesión, rol, perfil)
│  ├─ hooks/              hooks propios (useToast)
│  ├─ services/           acceso a datos (Supabase): supabaseServices, recomendacionService
│  ├─ lib/                clientes externos (supabaseClient)
│  ├─ engine/             motor SAW/ROC puro + __tests__/
│  ├─ utils/              funciones auxiliares sin React (exportDictamen)
│  ├─ config/             constantes de negocio (contacto)
│  ├─ data/               datos semilla para modo demo
│  └─ styles/             index.css
├─ index.html · vite.config.js · vercel.json · package.json
└─ .env.example         plantilla de variables (.env y .env.local no se versionan)
```

### Reglas para mantenerla ordenada

- Una pantalla con ruta → `pages/`. Si se reutiliza en varias pantallas → `components/<dominio>/`.
- Ningún componente habla con Supabase directamente si puede evitarse: usar `services/`.
- `engine/` no importa React ni Supabase; así sus pruebas siguen siendo rápidas.
- Lógica con estado que se repite → `hooks/`. Lógica sin estado → `utils/`.
