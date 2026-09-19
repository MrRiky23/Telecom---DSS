# Addendum al PRD SmartPlan DSS v1.2: Parte 2 (propuesta)

> Continúa la Parte 1. Cierra la corrección crítica 3 (contrato de datos y métricas) y completa los vacíos de historias detectados en la auditoría. Las decisiones **[D-n]** continúan la numeración de la Parte 1 y requieren ratificación del Squad.

## 0. Decisiones nuevas a ratificar

| ID | Decisión propuesta |
|---|---|
| D-10 | `categoriaUso`: si el perfil tiene 1 tipo de uso, ese tipo; si tiene 2 o más, `Mixto`. |
| D-11 | Cobertura predominante de una zona = moda de los niveles de cobertura de sus proveedores. En empate gana el nivel **más bajo** (criterio conservador). |
| D-12 | Con filtro de zona activo, el KPI 2 muestra la zona elegida y su **% del total** del periodo, en lugar de una tabla degenerada de una fila. |
| D-13 | Política de contraseñas: mínimo 10 caracteres, con mayúscula, minúscula y dígito. |
| D-14 | Respaldo: RPO ≤ 24 h, RTO ≤ 4 h. |
| D-15 | Las pruebas de RNF-01 a RNF-04 se validan en el **plan de Supabase que se usará en producción** (ver sección 1). |

---

## 1. Resolución de los `[VERIFICAR]` contra Supabase

Consulta hecha en septiembre de 2026 (verificar de nuevo antes de contratar):

| Hallazgo | Impacto en el PRD |
|---|---|
| Plan **Free**: 500 MB de base de datos, sin backups, proyectos pausados tras 7 días sin actividad, máximo 2 proyectos activos. | El ETL nocturno no corre si el proyecto está pausado. RNF-03 (1.000.000 de filas) **no cabe** en 500 MB compartidos con `oltp`. No hay respaldo (RNF-08). |
| Plan **Pro** ($25/mes por organización): 8 GB de disco incluidos por proyecto. | Es el plan mínimo para validar RNF-03, RNF-04 y RNF-08 con datos realistas. |

**Estimación (a confirmar con `pg_total_relation_size`):** `FACT_Recomendacion` con ~25 columnas y 5 índices ocupa unos 350-450 MB con 1.000.000 de filas. Con 100.000 recomendaciones del RNF-04 (~300.000 filas) ocupa ~100-150 MB.

**Consecuencias:**
- RNF-03 y RNF-08 se validan en **Pro**. En Free solo se permite una prueba reducida (100.000 filas), y el resultado se documenta como no concluyente.
- **Enmienda a la sección 4.6 de la Parte 1:** con 2 proyectos activos en Free, no caben `dev`, `staging` y `prod` en Supabase. Propuesta: `dev` en PostgreSQL local (Docker, con la extensión `pg_cron`), `staging` y `prod` en Supabase.

---

## 2. Contrato de datos del Data Warehouse

### 2.1 Enmienda a `DetalleRecomendacion` (esquema `oltp`)

Para que el snapshot de HU-D01 sea real, `DetalleRecomendacion` debe guardar **al momento de generar el Top 3**: `precioSnapshot` (Bs/mes) y `velocidadSnapshot` (Mbps). Si el ETL los leyera del catálogo a las 02:00, no serían un snapshot. Esto se agrega a la persistencia de HU-C07.

`RecomendacionResult.fechaCalculo` es `timestamptz` en UTC, asignado por la base de datos (`now()`), no por el reloj de la app.

### 2.2 Grano de `FACT_Recomendacion`

**Una fila por plan dentro del Top 3 de una recomendación** (máximo 3 filas por recomendación). Incluye recomendaciones originales y simulaciones confirmadas.

