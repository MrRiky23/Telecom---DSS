# Telecom---DSS

FASE 1: DISEÑO DE LA EXPERIENCIA DE USUARIO (UX)
Proyecto: SmartPlan DSS — Sistema de Soporte a Decisiones para planes de telecomunicaciones

1. CARACTERIZACIÓN DE USUARIOS (USER PERSONAS)

Persona 1 — Perfil Operativo: "El Administrador de Catálogo"

Nombre ficticio: Marco Salinas
Rol: Analista comercial / encargado de carga de datos del proveedor asociado al DSS
Edad / perfil técnico: 28 años, competencia técnica media (usa Excel y sistemas internos a diario, no es programador)
Contexto de uso: Escritorio, jornada laboral, sesiones de 20-40 minutos, varias veces por semana cuando hay actualización de precios/cobertura
Objetivo principal: Mantener el catálogo de planes y los mapas de cobertura 100% actualizados y sin errores, para que el motor de recomendación trabaje con datos confiables
Tareas frecuentes: Cargar nuevos planes, editar precios cuando cambia una promoción, marcar zonas con cobertura alta/media/baja, dar de baja planes descontinuados
Frustraciones actuales: Hojas de cálculo desordenadas sin validación de campos; precios cargados sin unidad; campos vacíos que rompen reportes; no hay forma de saber si un cambio "se guardó bien"
Necesidades de interfaz: Formularios con validación visual inmediata (campos obligatorios marcados), mensajes de error específicos, confirmación clara al guardar, tabla ordenada para verificar lo ya cargado antes de crear algo nuevo
Lo que NO debe pasarle: Cargar un plan duplicado o con un campo vacío sin darse cuenta hasta que el usuario final se queje
Cita representativa: "Yo solo necesito cargar el dato correcto a la primera y saber que quedó guardado. No quiero pensar en el sistema, quiero pensar en los precios."

Persona 2 — Perfil Estratégico: "El Usuario/PYME que decide"

Nombre ficticio: Daniela Rojas
Rol: Dueña de una PYME (taller de diseño gráfico, 6 empleados) que necesita contratar o migrar su plan de internet
Edad / perfil técnico: 34 años, competencia técnica básica-media, usa el celular y la laptop indistintamente
Contexto de uso: Sesión corta y puntual (5-10 minutos), generalmente cuando vence un contrato o el servicio actual falla; puede estar en movimiento (móvil)
Objetivo principal: Decidir, con evidencia objetiva y en el menor tiempo posible, qué plan contratar sin tener que investigar manualmente cada proveedor
Tareas frecuentes: Ingresar su ubicación/uso/presupuesto, revisar el top 3 recomendado, entender por qué un plan quedó primero, simular un cambio de presupuesto antes de decidir
Frustraciones actuales: Anuncios contradictorios entre proveedores, letra chica sobre "límites de uso justo", no saber si la cobertura anunciada aplica realmente a su zona, miedo a pagar de más por desconocimiento
Necesidades de interfaz: Ver la conclusión (top 3) en los primeros 5 segundos, poder profundizar solo si quiere ("¿por qué este plan?"), controles simples para simular escenarios sin perder el resultado original
Lo que NO debe pasarle: Tener que leer una tabla de 20 planes o entender jerga técnica de telecomunicaciones para poder decidir
Cita representativa: "No quiero convertirme en experta en telecomunicaciones. Quiero ver el ganador, entender por qué, y listo."

2. OBJETIVOS DE INTERACCIÓN (POR PANTALLA)

Login (ambos perfiles): Acceder de forma rápida y segura al rol correcto. Métrica: autenticarse en ≤2 clics; el sistema deja claro qué rol se está usando (tabs Administrador / Usuario-PYME).
Menú Principal (ambos perfiles): Elegir sin ambigüedad entre "gestionar datos" (CRUD) o "ver mi recomendación" (Dashboard). Métrica: decisión de navegación en ≤3 segundos, sin leer instrucciones.
Gestión de Catálogo / Cobertura — CRUD (Operativo): Cargar o corregir un plan/zona sin generar datos inconsistentes. Métrica: 0 registros guardados con campos obligatorios vacíos; error visible antes de intentar guardar.
Crear/Editar Perfil: ubicación, uso, presupuesto (Estratégico): Describir su necesidad real en el menor número de campos posible. Métrica: formulario completable en menos de 60 segundos, sin campos técnicos innecesarios.
Seleccionar Criterios Prioritarios (Estratégico): Priorizar lo que más le importa (precio, velocidad, cobertura, estabilidad) sin sentirse abrumado. Métrica: selección de 2-3 criterios en un solo gesto (chips/orden), sin formularios largos.
Dashboard: Ranking Top 3 (Estratégico): Identificar el plan ganador y la razón detrás del puntaje. Métrica: el plan #1 y su puntaje son legibles "de un vistazo" (<5 segundos), sin scroll.
Simular Escenarios (Estratégico): Cambiar presupuesto/prioridades y comparar contra el resultado original. Métrica: ambos resultados (original vs. simulado) visibles simultáneamente, sin perder el primero.
Guardar / Compartir Recomendación (Estratégico): Conservar o enviar la decisión tomada. Métrica: acción disponible en 1 clic desde el Dashboard, sin cambiar de pantalla.

3. VISIÓN DEL PRODUCTO (UX)

"Una interfaz clara y confiable que convierte datos dispersos de proveedores en una recomendación objetiva, visible en segundos — sin exigirle al usuario que se convierta en experto en telecomunicaciones ni al administrador que tolere errores de carga."

Principios de diseño que sostienen esta visión:

Objetividad visible: cada recomendación debe poder explicarse (desglose de puntaje por criterio), nunca ser una "caja negra".
Revelación progresiva: el Usuario/PYME ve primero la conclusión (Top 3); los detalles (desglose, simulación) están un clic más allá, no forzados en la primera pantalla.
Mínima sorpresa: patrones estándar de UI (menú lateral fijo, botón principal siempre en la misma posición, colores neutros) para que el cerebro del usuario no gaste esfuerzo en aprender el sistema.
Prevención antes que corrección: en el módulo CRUD, los errores se evitan con validación en el momento de escribir, no se descubren después al revisar reportes.
Color con propósito: paleta neutra (grises/azules) para la interfaz base; rojo y verde reservados exclusivamente para alertas de negocio (campo inválido, ahorro logrado, etc.), nunca como decoración.

Cómo esta visión se refleja en lo ya prototipado:

El Login diferencia visualmente el rol (Operativo vs. Estratégico) desde el primer contacto.
El CRUD aplica validación visual inmediata (bordes rojos + mensaje) — principio de prevención.
El Dashboard entrega el ranking y los KPIs en la parte superior, con el detalle (gráfico de criterios, cobertura) inmediatamente debajo — principio de revelación progresiva.
------milton portal-------
## Estrategia de Documentación en GitHub ("Docs as Code")

Siguiendo el enfoque **Docs as Code**, la documentación técnica y arquitectónica del sistema se mantiene versionada junto con el código fuente. Se creó la carpeta `/docs/uml` dentro de la raíz del repositorio, albergando tanto los archivos de definición de modelos en PlantUML (`.puml`) como sus respectivas imágenes renderizadas (`.png`).

### Estructura de Directorios del Repositorio:
```plaintext
Telecom---DSS/
├── docs/
│   └── uml/
│       ├── casos_uso.puml
│       ├── casos_uso.png
│       ├── diagrama_clases.puml
│       ├── diagrama_clases.png
│       ├── secuencia_recomendacion.puml
│       └── secuencia_recomendacion.png
├── prototypes/
├── diagrams/
└── README.md