| Columna | Tipo | Descripción |
|---|---|---|
| `idFact` | bigint PK | Llave sustituta. |
| `idDetalle_nk` | bigint **UNIQUE** | Id del `DetalleRecomendacion` de origen. Garantiza idempotencia. |
| `idRecomendacion_nk` | bigint | Id del `RecomendacionResult`. Se repite en las filas del mismo Top 3. Se usa para `COUNT DISTINCT`. |
| `idRecomendacionOrigen_nk` | bigint null | Solo en simulaciones: id de la recomendación original. |
| `sk_tiempo` | int FK | `yyyymmdd` de `fechaCalculo` convertida a `America/La_Paz`. |
| `sk_usuario`, `sk_plan`, `sk_zona` | int FK | Dimensiones. |
| `sk_criterio_modificado` | smallint FK | `DIM_Criterio`. `0` = "Ninguno" (originales y simulaciones de presupuesto). |
| `posicion` | smallint | 1 a 3. |
| `puntajeTotal` | numeric(5,4) | 0 a 1. |
| `puntajePrecio`, `puntajeVelocidad`, `puntajeCobertura`, `puntajeEstabilidad` | numeric(5,4) | Aporte ponderado por criterio (peso × valor normalizado). |
| `pesoPrecio`, `pesoVelocidad`, `pesoCobertura`, `pesoEstabilidad` | numeric(3,2) | Pesos usados en esa recomendación. |
| `precioSnapshot` | numeric(10,2) | Bs/mes al momento del cálculo. |
| `velocidadSnapshot` | numeric(10,2) | Mbps al momento del cálculo. |
| `presupuestoUsado` | numeric(10,2) | Bs. |
| `categoriaPresupuesto` | text | `Bajo`, `Medio` o `Alto`. |
| `categoriaUso` | text | Ver regla 3. |
| `esSimulacion` | boolean | |
| `tipoSimulacion` | text null | `PESO` o `PRESUPUESTO`. Nulo en originales. |
| `versionAlgoritmo` | text | Ej. `SAW-1.0`. |
| `fechaCalculo` | timestamptz | Marca temporal de origen. |
| `idCorrida` | bigint FK | Linaje: corrida ETL que la cargó. |

### 2.3 Dimensiones

| Dimensión | Columnas | Notas |
|---|---|---|
| `DIM_Tiempo` | `sk_tiempo` (yyyymmdd), `fecha`, `anio`, `trimestre`, `mes`, `nombreMes`, `semanaISO`, `diaSemana`, `esFinDeSemana` | Poblada una vez para 2026-01-01 a 2035-12-31. |
| `DIM_Usuario` | `sk_usuario`, `idUsuario_nk` | Solo el identificador seudónimo. **Sin nombre, correo ni teléfono.** |
| `DIM_Plan` | `sk_plan`, `idPlan_nk`, `proveedor`, `nombrePlan` | SCD Tipo 1. **Sin precio ni velocidad** (viven como snapshot en el hecho). |
| `DIM_Zona` | `sk_zona`, `idZona_nk`, `nombreZona`, `coberturaPredominante` | SCD Tipo 1, recalculada en cada corrida. |
| `DIM_Criterio` | `sk_criterio` (0 a 4), `nombre` | 0 Ninguno, 1 Precio, 2 Velocidad, 3 Cobertura, 4 Estabilidad. |
| `dw.etl_bitacora` | `idCorrida`, `inicio`, `fin`, `watermark_desde`, `watermark_hasta`, `filas_leidas`, `filas_cargadas`, `filas_rechazadas`, `filas_omitidas`, `estado` (`OK`, `ALERTA`, `ERROR`), `mensaje` | |
| `dw.etl_rechazo` | `idCorrida`, `idDetalle_nk`, `motivo`, `fecha` | |

---

## 3. Proceso ETL: las 6 reglas, definidas en el PRD

**Ejecución:** función SQL con `SECURITY DEFINER` (dueño: rol de mínimo privilegio, ver 4.3 de la Parte 1), agendada con `pg_cron` a las `0 6 * * *` (06:00 UTC = 02:00 en Bolivia, UTC-4 sin horario de verano).

**Pasos:**
1. Tomar un `pg_advisory_lock` para impedir corridas concurrentes y abrir el registro en la bitácora.
2. Ventana incremental: `watermark_desde` = `watermark_hasta` de la última corrida `OK` o `ALERTA` (la primera corrida usa `-infinity`). `cutoff` = inicio de la corrida menos **5 minutos**, para no perder transacciones que aún no habían confirmado.
3. Leer `DetalleRecomendacion` unido a `RecomendacionResult` con `fechaCalculo > desde AND fechaCalculo <= cutoff`.
4. Actualizar `DIM_Usuario`, `DIM_Plan` y `DIM_Zona` (upsert).
5. Transformar con las 6 reglas, validar y enviar los inválidos a `etl_rechazo`.
6. Insertar en el hecho con `ON CONFLICT (idDetalle_nk) DO NOTHING`. Reejecutar una ventana no duplica datos.
7. Cerrar la bitácora con la conciliación (ver RNF-04). Todo ocurre en **una transacción**. Ante una excepción se hace rollback, el estado queda en `ERROR` y el watermark no avanza.

**Las 6 reglas:**

1. **Explosión:** cada `DetalleRecomendacion` produce una fila de hechos (1 recomendación genera hasta 3 filas).
2. **Snapshot:** `precioSnapshot` y `velocidadSnapshot` se copian de `DetalleRecomendacion` (sección 2.1), nunca de `PlanTelecomunicacion`.
3. **Categorización:**
   - Presupuesto (Bs): `Bajo` si < 50; `Medio` si está entre 50 y 150 **inclusive**; `Alto` si > 150.
   - Uso **[D-10]**: 1 tipo de uso → ese tipo; 2 o más → `Mixto`.
4. **Cobertura predominante por zona [D-11]:** moda de los niveles de `ZonaCobertura` de la zona; en empate, el nivel más bajo (`baja` < `media` < `alta`).
5. **DIM_Tiempo:** el `sk_tiempo` se deriva de `fechaCalculo` a la zona horaria `America/La_Paz`, no UTC.
6. **Simulaciones:** se cargan `esSimulacion`, `tipoSimulacion`, `idRecomendacionOrigen_nk` y `sk_criterio_modificado` (0 si no aplica).

**Un registro se rechaza si:** no resuelve alguna dimensión (`sk_plan`, `sk_zona` o `sk_usuario`), `posicion` no está entre 1 y 3, `puntajeTotal` no está entre 0 y 1, `precioSnapshot` o `presupuestoUsado` son ≤ 0, o un campo obligatorio es nulo.

---

## 4. Definición de los KPIs

Todos leen **solo del esquema `dw`** con el rol `dw_reader`. El filtro de fechas se aplica sobre `DIM_Tiempo.fecha`; en el KPI 3 se aplica sobre la fecha de la recomendación **original**.

**KPI 1 (HU-D01): precio y velocidad promedio del Top 3 por proveedor y mes.**
Solo originales (`NOT esSimulacion`) **[D-7]**. Cada plan del Top 3 cuenta una vez.
```sql
SELECT p.proveedor, t.anio, t.mes,
       AVG(f.precioSnapshot)     AS precio_prom,
       AVG(f.velocidadSnapshot)  AS velocidad_prom
FROM dw.fact_recomendacion f
JOIN dw.dim_plan p   ON p.sk_plan = f.sk_plan
JOIN dw.dim_tiempo t ON t.sk_tiempo = f.sk_tiempo
WHERE NOT f.esSimulacion
  AND t.fecha BETWEEN :desde AND :hasta
  AND (:zona IS NULL OR f.sk_zona = :zona)
GROUP BY p.proveedor, t.anio, t.mes;
```

**KPI 2 (HU-D02): zona con más recomendaciones y puntaje global promedio.**
Puntaje global = puntaje del plan en posición 1 de cada recomendación. Como cada recomendación tiene una sola fila con `posicion = 1`, el promedio queda **por recomendación**, no por fila.
```sql
SELECT z.nombreZona,
       COUNT(DISTINCT f.idRecomendacion_nk)                 AS recomendaciones,
       AVG(f.puntajeTotal) FILTER (WHERE f.posicion = 1)    AS puntaje_global_prom
FROM dw.fact_recomendacion f
JOIN dw.dim_zona z   ON z.sk_zona = f.sk_zona
JOIN dw.dim_tiempo t ON t.sk_tiempo = f.sk_tiempo
WHERE NOT f.esSimulacion AND t.fecha BETWEEN :desde AND :hasta
GROUP BY z.nombreZona
ORDER BY recomendaciones DESC;
```
Con filtro de zona activo **[D-12]**: se muestra esa zona con su porcentaje sobre el total del periodo.

**KPI 3 (HU-D03): % de recomendaciones simuladas y criterio más modificado, por rango de presupuesto.**
```sql
WITH orig AS (
  SELECT DISTINCT f.idRecomendacion_nk, f.categoriaPresupuesto
  FROM dw.fact_recomendacion f
  JOIN dw.dim_tiempo t ON t.sk_tiempo = f.sk_tiempo
  WHERE NOT f.esSimulacion AND t.fecha BETWEEN :desde AND :hasta
    AND (:zona IS NULL OR f.sk_zona = :zona)
), sim AS (
  SELECT DISTINCT idRecomendacionOrigen_nk, tipoSimulacion, sk_criterio_modificado
  FROM dw.fact_recomendacion WHERE esSimulacion
)
SELECT o.categoriaPresupuesto,
       COUNT(DISTINCT s.idRecomendacionOrigen_nk)::numeric
         / NULLIF(COUNT(DISTINCT o.idRecomendacion_nk), 0) AS pct_simuladas
FROM orig o
LEFT JOIN sim s ON s.idRecomendacionOrigen_nk = o.idRecomendacion_nk
GROUP BY o.categoriaPresupuesto;
```
- El **denominador** son **todas** las originales del segmento; el numerador, las que tienen simulación.
- El segmento de presupuesto es el de la **original**, aunque la simulación cambie el presupuesto.
- **Criterio más modificado** = la moda de `sk_criterio_modificado` entre simulaciones de tipo `PESO` (por frecuencia). Las de tipo `PRESUPUESTO` se muestran como un conteo aparte.

**Frescura:** el dashboard muestra "Datos al: <`fin` de la última corrida `OK`>" leído de `dw.etl_bitacora`. Los KPIs pueden tener hasta ~24 h de retraso y eso se acepta explícitamente.

---

## 5. Requerimientos no funcionales reescritos

Convención: p95 calculado sobre la fase estable. Datos siempre ficticios. Las pruebas de carga usan **k6**, herramienta externa que **no se agrega al proyecto** (no viola la regla de NuGet). Los resultados se guardan en `/docs/rnf/`.

| ID | Requisito | Umbral | Condiciones de medición |
|---|---|---|---|
| **RNF-01** | Top 3 (HU-C07) | Servicio: **p95 ≤ 2000 ms**. Pantalla completa: **p95 ≤ 5 s** | 500 planes activos; 50 usuarios virtuales concurrentes con 1 s de espera entre solicitudes; 1 min de rampa y 5 min estables (mínimo 1.000 solicitudes). Tiempo del servicio = desde la entrada al servicio hasta el commit (lectura de candidatos + cálculo + persistencia), medido con `Stopwatch` y registrado. Pantalla completa = LCP de Lighthouse con el throttling móvil por defecto. Entorno `staging` con el plan de producción; región de Supabase declarada. |
| **RNF-02** | Previsualización de simulación (HU-C08) | **p95 ≤ 1500 ms** | Mismo volumen y método que RNF-01, sobre el endpoint de previsualización (sin escritura). El slider aplica un *debounce* de 250 ms en el cliente para no generar tormentas de solicitudes. Mide tiempo de servidor; el viaje de red se reporta aparte. |
| **RNF-03** | Consulta de KPI | **p95 ≤ 3000 ms** | 1.000.000 de filas sintéticas en el hecho; índices en `sk_tiempo`, `sk_zona`, `sk_plan` e `idRecomendacion_nk`; 100 ejecuciones por KPI tras 5 de calentamiento; con 1 usuario y con 5 gerentes concurrentes. Solo válido en plan **Pro** (D-15). Si no se cumple con índices, se permite una vista materializada refrescada por el ETL, vía migración revisada. |
| **RNF-04** | Integridad del ETL | Ver detalle abajo | 100.000 recomendaciones (~300.000 filas) en `staging`. |
| **RNF-05** | Control de acceso | Ver detalle abajo | |
| **RNF-06** | Calidad de código | Cobertura **≥ 80% de líneas y ≥ 70% de ramas** en el namespace del motor analítico | Medida con xUnit + coverlet. Gate bloqueante en CI (`--threshold 80 --threshold-type line`). |

**RNF-04: Integridad del ETL (reescrito, elimina la contradicción 100% vs ≤ 1%)**
- **(a) Conciliación:** en cada corrida `filas_leidas = filas_cargadas + filas_rechazadas + filas_omitidas`. Nada se pierde en silencio: todo registro leído se carga, se rechaza con motivo o se omite por idempotencia. Se exige **100%** de conciliación.
- **(b) Tasa de rechazo ≤ 1%** de las filas leídas. Si se supera, la corrida termina en estado `ALERTA`.
- **(c)** Máximo 3 filas de hechos por `idRecomendacion_nk`. Verificado por una consulta de control al final de la corrida.
- **(d)** "Recomendaciones del día" se redefine como las que caen en la ventana `(watermark_desde, cutoff]`.
- **(e)** Duración **≤ 15 minutos** con 100.000 recomendaciones. Reejecutar la misma ventana no duplica filas.

**RNF-05: Control de acceso (fuente única de valores; HU-C03 solo remite aquí)**
- Hasher por defecto de Identity (PBKDF2 con HMAC-SHA512 y **100.000 iteraciones** desde .NET 7; confirmar la versión del proyecto). Una prueba automatizada decodifica el encabezado del hash y verifica formato y número de iteraciones.
- Bloqueo: `MaxFailedAccessAttempts = 5`, `DefaultLockoutTimeSpan = 15 min`, `AllowedForNewUsers = true`. `PasswordSignInAsync` **debe** invocarse con `lockoutOnFailure: true`, y hay una prueba que verifica el bloqueo real.
- Contraseñas **[D-13]**: mínimo 10 caracteres, con mayúscula, minúscula y dígito.
- Sesión: expira a los **30 minutos de inactividad** (`SlidingExpiration = true`). Cookie `HttpOnly`, `Secure`, `SameSite=Lax`.
- Los valores viven en configuración, no repetidos en el código ni en otras secciones.

### RNF nuevos

| ID | Categoría | Requisito medible |
|---|---|---|
| **RNF-07** | Pruebas del ETL | Suite de pruebas SQL (ej. pgTAP) con datos de prueba que cubre las 6 reglas, la idempotencia y los rechazos. Se ejecuta en CI contra un PostgreSQL local. **100%** de las reglas con al menos una prueba. |
| **RNF-08** | Respaldo y recuperación | **RPO ≤ 24 h, RTO ≤ 4 h [D-14]**. Requiere plan Pro (Free no incluye backups). Se hace una prueba de restauración documentada antes de producción. |
| **RNF-09** | Observabilidad del ETL | Una corrida `ERROR` o `ALERTA` es visible en el dashboard el mismo día. Se notifica a un responsable designado en la bitácora. |
| **RNF-10** | Seguridad | Solo HTTPS con HSTS; *anti-forgery tokens* en formularios; `dotnet list package --vulnerable` en CI sin vulnerabilidades altas o críticas; checklist OWASP Top 10 revisado por release. |
| **RNF-11** | Compatibilidad | Últimas 2 versiones de Chrome, Edge, Firefox y Safari; diseño usable desde 360 px de ancho. |

---

## 6. Historias que faltaban (borradores)

**HU-C03 dividida:**
- **HU-C03a: Autenticación.** Login con mensaje de error genérico; redirección al panel según el rol.
- **HU-C03b: Autorización por roles.** `Usuario` y `Gerente` no acceden al CRUD; `Gerente` accede solo al dashboard; `Usuario` accede solo a perfil, Top 3 y simulación.
- **HU-C03c: Bloqueo de cuenta.** Comportamiento definido en RNF-05 (sin repetir los valores).

**HU-C09 (E2): Registro e inicio de sesión de Usuario/PYME.**
*Como* Usuario/PYME, *quiero* crear una cuenta e iniciar sesión, *para* conservar mi perfil entre sesiones.
1. El registro valida la política de contraseñas de RNF-05 y rechaza correos duplicados sin revelar si el correo existe.
2. Toda cuenta autoregistrada recibe **solo** el rol `Usuario`.
3. El rol `Gerente` lo asigna únicamente el Administrador.

**HU-C10 (E1): Gestión de zonas.**
*Como* Administrador, *quiero* crear, editar y desactivar zonas, *para* que perfiles y cobertura usen zonas válidas.
1. El nombre de zona es obligatorio y único.
2. Una zona con cobertura o perfiles asociados se **desactiva** (baja lógica), no se borra.

**HU-C11 (E1): Baja lógica de planes.**
*Como* Administrador, *quiero* desactivar un plan, *para* que deje de aparecer en recomendaciones sin perder el historial.
1. El plan desactivado se excluye de los candidatos de HU-C07.
2. Las recomendaciones históricas no cambian.

**Eliminar de la sección 2 de Marco:** "y pesos por defecto". Con la tabla ROC de HU-C05 ya no existen pesos por defecto configurables.

---

## 7. Lista de verificación antes de mandar a desarrollo

- [ ] Ratificadas las decisiones D-1 a D-15.
- [ ] Parte 1 y Parte 2 fusionadas en el PRD y la versión pasada a **v1.2**.
- [ ] Ejemplo oráculo verificado con una prueba xUnit.
- [ ] Cada HU con tablas/columnas afectadas, dependencias y estimación (DoR).
- [ ] Decidido el plan de Supabase (Free para desarrollo, Pro para validar RNF-03, RNF-04 y RNF-08).
- [ ] CI configurado con los gates de la sección 4.2 de la Parte 1 y los RNF-05, RNF-06, RNF-07 y RNF-10.
