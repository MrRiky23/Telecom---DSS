# PRD SmartPlan DSS — v1.2 (fusión de Parte 1 + Parte 2, reconciliada)

> Este documento reemplaza a los dos addenda anteriores (`PRD_addendum_v1.2.md` y `PRD_Telecom.md`). Donde ambos se contradecían, **prevalece la Parte 1** (motor SAW, pesos ROC a 2 decimales, una sola simulación confirmada por variable). Cada decisión cita su origen. Todo lo marcado **[D-n]** es una decisión que el Squad DEBE ratificar antes de desarrollo; hasta entonces su estado es *Propuesta*.
>


| Punto de conflicto | Addendum Parte 1 | Addendum Parte 2 (v2.0, mío) | Queda en v1.2 | Motivo |
|---|---|---|---|---|
| Precisión de pesos | `numeric(3,2)`, suma exacta 1,00 | `numeric(5,4)`, tolerancia 0,0005 | **`numeric(3,2)`, suma exacta 1,00** | La Parte 1 lo define con mecanismo de verificación (`decimal`, nunca `double`); mi versión lo relajó sin necesidad. |
| Cantidad de criterios seleccionables | 2 o 3 de 4 | Trataba el caso de 4 seleccionados | **2 o 3, nunca 4** | HU-C05 de la Parte 1 lo dice explícitamente; mi cálculo de pesos ROC para 4 criterios no aplica y se elimina. |
| Simulaciones por recomendación original | Máximo 1 confirmada (D-3) | Hasta 5 | **1** | D-3 es explícita y coherente con "no guardar múltiples escenarios" del alcance original. |
| Variables por simulación | Exactamente 1: peso de un criterio **o** presupuesto (D-4) | Tipo `AMBOS` | **1 sola variable; se elimina `AMBOS`** | D-4 lo prohíbe expresamente. |
| Desempate del ranking | Precio asc → estabilidad desc → `idPlan` asc | Precio asc → velocidad desc → `idPlan` asc | **Precio → estabilidad → idPlan** | Criterio 4 de HU-C07 en la Parte 1. |
| Ante una ambigüedad, el agente... | Se detiene y pregunta; no edita el PRD | Registraba la pregunta en una sección del propio PRD | **Se detiene y pregunta a una persona; no edita el PRD** | Regla 4.5 de la Parte 1. |
| Gate de cobertura | No especificaba paquete | Pedía umbral con `coverlet.collector`, que no aplica umbrales de build | **`coverlet.msbuild`** (añadido a D-8) | `collector` solo recolecta; el umbral que rompe el build requiere la integración `msbuild`. |
| Alcance del MVP vs. registro/roles/reset | 4.1 no menciona registro, reset de contraseña ni gestión de roles | Los agregaba como HU-C09, C12, C13 | **Se agregan al alcance (4.1 enmendado)**, justificado en §1.1 | Sin ellos no existe forma de crear cuentas ni de recuperar acceso; son plomería indispensable para que exista autenticación, no una función de valor añadido. |
| Paquetes NuGet permitidos (D-8) | Lista sin `NetArchTest.Rules` ni emisor de correo | Asumía correo y pruebas de arquitectura sin declarar el paquete | **D-8 ampliada** (ver §2.4) | La propia Parte 1 exige una prueba de arquitectura (NetArchTest) en su tabla 4.2 y no incluyó el paquete que la implementa. |
| Retención y borrado (D-9) | Pendiente | No la resolvía | **Resuelta en D-9 (pseudonimización)** | Ver §2.5. |
| RLS, dueño de la función ETL, esquema de Identity, lista negra de CI | Mencionados sin detalle operable | No los tocaba | **Detallados en §2** | Ver auditoría previa. |
| Oráculo de prueba | 1 caso (peso) | Ninguno nuevo | **4 casos** (original + 3 nuevos: estabilidad con empate, `max = min`, simulación de presupuesto) | Cobertura de bordes exigida por RNF-07/13. |

---

## 1. Reglas de operación para agentes de IA (autoridad: Parte 1, §4.5, ampliada)

**SIEMPRE**
- Implementar solo lo que este documento describe, citando en cada commit y PR el ID de la HU, RNF o D-n que lo origina.
- Escribir las pruebas junto con el código, incluida al menos una por cada regla de frontera de §5 y cada fila del oráculo (§6).
- Ejecutar la suite completa y los gates de CI antes de proponer un PR.
- Usar consultas parametrizadas y migraciones versionadas para todo cambio de esquema.
- Usar exclusivamente datos ficticios en `dev` y `staging`.
- Trabajar solo contra `dev`; no tiene acceso a credenciales, base de datos ni entorno de `staging` o `prod`.
- Citar la HU en cada PR, tocar un solo alcance y mantenerse cerca de 400 líneas de diff (ver mecanismo en §2.3).

**PREGUNTAR ANTES (detenerse y consultar a una persona, nunca resolver por su cuenta)**
- Agregar o actualizar dependencias NuGet fuera de la lista de D-8 (§2.4).
- Crear vistas materializadas, índices nuevos o cualquier cambio de esquema fuera de una migración revisada.
- Cambiar un umbral de RNF, una decisión D-n o el plan/tamaño de Supabase.
- Añadir un requisito, un campo o un comportamiento que este documento no defina. La ambigüedad se reporta a una persona del Squad; **no se resuelve editando este PRD**.

**NUNCA**
- Usar datos reales, ni guardar secretos o credenciales en el repositorio.
- Aprobar o fusionar sus propios PR.
- Editar este PRD, los archivos de CI o las reglas de protección de rama.
- Deshabilitar, omitir o relajar pruebas, advertencias del compilador o gates de CI.
- Escribir en `dw` desde la aplicación (solo el ETL escribe) ni leer `oltp` con `dw_reader`.
- Invocar `PasswordSignInAsync` con `lockoutOnFailure: false`.
- Modificar recomendaciones históricas ni sus snapshots.
- Ejecutar DDL o DML destructivo contra `staging` o `prod`.

### 1.1 Justificación de la enmienda al alcance (4.1)

La Parte 1 define el alcance del MVP sin mencionar cómo se crean las cuentas ni cómo se recupera el acceso. Sin registro no hay forma de que exista un `Usuario`, y sin restablecimiento de contraseña, una cuenta bloqueada por el propio usuario (olvido) queda inservible sin intervención manual en la base de datos. Por eso el alcance de 4.1 se enmienda para incluir explícitamente:
- registro con confirmación de correo,
- restablecimiento de contraseña,
- gestión de roles y desbloqueo por un Administrador (sin esto, un Administrador solo puede desbloquear con SQL directo, lo que contradice "sin acceso destructivo a producción").

Esto **no** amplía el alcance funcional del DSS (Top 3, simulación, KPIs); es la plomería de autenticación sin la cual el resto del PRD no se puede operar.

---

## 2. Entornos, seguridad y gobierno de datos

### 2.1 Supabase: plan, región y costo

| Hallazgo (verificado, septiembre 2026; revalidar antes de contratar) | Consecuencia |
|---|---|
| Plan **Free**: 500 MB de base de datos, sin backups, proyecto pausado tras 7 días sin actividad, máximo 2 proyectos activos. | No sirve para RNF-04 (respaldo) ni para `staging`/`prod` reales; el ETL nocturno no corre con el proyecto pausado. |
| Plan **Pro**: $25/mes por organización, 8 GB de disco por proyecto, backups diarios con 7 días de retención, sin pausa por inactividad. | Plan mínimo exigido para validar RNF-03, RNF-04(agregada) y respaldo. |
| El **compute se factura por proyecto**, aparte de los $25 de organización; Pro incluye $10/mes de crédito (cubre una instancia Micro). | `staging` + `prod` en Pro con Micro ≈ **$35/mes** ($25 + $10 + $10 − $10 de crédito). Debe presupuestarse. |
| Región **South America (São Paulo, `sa-east-1`)** disponible. | Es la más cercana a Bolivia entre las regiones ofrecidas. |

**[D-32]** Región `sa-east-1`; compute **Micro** en `staging` y `prod`, con **Small** (≈$15/mes) como escalón si el RNF de consulta de KPIs no se cumple con índices; `dev` corre en PostgreSQL local (Docker). *Propuesta.*

### 2.2 Esquemas, exposición y RLS

- `oltp` y `dw` **no se exponen** por la Data API (PostgREST); la app se conecta solo por Npgsql con los roles de §2.3.
- **Esquema de Identity: `identity`, no `public`.** `public` es el esquema por defecto expuesto por la Data API de Supabase; dejar ahí las tablas de Identity las expondría accidentalmente. Se fija `DbContextOptionsBuilder` con `HasDefaultSchema("identity")` para las tablas de ASP.NET Identity y `HasDefaultSchema("oltp")` para el resto.
- **RLS habilitado en todas las tablas de `oltp` y `dw`, con políticas explícitas por rol** (no basta con habilitarlo): cada rol de §2.3 recibe una política `USING`/`WITH CHECK` que replica exactamente sus privilegios de tabla (por ejemplo, `dw_reader` con `USING (true)` de solo lectura sobre `dw`, nunca sobre `oltp`; `app_rw` sin `USING (true)` en las tablas inmutables). RLS es defensa en profundidad; los `GRANT` de §2.3 siguen siendo la barrera principal.
- **Ningún rol de aplicación tiene `BYPASSRLS`.**

### 2.3 Matriz de roles de base de datos (autoridad: Parte 1, §4.3, con correcciones)

| Rol | `oltp` | `dw` | Uso | Dueño de objetos |
|---|---|---|---|---|
| `app_rw` | `SELECT, INSERT, UPDATE` (sin `UPDATE`/`DELETE` en tablas inmutables) | sin acceso | ASP.NET Core | — |
| `etl_runner` | solo `SELECT` | `INSERT, UPDATE` | Función ETL vía `pg_cron` | **Dueño y ejecutor de la función ETL** (corrección: no `migrator`; si `migrator` fuera dueño de una función `SECURITY DEFINER`, esta correría con sus privilegios y podría escribir en `oltp`, violando la regla "el ETL no escribe en `oltp`"). |
| `dw_reader` | sin acceso | solo `SELECT` | Dashboard gerencial | — |
| `migrator` | dueño del DDL | dueño del DDL de `dw` (tablas, no la función ETL) | Solo CI, tras PR aprobado | — |

**Real vs. teórico sobre EF y Identity:** la regla "el rol de la app no tiene permisos directos sobre Identity fuera de lo que hace EF" no es aplicable a nivel de PostgreSQL, porque EF y el resto del código corren con el mismo rol `app_rw`. El control real es de **revisión de código y pruebas de arquitectura** (NetArchTest, §2.4), no de permisos de base de datos. Se corrige la Parte 1 en este punto: es una regla de proceso, no un mecanismo de base de datos.

### 2.4 Excepciones y paquetes NuGet permitidos (autoridad: Parte 1, D-8, ampliada)

1. Se permite que la primera migración de EF cree las tablas de Identity, en el esquema `identity` (§2.2). Después queda prohibido editarlas por SQL o migración manual.
2. La función ETL y el job de `pg_cron` son DDL: se versionan como migraciones con PR revisado, igual que cualquier otro cambio de esquema, y su dueño es `etl_runner` (§2.3).
3. **Lista de paquetes NuGet permitidos [D-8, ampliada]:**
   - `Npgsql.EntityFrameworkCore.PostgreSQL`
   - `Microsoft.AspNetCore.Identity.EntityFrameworkCore`
   - `Microsoft.EntityFrameworkCore.Design`
   - `Microsoft.EntityFrameworkCore.Tools`
   - `xunit`, `xunit.runner.visualstudio`, `Microsoft.NET.Test.Sdk`
   - **`coverlet.msbuild`** (reemplaza a `coverlet.collector`: el `collector` recolecta cobertura pero no rompe el build por umbral; `msbuild` sí aplica `/p:Threshold` y `/p:ThresholdType` como gate).
   - **`NetArchTest.Rules`** (implementa el mecanismo "sin lógica de puntaje en vistas o controladores" que la propia Parte 1 exige en su tabla 4.2 pero no declaraba como dependencia).
   - **`Microsoft.AspNetCore.Mvc.Testing`** (pruebas de integración de 401/403 y de los endpoints de Top 3 y simulación).
   - **`MailKit`** (implementación de `IEmailSender` sobre SMTP, para confirmación de correo y restablecimiento de contraseña, §1.1).
   - Cualquier otro paquete requiere PR aprobado por el Squad (regla "Preguntar antes", §1).
4. **Herramientas externas no-NuGet**, no sujetas a esta lista: `gitleaks` (escaneo de secretos en CI) y `k6` (pruebas de carga, corren fuera del proyecto .NET).
5. **Correo transaccional [D-30]:** `dev` usa un servidor SMTP local en Docker (captura, no envía). `staging` y `prod` usan **Brevo** (SMTP, plan gratuito de 300 correos/día). Las pruebas de carga NO DEBEN ejercitar rutas que envíen correo.

### 2.5 D-9: retención y borrado de datos personales — resuelta

**[D-9, resuelta]** El PRD exige que `RecomendacionResult` y `DetalleRecomendacion` sean inmutables (tabla 4.2), lo que impide borrar filas al eliminar una cuenta. Se resuelve con **pseudonimización, no con borrado físico del historial**:
- Al eliminar o desactivar una cuenta, se anonimiza `PerfilUsuario` (que **no** es inmutable): `ubicacion`, y cualquier dato identificable se reemplazan por marcadores fijos (`"[eliminado]"`), conservando solo los campos numéricos necesarios para los KPIs.
- `DIM_Usuario` en el DW nunca tuvo datos personales (solo una llave sustituta), así que no requiere acción.
- Las filas de `RecomendacionResult`/`DetalleRecomendacion` y su reflejo en `FACT_Recomendacion` **se conservan intactas**, ahora vinculadas a un perfil anonimizado.
- Plazo: la anonimización ocurre dentro de las **72 horas** siguientes a la solicitud de baja de cuenta.
- Excepción documentada a la regla "no UPDATE en tablas inmutables": ninguna, porque `PerfilUsuario` nunca fue declarado inmutable; solo `RecomendacionResult` y `DetalleRecomendacion` lo son, y esos no se tocan.

### 2.6 Lista negra ampliada de CI para migraciones (autoridad: Parte 1, §4.2, ampliada)

El escaneo de migraciones en CI falla ante cualquiera de estos patrones (además de `DROP`, `TRUNCATE`, `DropColumn` ya definidos en la Parte 1):
- `DISABLE TRIGGER` / `ENABLE REPLICA` sobre las tablas inmutables.
- `DISABLE ROW LEVEL SECURITY` o `NO FORCE ROW LEVEL SECURITY`.
- `ALTER ... OWNER TO` que cambie el dueño de una tabla o función fuera de lo definido en §2.3.
- Cualquier `GRANT` que otorgue `BYPASSRLS` o privilegios DDL a `app_rw`, `etl_runner` o `dw_reader`.
- `REVOKE` sobre las políticas RLS de §2.2.

---

## 2.7 Historias base del backlog original (Actividad 3), ratificadas

> **Nota de procedencia (confirmada por el Squad):** HU-C07 y HU-C08 (§3) citan HU-C01, HU-C02, HU-C04 y HU-C06 como dependencias. Se confirmó que el backlog original de la Actividad 3 (HU-01, HU-02, HU-04 y HU-05) **es la única fuente real** de esas historias; no existe un documento aparte con numeración `HU-C0x` que las redacte de otro modo. Esta sección traduce esas cuatro historias a Given/When/Then y las alinea con las decisiones ya ratificadas de este documento (D-5, D-6, D-26, D-33). **Esta es su versión oficial y definitiva**; ya no está sujeta a reemplazo por otro documento.

### HU-C01: Carga de catálogo de planes — 5 SP (propuesta)
**Como** Administrador, **quiero** cargar el catálogo de planes y precios de los proveedores, **para** que el sistema cuente con información actualizada de la oferta disponible. *(Fuente: Actividad 3, HU-01.)*
1. El formulario registra, como mínimo: nombre del plan, proveedor, precio mensual, velocidad (Mbps), límite de datos, `indiceEstabilidad` (D-33/D-35) y el estado `activo` (por defecto `true` al crear, D-26).
2. El sistema rechaza el guardado si falta algún campo obligatorio, con el error específico de cada campo (no un mensaje genérico).
3. El sistema impide duplicar un plan: mismo `proveedor` + `nombrePlan` ya existente (sin distinguir mayúsculas) produce "Ya existe un plan con ese nombre para este proveedor." y no se guarda.
4. Un plan recién creado queda disponible como candidato en el siguiente cálculo de Top 3 (§3.1), sujeto a que su proveedor tenga cobertura registrada en al menos una zona (D-6).

**Tablas:** `PlanTelecomunicacion`. **Estimación:** 5 SP (propuesta).

### HU-C02: Carga de cobertura por zona — 3 SP (propuesta)
**Como** Administrador, **quiero** cargar el nivel de cobertura de cada proveedor por zona, **para** que las recomendaciones reflejen la disponibilidad real del servicio. *(Fuente: Actividad 3, HU-02.)*
1. El sistema permite asociar un nivel de cobertura (`alta`/`media`/`baja`) a cada combinación de zona y proveedor.
2. El sistema muestra una confirmación al guardar los datos de cobertura.
3. Un proveedor **sin fila de cobertura** registrada en una zona queda excluido de los candidatos en esa zona (D-6): no se trata como "baja".
4. Cambiar el nivel de cobertura de una combinación zona-proveedor **no** modifica recomendaciones históricas (los snapshots de `DetalleRecomendacion` ya están fijados, §5.1); solo afecta cálculos futuros.

**Tablas:** `ZonaCobertura`. **Depende de:** HU-C10 (zonas activas). **Estimación:** 3 SP (propuesta).

### HU-C04: Perfil del usuario (ubicación, uso, presupuesto) — 3 SP (propuesta)
**Como** Usuario/PYME, **quiero** ingresar mi ubicación, tipo(s) de uso y presupuesto, **para** que el sistema genere una recomendación personalizada. *(Fuente: Actividad 3, HU-04, con el rango de presupuesto ya fijado por D-18.)*
1. El sistema exige seleccionar una zona **activa** (D-26) como ubicación; una zona inexistente o inactiva produce el error 422 de §3.1.5 (no de este formulario).
2. El sistema valida que el presupuesto sea un número entre 1,00 y 10.000,00 Bs, hasta 2 decimales (D-18); un valor fuera de rango muestra el error de campo, no un mensaje genérico.
3. El sistema exige la selección de al menos un tipo de uso (streaming, gaming, teletrabajo, u otro de la lista predefinida).
4. Con dos o más tipos de uso seleccionados, el perfil queda categorizado como `Mixto` para efectos del ETL (§6, regla 3).

**Tablas:** `PerfilUsuario`. **Depende de:** HU-C10 (zonas activas). **Estimación:** 3 SP (propuesta).

### HU-C06 (historia base + ajustes ya vigentes): Guardar perfil y trazabilidad del cálculo — 5 SP (propuesta)
**Como** Usuario/PYME, **quiero** guardar mi perfil y que cada recomendación registre cómo se calculó, **para** no reingresar mis datos en consultas futuras y poder auditar el resultado. *(Fuente: Actividad 3, HU-05, fusionada con los "ajustes" ya definidos en el addendum de la Parte 2 para `RecomendacionResult`.)*
1. El sistema conserva el perfil guardado (ubicación, tipos de uso, presupuesto, criterios y pesos) entre sesiones del mismo usuario.
2. El usuario puede editar su perfil guardado en cualquier momento; editarlo **no** modifica recomendaciones ya generadas.
3. Cada `RecomendacionResult` guarda, además de lo ya definido en §3.1.6: `versionAlgoritmo` (ej. `SAW-1.0`), `presupuestoUsado` y los pesos usados en ese cálculo específico (no una referencia al perfil actual, que puede haber cambiado después).
4. Una simulación (§3.3) guarda adicionalmente `tipoSimulacion`, `criterioModificado` (o `NULL` si fue de presupuesto) y los valores originales frente a los simulados, tal como se define en §5.1.

**Tablas:** `PerfilUsuario`, `CriterioPonderacion`, `RecomendacionResult`. **Depende de:** HU-C04, HU-C05. **Estimación:** 5 SP (propuesta).

---

## 3. Motor analítico SAW: contrato reconciliado

Autoridad: Parte 1, HU-C07 y HU-C08, con las correcciones marcadas en el registro de reconciliación. **Nunca se seleccionan 4 criterios** (D-2/HU-C05: entre 2 y 3 de los 4).

### 3.1 HU-C07: Generar el Top 3

**Como** Usuario/PYME, **quiero** obtener un Top 3 de planes según mi perfil y mis criterios, **para** decidir con un desglose objetivo del puntaje.

1. **Candidatos:** planes con `activo = true`, cuyo proveedor tiene cobertura registrada en la zona del perfil, con `precioMensual <= presupuesto` (D-5: filtro duro, sin penalización) y proveedor con cobertura registrada en la zona (D-6: sin registro de cobertura = excluido, no tratado como "baja").
2. **Normalización min-max** sobre el conjunto de candidatos, resultado en [0, 1] (ambos extremos inclusive):
   - Precio (costo): `(max - x) / (max - min)`.
   - Velocidad (beneficio, en Mbps): `(x - min) / (max - min)`.
   - Cobertura (escala fija, no min-max): alta = 1,00; media = 0,50; baja = 0,00.
   - Estabilidad: `indiceEstabilidad / 100`, con `indiceEstabilidad` un entero de 0 a 100 que se agrega como atributo de `PlanTelecomunicacion` **[D-33, ratificada]**: se carga **manualmente por el Administrador** al crear o editar el plan (respuesta del Squad a la pregunta abierta #10, §10) — no existe en el modelo de la Actividad 6 y debe incorporarse por migración antes de implementar esta historia. Queda fuera del MVP derivarlo de un histórico de incidencias del proveedor.
   - **Si `max = min` en un criterio (precio o velocidad), todos los candidatos reciben 1,00 en ese criterio** (regla explícita: no se divide por cero, y no premiar ni penalizar cuando no hay variación).
3. **Puntaje** = Σ (peso × valor normalizado), calculado y redondeado con `decimal` (**nunca `double`**) a **4 decimales**, con redondeo **half-up** (`MidpointRounding.AwayFromZero` o equivalente en SQL). Los valores normalizados individuales también se redondean a 4 decimales antes de multiplicar por el peso, para que el desglose por criterio sea reproducible de forma independiente.
4. **Desempate**, en este orden: (1) menor `precioMensual`; (2) mayor `indiceEstabilidad`; (3) menor `idPlan`. (Corregido respecto a mi versión anterior, que usaba velocidad en el segundo lugar; la Parte 1 usa estabilidad.)
5. **Casos borde:**
   - 0 candidatos: mensaje "No hay planes disponibles en tu zona para ese presupuesto."; **no se persiste nada**.
   - 1 o 2 candidatos: se devuelven y persisten los que haya, con aviso "Solo se encontraron N planes que cumplen tus criterios."
6. **Persistencia**, en una sola transacción: un `RecomendacionResult` (con `versionAlgoritmo`, `presupuestoUsado`, los pesos usados a 2 decimales) y hasta 3 `DetalleRecomendacion` (posición, puntaje total, puntaje parcial por criterio, snapshot de precio y velocidad).
7. **Arquitectura:** el cálculo (candidatos → normalización → puntaje → orden) es una **función pura** en la capa de servicios: recibe candidatos y pesos, sin acceso a base de datos ni a `HttpContext`. Verificado por una prueba de `NetArchTest` que falla si una vista o un controlador referencia directamente las clases de cálculo.
8. Cumple RNF-01 (§7).
9. El ejemplo oráculo de §6 es un conjunto de pruebas xUnit obligatorio; ninguna PR que toque el motor se aprueba sin que las 4 tablas del oráculo pasen.

**Tablas afectadas:** `PlanTelecomunicacion` (+`indiceEstabilidad`, `activo`), `ZonaCobertura`, `PerfilUsuario`, `CriterioPonderacion`, `RecomendacionResult`, `DetalleRecomendacion`.
**Dependencias:** HU-C01, HU-C02, HU-C04 (§2.7), HU-C05 (§3.2). **Estimación:** 8 SP (propuesta).

### 3.2 HU-C05: Criterios y pesos (ROC)

**Como** Usuario/PYME, **quiero** seleccionar entre 2 y 3 de los 4 criterios y ordenarlos por importancia, **para** que el ranking refleje mis preferencias.

1. El sistema impide continuar con menos de 2 o más de 3 criterios seleccionados.
2. Pesos por **ROC**, tabla fija a 2 decimales (verificada en §6.0):

   | Criterios elegidos | Peso 1.º | Peso 2.º | Peso 3.º |
   |---|---|---|---|
   | 2 | 0,75 | 0,25 | n/a |
   | 3 | 0,61 | 0,28 | 0,11 |

3. Los criterios no seleccionados reciben peso `0,00`.
4. Los pesos suman **exactamente 1,00**, verificado con `decimal` (nunca `double`); una prueba unitaria falla si la suma no es exacta.

**Tablas afectadas:** `CriterioPonderacion` (`idPerfil`, `criterio`, `orden`, `peso numeric(3,2)`). **Estimación:** 3 SP (propuesta).

### 3.3 HU-C08: Simular un escenario

**Como** Usuario/PYME, **quiero** ajustar una variable de mi recomendación y ver el ranking recalculado, **para** entender cómo cambia mi resultado sin perder la consulta original.

1. Una simulación modifica **exactamente una variable** (D-4): (a) el peso de un criterio seleccionado, **o** (b) el presupuesto máximo. Nunca ambas.
2. **Previsualización:** cada movimiento de slider o cambio de presupuesto se recalcula en el servidor y **no escribe en la base de datos**. Es ilimitada; es lo que mide RNF-02.
3. **Ajuste de peso:** el slider va de 0,05 a 0,95 en pasos de 0,05, solo sobre criterios seleccionados. Los demás criterios seleccionados se reescalan proporcionalmente:

   `w_i' = round(w_i × (1 − w_nuevo) / (1 − w_original), 2)`

   El residuo de redondeo (para que la suma sea exactamente 1,00) se asigna al criterio con mayor peso resultante entre los reescalados; en empate, al de **menor código de criterio** (orden fijo: Precio < Velocidad < Cobertura < Estabilidad). Los criterios no seleccionados permanecen en 0,00. Verificado por 95 casos de prueba (todas las combinaciones de 2 y 3 criterios × pasos de 0,05) — ver §6.1.
4. **Ajuste de presupuesto:** número con hasta 2 decimales, `1,00 ≤ presupuesto ≤ 10.000,00` Bs/mes **[D-18]**, ambos extremos inclusive. Se recalculan candidatos y normalización desde cero (el conjunto de candidatos puede cambiar).
5. **Confirmar simulación:** el servidor **recalcula** (nunca persiste lo que envía el cliente) y crea un nuevo `RecomendacionResult` con `esSimulacion = true`, `idRecomendacionOrigen`, `tipoSimulacion` (`PESO` o `PRESUPUESTO`), `criterioModificado` (el criterio cuyo peso cambió; `NULL` si `tipoSimulacion = PRESUPUESTO`), y los pesos/presupuesto originales frente a los simulados. **La recomendación original nunca se modifica.**
6. **Solo se permite una simulación confirmada por recomendación original (D-3):** restricción única parcial `UNIQUE (idRecomendacionOrigen) WHERE esSimulacion` en `RecomendacionResult`. Un segundo intento de confirmación **captura la violación de restricción única** en la capa de aplicación y muestra "Ya existe una simulación para esta recomendación." sin propagar el error de base de datos al usuario.
7. `idRecomendacionOrigen` **siempre** apunta a una recomendación **no simulada**. Se garantiza con un `CHECK` que valida contra una columna desnormalizada `esSimulacionOrigen` copiada por trigger `BEFORE INSERT` desde la fila referenciada (un `CHECK` simple no puede consultar otra fila; hace falta el trigger).
8. Si la simulación deja 0 candidatos, se muestra el mensaje de §3.1.5 y el botón "Confirmar" queda deshabilitado.
9. Se muestra una vista comparativa lado a lado: original frente a simulado.

**Tablas afectadas:** `RecomendacionResult` (+`tipoSimulacion`, `criterioModificado`, `presupuestoUsado`, `esSimulacionOrigen`), `DetalleRecomendacion`, `CriterioPonderacion`.
**Dependencias:** HU-C06, HU-C07. **Estimación:** 8 SP (propuesta).

---

## 4. Ejemplo oráculo (datos ficticios, verificado con `Decimal` de precisión arbitraria)

Todos los valores de esta sección fueron recalculados en Python con `decimal.Decimal` y redondeo half-up antes de publicarse; ninguno es estimado.

### 4.0 Verificación de la tabla de pesos ROC

Fórmula ROC exacta para *n* criterios: `w_i = (1/n) · Σ_{k=i}^{n} 1/k`.

| n | Pesos exactos (4 decimales) | Redondeados a 2 decimales (D-2) | Suma a 2 decimales |
|---|---|---|---|
| 2 | 0,7500 / 0,2500 | 0,75 / 0,25 | 1,00 ✓ |
| 3 | 0,6111 / 0,2778 / 0,1111 | 0,61 / 0,28 / 0,11 | 1,00 ✓ |

La tabla de HU-C05 coincide con la fórmula ROC. (4 criterios no se calculan: D-2 limita la selección a 2 o 3.)

### 4.1 Caso 1 (el de la Parte 1): recomendación original y su simulación de peso

**Perfil:** presupuesto 150 Bs; criterios en orden Precio, Velocidad, Cobertura → pesos 0,61 / 0,28 / 0,11 (Estabilidad = 0,00).

| Plan | Precio (Bs) | Velocidad (Mbps) | Cobertura | Estabilidad | idPlan |
|---|---|---|---|---|---|
| A | 100 | 100 | alta | 90 | 1 |
| B | 80 | 50 | media | 80 | 2 |
| C | 120 | 200 | alta | 70 | 3 |
| D | 200 | 300 | alta | 95 | 4 |
| E | 60 | 30 | baja | 60 | 5 |

D se excluye (200 > 150). Candidatos A, B, C, E. Precio ∈ [60, 120]; velocidad ∈ [30, 200].

| Plan | n(precio) | n(velocidad) | n(cobertura) | Puntaje | Posición |
|---|---|---|---|---|---|
| E | 1,0000 | 0,0000 | 0,00 | **0,6100** | 1 |
| B | 0,6667 | 0,1176 | 0,50 | **0,4946** | 2 |
| A | 0,3333 | 0,4118 | 1,00 | **0,4286** | 3 |
| C | 0,0000 | 1,0000 | 1,00 | 0,3900 | fuera del Top 3 |

**Simulación de peso** (Precio 0,61 → 0,30): Velocidad = round(0,28 × 0,70/0,39, 2) = 0,50; Cobertura = round(0,11 × 0,70/0,39, 2) = 0,20. Suma = 1,00.

| Plan | Puntaje simulado | Posición |
|---|---|---|
| C | **0,7000** | 1 |
| A | **0,5059** | 2 |
| B | **0,3588** | 3 |
| E | 0,3000 | fuera del Top 3 |

### 4.2 Caso 2 (nuevo): estabilidad activa y desempate real

**Perfil:** presupuesto 200 Bs; criterios Estabilidad, Precio → pesos 0,75 / 0,25.

| Plan | Precio | Velocidad | Cobertura | Estabilidad | idPlan |
|---|---|---|---|---|---|
| Q | 100 | 100 | alta | 80 | 7 |
| P | 100 | 150 | media | 80 | 12 |
| R | 150 | 120 | alta | 90 | 3 |
| S | 200 | 300 | alta | 60 | 9 |

Todos con `precio ≤ 200`: 4 candidatos. Precio ∈ [100, 200].

| Plan | n(precio) | n(estabilidad) | Puntaje | Empate con | Desempate | Posición |
|---|---|---|---|---|---|---|
| Q | 1,0000 | 0,80 | **0,8500** | P (mismo puntaje) | precio igual (100=100) → estabilidad igual (80=80) → `idPlan` 7 < 12 | **1** |
| P | 1,0000 | 0,80 | **0,8500** | Q | — | **2** |
| R | 0,5000 | 0,90 | **0,8000** | — | — | 3 |
| S | 0,0000 | 0,60 | 0,4500 | — | — | fuera del Top 3 |

Este caso ejercita los **tres niveles de desempate**: precio, luego estabilidad, luego `idPlan`, y confirma que Q y P (idéntico puntaje, idéntico precio, idéntica estabilidad) se resuelven únicamente por `idPlan`.

### 4.3 Caso 3 (nuevo): `max = min` con solo 2 candidatos

**Perfil:** presupuesto 90 Bs; criterios Velocidad, Cobertura → pesos 0,75 / 0,25.

| Plan | Precio | Velocidad | Cobertura | idPlan |
|---|---|---|---|---|
| F | 90 | 100 | alta | 21 |
| G | 90 | 100 | baja | 22 |
| H | 95 | 100 | alta | 23 |

H se excluye (95 > 90). Candidatos F, G: **precio y velocidad idénticos** entre ambos (`max = min` en ambos criterios) → n(velocidad) = 1,00 para los dos, por la regla de §3.1.2.

| Plan | n(velocidad) | n(cobertura) | Puntaje | Posición |
|---|---|---|---|---|
| F | 1,0000 | 1,00 | **1,0000** | 1 |
| G | 1,0000 | 0,00 | **0,7500** | 2 |

Confirma la regla `max = min ⇒ 1,00 para todos`, y que con solo 2 candidatos se persisten 2 filas con el aviso de §3.1.5.

### 4.4 Caso 4 (nuevo): simulación de **presupuesto** (no de peso)

Mismo perfil y catálogo del Caso 1 (pesos 0,61/0,28/0,11), simulando `tipoSimulacion = PRESUPUESTO`.

**Presupuesto simulado a 200 Bs** (ahora entra D, con precio 200 = presupuesto, límite inclusive):

| Plan | Puntaje | Posición |
|---|---|---|
| C | **0,6349** | 1 |
| A | **0,6183** | 2 |
| E | **0,6100** | 3 |
| B | 0,5986 | fuera del Top 3 |
| D | 0,3900 | fuera del Top 3 |

**Presupuesto simulado a 90 Bs** (ahora solo quedan B y E como candidatos, A/C/D se excluyen):

| Plan | Puntaje | Posición |
|---|---|---|
| E | **0,6100** | 1 |
| B | **0,3350** | 2 |

Confirma: (a) el presupuesto exactamente igual al precio de un plan lo incluye (`<=`, no `<`); (b) `tipoSimulacion = PRESUPUESTO` deja `criterioModificado = NULL`; (c) el conjunto de candidatos y los rangos min-max se recalculan por completo, no se reutilizan del original.

### 4.5 Verificación de la fórmula de reescalado de pesos (§3.3.3)

Se probaron las **95 combinaciones posibles** (selección de 2 y de 3 criterios × 19 valores de `w_nuevo` de 0,05 a 0,95 en pasos de 0,05): en las 95, la suma reescalada da exactamente 1,00 y ningún criterio seleccionado queda en 0 o negativo. 0 fallos.

---

## 5. Contrato de datos del Data Warehouse (ajustado a pesos de 2 decimales)

### 5.1 Enmienda al esquema `oltp`

**`RecomendacionResult`**

| Columna | Tipo | Nota |
|---|---|---|
| `fechaCalculo` | `timestamptz` | UTC, asignada por la base con `now()`. |
| `idZona`, `idPerfil`, `idAlgoritmo` | FK | Zona de la consulta; versión del algoritmo (`SAW-1.0`). |
| `presupuestoUsado` | `numeric(10,2)` | Bs/mes, 1,00 a 10.000,00 (D-18). |
| `pesoPrecio`, `pesoVelocidad`, `pesoCobertura`, `pesoEstabilidad` | **`numeric(3,2)`** | 2 decimales, suma exacta 1,00 (corrección respecto a mi versión anterior). |
| `esSimulacion` | `boolean` | |
| `esSimulacionOrigen` | `boolean` | Copiada por trigger desde la fila referenciada (§3.3.7); `false` en toda fila no simulada. |
| `tipoSimulacion` | `text` null | `PESO` o `PRESUPUESTO` (D-4: nunca ambas). |
| `criterioModificado` | `text` null | Nulo si `tipoSimulacion = PRESUPUESTO`. |
| `idRecomendacionOrigen` | FK null | Solo en simulaciones; DEBE apuntar a una fila con `esSimulacionOrigen = false`. |

Restricción: `UNIQUE (idRecomendacionOrigen) WHERE esSimulacion` (D-3: máximo 1 simulación confirmada por original).

**`DetalleRecomendacion`**

| Columna | Tipo | Nota |
|---|---|---|
| `posicion` | `smallint` | 1 a 3, única por recomendación. |
| `puntajeTotal` | `numeric(5,4)` | 0 a 1 inclusive (el puntaje sí necesita 4 decimales para el desempate; los **pesos** que lo producen son de 2). |
| `puntajePrecio`, `puntajeVelocidad`, `puntajeCobertura`, `puntajeEstabilidad` | `numeric(5,4)` | Aporte ponderado por criterio. |
| `precioSnapshot`, `velocidadSnapshot` | `numeric(10,2)` | Copiados en el momento del cálculo, nunca leídos después desde el catálogo. |

**`PlanTelecomunicacion`**: agregar `indiceEstabilidad smallint CHECK (BETWEEN 0 AND 100)` (D-33) y `activo boolean`. **`ZonaCobertura` / `Zona`**: `activo boolean` (baja lógica, D-26: sin borrado físico, siempre reactivable).

### 5.2 Grano e invariantes de `FACT_Recomendacion`

Una fila por plan dentro del Top 3 de una recomendación (1 a 3 filas), incluida como máximo 1 simulación confirmada por original (D-3).

| Columna | Tipo | Nota |
|---|---|---|
| `idFact` | bigint PK | |
| `idDetalle_nk` | bigint UNIQUE | Garantiza idempotencia del ETL. |
| `idRecomendacion_nk`, `idRecomendacionOrigen_nk` | bigint | |
| `sk_tiempo`, `sk_usuario`, `sk_plan`, `sk_zona`, `sk_segmento` | int FK | `sk_zona` = zona de la consulta. |
| `sk_criterio_modificado` | smallint FK | `0` = Ninguno (originales y simulaciones de presupuesto). |
| `posicion`, `puntajeTotal`, `puntaje{Precio,Velocidad,Cobertura,Estabilidad}` | | |
| `pesoPrecio`, `pesoVelocidad`, `pesoCobertura`, `pesoEstabilidad` | **`numeric(3,2)`** | Ajustado a 2 decimales. |
| `precioSnapshot`, `velocidadSnapshot`, `presupuestoUsado` | | |
| `esSimulacion` | boolean | |
| `tipoSimulacion` | text null | `PESO` o `PRESUPUESTO` (nunca `AMBOS`: se elimina ese valor respecto a mi versión anterior). |
| `versionAlgoritmo`, `fechaCalculo`, `idCorrida` | | |

**Invariantes (`CHECK`):**
1. `NOT esSimulacion ⇒ idRecomendacionOrigen_nk IS NULL ∧ tipoSimulacion IS NULL ∧ sk_criterio_modificado = 0`.
2. `esSimulacion ⇒ idRecomendacionOrigen_nk IS NOT NULL ∧ tipoSimulacion IS NOT NULL`.
3. `tipoSimulacion = 'PRESUPUESTO' ⇒ sk_criterio_modificado = 0`.
4. `tipoSimulacion = 'PESO' ⇒ sk_criterio_modificado BETWEEN 1 AND 4`.
5. `posicion BETWEEN 1 AND 3`; único el par (`idRecomendacion_nk`, `posicion`).
6. `pesoPrecio + pesoVelocidad + pesoCobertura + pesoEstabilidad = 1.00` **exacto** (no tolerancia; corregido respecto a mi versión anterior).
7. `ABS(puntajeTotal − (puntajePrecio + puntajeVelocidad + puntajeCobertura + puntajeEstabilidad)) ≤ 0,0005` (aquí sí se tolera, por el redondeo del puntaje a 4 decimales frente a pesos de 2).

### 5.3 Dimensiones

Sin cambios respecto a mi propuesta anterior salvo lo ya corregido: `DIM_Tiempo`, `DIM_Usuario` (solo llave seudónima, sin datos personales, §2.5), `DIM_Plan` (SCD1, sin precio/velocidad), `DIM_Zona` (SCD1, cobertura predominante recalculada), `DIM_Segmento` (categoría de presupuesto y de uso), `DIM_Criterio` (0 Ninguno, 1 Precio, 2 Velocidad, 3 Cobertura, 4 Estabilidad), `dw.etl_bitacora`, `dw.etl_rechazo`.


## 6. Proceso ETL

**Ejecución:** función SQL `SECURITY DEFINER`, dueño y ejecutor **`etl_runner`** (corregido, §2.3), `SET search_path` fijo, agendada con `pg_cron` a las `0 6 * * *` (06:00 UTC = 02:00 en Bolivia).

**Pasos:**
1. `pg_try_advisory_lock`. Si no se obtiene, se registra una corrida `OMITIDA` con el mensaje "corrida concurrente" y se termina sin tocar datos.
2. `watermark_desde` = `watermark_hasta` de la última corrida `OK` o `ALERTA` (`ERROR`/`OMITIDA` no cuentan; la primera corrida usa `-infinity`). `cutoff` = inicio de la corrida menos 5 minutos. **Lectura con solape de 24 h:** `fechaCalculo > watermark_desde − 24h AND fechaCalculo <= cutoff` — el solape existe porque `now()` de PostgreSQL es el inicio de la transacción, así que una transacción larga puede confirmarse después del `cutoff` con una `fechaCalculo` anterior a él; la carga es idempotente, así que el solape no duplica.
3. Leer `DetalleRecomendacion` unido a `RecomendacionResult` en esa ventana.
4. Actualizar `DIM_Usuario`, `DIM_Plan`, `DIM_Zona`, `DIM_Segmento` (*upsert*).
5. Transformar con las reglas de abajo, validar, enviar inválidos a `etl_rechazo`.
6. Insertar en el hecho con `ON CONFLICT (idDetalle_nk) DO NOTHING`; lo ya cargado cuenta como `filas_omitidas`.
7. Cerrar la bitácora con la conciliación (RNF-04). Todo en **una transacción**; ante excepción, rollback, estado `ERROR`, el watermark no avanza.

**Reglas de transformación:**
1. **Explosión:** cada `DetalleRecomendacion` produce una fila de hechos.
2. **Snapshot:** `precioSnapshot`/`velocidadSnapshot` se copian de `DetalleRecomendacion`, nunca de `PlanTelecomunicacion`.
3. **Categorización (`DIM_Segmento`):**
   - Presupuesto (Bs) **[D-31, propuesta]**: `Bajo` < 120; `Medio` 120–200 inclusive; `Alto` > 200. Recalibrar por release con los percentiles P33/P66 del catálogo real.
   - Uso: 1 tipo en `tiposUsoSnapshot` → ese tipo; 2 o más → `Mixto`.
4. **Cobertura predominante por zona:** moda de los niveles de `ZonaCobertura`; empate → el nivel más bajo; sin filas → `sin_datos`.
5. **Tiempo:** `sk_tiempo` derivado de `fechaCalculo` en zona horaria `America/La_Paz`, no UTC.
6. **Simulaciones:** se cargan `esSimulacion`, `tipoSimulacion`, `criterioModificado`, `idRecomendacionOrigen_nk`. `sk_criterio_modificado` = el `criterioModificado` de la fila (ya no se calcula por diferencia de pesos, porque ahora la simulación solo puede tocar un criterio a la vez — se simplifica respecto a mi versión anterior).

**Rechazo si:** no resuelve alguna dimensión; `posicion` fuera de 1–3; `puntajeTotal` fuera de [0,1]; `precioSnapshot`/`presupuestoUsado` ≤ 0; viola algún invariante de §5.2; campo obligatorio nulo.

---

## 7. Definición de los KPIs

Leen solo `dw` con `dw_reader`. Filtro de fechas sobre `DIM_Tiempo.fecha` (KPI 3: fecha de la recomendación **original**). Rango por defecto: 30 días; máximo 366 días. `:zona` filtra por la zona de la consulta.

**Frescura:** "Datos al: <fin de la última corrida OK/ALERTA>"; si supera 26 h, se muestra "Datos desactualizados" (RNF-09).

### HU-D01: KPI de precio y velocidad por proveedor y mes — 3 SP (propuesta)
**Como** Gerente, **quiero** ver el precio y la velocidad promedio del Top 3 por proveedor y mes, **para** entender qué ofertas está recomendando el sistema.
1. **Dado** un rango de fechas válido, **cuando** abro el KPI, **entonces** veo una fila por proveedor y mes, con precio y velocidad promedio, calculados solo sobre recomendaciones originales (D-7).
2. **Dado** un filtro de zona, **cuando** lo aplico, **entonces** los promedios se recalculan solo con las recomendaciones de esa zona.
3. **Dado** un rango sin recomendaciones, **cuando** abro el KPI, **entonces** veo "Sin datos para el periodo seleccionado", sin filas vacías ni error.
4. **Dado** cualquier vista del KPI, **entonces** veo la leyenda "Datos al: <fecha y hora de la última corrida `OK`/`ALERTA`>" (§7, frescura), y si esa corrida supera 26 h, veo además "Datos desactualizados".
5. **Dado** un rango mayor a 366 días, **cuando** lo solicito, **entonces** el sistema lo rechaza y pide un rango menor.

**Tablas:** `dw.fact_recomendacion`, `dw.dim_plan`, `dw.dim_tiempo`. **Depende de:** ETL en operación (§6). **Estimación:** 3 SP (propuesta).

**KPI 1 (HU-D01):** precio y velocidad promedio del Top 3, por proveedor y mes. Solo originales (`NOT esSimulacion`, D-7).
```sql
SELECT p.proveedor, t.anio, t.mes,
       AVG(f.precioSnapshot) AS precio_prom, AVG(f.velocidadSnapshot) AS velocidad_prom
FROM dw.fact_recomendacion f
JOIN dw.dim_plan p ON p.sk_plan = f.sk_plan
JOIN dw.dim_tiempo t ON t.sk_tiempo = f.sk_tiempo
WHERE NOT f.esSimulacion AND t.fecha BETWEEN :desde AND :hasta
  AND (:zona IS NULL OR f.sk_zona = :zona)
GROUP BY p.proveedor, t.anio, t.mes ORDER BY t.anio, t.mes, p.proveedor;
```

### HU-D02: KPI de zona con más recomendaciones — 3 SP (propuesta)
**Como** Gerente, **quiero** saber qué zona concentra más recomendaciones y su puntaje global promedio, **para** priorizar dónde reforzar cobertura o negociar con proveedores.
1. **Dado** un periodo sin filtro de zona, **cuando** abro el KPI, **entonces** veo las zonas ordenadas de mayor a menor número de recomendaciones, cada una con su puntaje global promedio (posición 1) y su % del total; la primera fila es la zona con más recomendaciones.
2. **Dado** un filtro de zona, **cuando** lo aplico, **entonces** veo esa zona con su % **sobre el total del periodo sin filtrar** (D-12): nunca 100%, salvo que sea la única zona con recomendaciones en el periodo.
3. **Dado** dos zonas con igual número de recomendaciones, **cuando** se ordenan, **entonces** se desempatan alfabéticamente por nombre de zona.
4. **Dado** un rango sin datos, **cuando** abro el KPI, **entonces** veo "Sin datos para el periodo seleccionado".
5. **Dado** cualquier vista del KPI, **entonces** veo un texto de ayuda fijo: *"El puntaje se normaliza contra los planes disponibles en cada consulta; comparar promedios entre zonas con pocos datos puede no ser representativo."* (limitación declarada en §7).

**Tablas:** `dw.fact_recomendacion`, `dw.dim_zona`, `dw.dim_tiempo`. **Estimación:** 3 SP (propuesta).

**KPI 2 (HU-D02):** zona con más recomendaciones y puntaje global promedio (`posicion = 1`). Solo originales (D-7).
```sql
WITH base AS (
  SELECT f.sk_zona, COUNT(DISTINCT f.idRecomendacion_nk) AS n,
         AVG(f.puntajeTotal) FILTER (WHERE f.posicion = 1) AS puntaje
  FROM dw.fact_recomendacion f
  JOIN dw.dim_tiempo t ON t.sk_tiempo = f.sk_tiempo
  WHERE NOT f.esSimulacion AND t.fecha BETWEEN :desde AND :hasta
  GROUP BY f.sk_zona
), pct AS (
  SELECT b.*, b.n::numeric / NULLIF(SUM(b.n) OVER (), 0) AS pct_total FROM base b
)
SELECT z.nombreZona, p.n AS recomendaciones, p.puntaje AS puntaje_global_prom, p.pct_total
FROM pct p JOIN dw.dim_zona z ON z.sk_zona = p.sk_zona
WHERE (:zona IS NULL OR p.sk_zona = :zona)
ORDER BY p.n DESC, z.nombreZona;
```
**Limitación declarada:** el puntaje se normaliza por conjunto de candidatos de cada consulta (min-max relativo), así que promediarlo entre consultas con conjuntos distintos es un indicador aproximado, no una medida absoluta comparable. El dashboard lo declara en un texto de ayuda.

### HU-D03: KPI de simulaciones y criterio más modificado — 5 SP (propuesta)
**Como** Gerente, **quiero** ver qué porcentaje de recomendaciones se simuló y qué criterio se modificó más, por rango de presupuesto, **para** entender cómo ajustan sus decisiones los usuarios y qué tan sensibles son a precio, velocidad, cobertura o estabilidad.
1. **Dado** un periodo, **cuando** abro el KPI, **entonces** veo, por cada rango de presupuesto (Bajo/Medio/Alto, D-31), el número de originales, el número con simulación confirmada y el `% simuladas` (denominador = todas las originales del segmento, D-19/§7).
2. **Dado** un rango con al menos una simulación de tipo `PESO`, **cuando** lo veo, **entonces** aparece el criterio más modificado de ese rango (o "Ninguno" si `tipoSimulacion` fue solo `PRESUPUESTO` en ese rango).
3. **Dado** un rango sin ninguna simulación, **cuando** lo veo, **entonces** el `% simuladas` muestra 0% y el criterio más modificado muestra "Sin simulaciones", sin error de división.
4. **Dado** simulaciones de tipo `PRESUPUESTO`, **cuando** las veo, **entonces** se reportan en un conteo aparte por rango, sin mezclarse con el conteo de criterio modificado.
5. **Dado** cualquier vista del KPI, **entonces** veo la nota fija: *"Incluye solo simulaciones confirmadas (D-19); no cuenta las previsualizaciones sin confirmar."*

**Tablas:** `dw.fact_recomendacion`, `dw.dim_segmento`, `dw.dim_criterio`. **Estimación:** 5 SP (propuesta).

**KPI 3 (HU-D03), corregido según la fórmula de la Parte 1** (más simple que mi versión anterior, porque D-3/D-4 ya garantizan a lo sumo 1 simulación por original y una sola variable modificada):
```sql
WITH orig AS (
  SELECT DISTINCT f.idRecomendacion_nk, f.sk_segmento
  FROM dw.fact_recomendacion f JOIN dw.dim_tiempo t ON t.sk_tiempo = f.sk_tiempo
  WHERE NOT f.esSimulacion AND t.fecha BETWEEN :desde AND :hasta
    AND (:zona IS NULL OR f.sk_zona = :zona)
), sim AS (
  SELECT DISTINCT idRecomendacionOrigen_nk, tipoSimulacion, sk_criterio_modificado
  FROM dw.fact_recomendacion WHERE esSimulacion
)
-- 7a. % simuladas por rango de presupuesto (denominador = TODAS las originales del segmento)
SELECT g.categoriaPresupuesto,
       COUNT(DISTINCT o.idRecomendacion_nk) AS originales,
       COUNT(DISTINCT s.idRecomendacionOrigen_nk) AS con_simulacion,
       COUNT(DISTINCT s.idRecomendacionOrigen_nk)::numeric
         / NULLIF(COUNT(DISTINCT o.idRecomendacion_nk), 0) AS pct_simuladas
FROM orig o JOIN dw.dim_segmento g ON g.sk_segmento = o.sk_segmento
LEFT JOIN sim s ON s.idRecomendacionOrigen_nk = o.idRecomendacion_nk
GROUP BY g.categoriaPresupuesto;
```
```sql
-- 7b. Criterio más modificado (frecuencia, solo tipoSimulacion = 'PESO'; empate: menor sk_criterio)
SELECT categoriaPresupuesto, criterio, n_simulaciones FROM (
  SELECT g.categoriaPresupuesto, c.nombre AS criterio,
         COUNT(*) AS n_simulaciones,
         ROW_NUMBER() OVER (PARTITION BY g.categoriaPresupuesto
           ORDER BY COUNT(*) DESC, c.sk_criterio) AS rk
  FROM orig o JOIN dw.dim_segmento g ON g.sk_segmento = o.sk_segmento
  JOIN sim s ON s.idRecomendacionOrigen_nk = o.idRecomendacion_nk
  JOIN dw.dim_criterio c ON c.sk_criterio = s.sk_criterio_modificado
  WHERE s.tipoSimulacion = 'PESO'
  GROUP BY g.categoriaPresupuesto, c.nombre, c.sk_criterio
) x WHERE rk = 1;
```
```sql
-- 7c. Simulaciones de presupuesto, reportadas aparte (D-4/HU-D03: tipoSimulacion = 'PRESUPUESTO')
SELECT g.categoriaPresupuesto, COUNT(*) AS sim_presupuesto
FROM orig o JOIN dw.dim_segmento g ON g.sk_segmento = o.sk_segmento
JOIN sim s ON s.idRecomendacionOrigen_nk = o.idRecomendacion_nk
WHERE s.tipoSimulacion = 'PRESUPUESTO'
GROUP BY g.categoriaPresupuesto;
```

---

## 8. Requerimientos no funcionales

| ID | Requisito | Umbral | Condiciones de medición |
|---|---|---|---|
| RNF-01 | Top 3 (HU-C07) | Servicio p95 ≤ 2000 ms; pantalla completa p95 ≤ 5 s | 500 planes activos; 50 usuarios virtuales, 1 s de espera; 1 min de rampa + 5 min estables (≥1.000 solicitudes). `staging` con el plan/compute de producción (§2.1). Sin scroll para ver el plan #1 en 1366×768 y 360×640. |
| RNF-02 | Previsualización (HU-C08) | p95 ≤ 1500 ms | Mismo volumen; endpoint sin escritura; *debounce* de 250 ms en cliente. |
| RNF-03 | Consulta de KPI | p95 ≤ 3000 ms | 1.000.000 de filas sintéticas en el hecho; índices en `sk_tiempo`, `sk_zona`, `sk_plan`, `sk_segmento`, `idRecomendacion_nk`; 100 ejecuciones por consulta tras 5 de calentamiento. Solo válido en Pro con el compute declarado. |
| RNF-04 | Integridad del ETL | Conciliación 100% (`leídas = cargadas + rechazadas + omitidas`); rechazo ≤ 1% de filas **nuevas**; máx. 3 filas por recomendación; duración ≤ 15 min | 100.000 recomendaciones (~300.000 filas) en `staging`. |
| RNF-05 | Control de acceso | PBKDF2-HMAC-SHA512, 100.000 iteraciones (**.NET 10**, D-28; disponible desde .NET 7, pero el proyecto DEBE fijarse en .NET 10 LTS, no en una versión sin soporte); bloqueo 5 intentos/15 min; contraseña 10–128 caracteres; sesión 30 min | Ver detalle en §9 (historias de autenticación). |
| RNF-06 | Calidad de código | Cobertura ≥ 80% líneas / ≥ 70% ramas en `SmartPlan.Motor` | `coverlet.msbuild` con `/p:Threshold="80,70" /p:ThresholdType="line,branch"`. Verificación negativa: una prueba bajo umbral debe hacer fallar el pipeline. |
| RNF-07 | Pruebas del ETL | 100% de las reglas con prueba | Suite SQL (pgTAP) en CI: 6 reglas, idempotencia, solape, `OMITIDA`, rechazos, invariantes de §5.2. |
| RNF-08 | Respaldo | RPO ≤ 24 h, RTO ≤ 4 h | Requiere Pro. Restauración completa probada antes de producción, tiempo registrado en `/docs/rnf/`. |
| RNF-09 | Observabilidad del ETL | Alerta ≤ 15 min | Estado `ERROR`/`ALERTA`/`OMITIDA` visible y notificado por correo (vía Brevo, §2.4) a **Ricardo Frontanilla** (`ricardofrontanillasalazar@gmail.com`), responsable designado (D-34). |
| RNF-10 | Seguridad | 0 fallas | HTTPS, TLS ≥1.2, HSTS `max-age ≥ 31536000; includeSubDomains`, cabeceras de seguridad, anti-forgery, 0 vulnerabilidades altas/críticas, checklist OWASP 10/10. |
| RNF-11 | Compatibilidad | Ver umbral | Últimas 2 versiones de Chrome/Edge/Firefox/Safari; desde 360 px sin scroll horizontal; objetivos táctiles ≥44×44 px. |
| RNF-12 | Accesibilidad | Lighthouse ≥ 90 | Contraste ≥4,5:1; operable por teclado. |
| RNF-13 | Pruebas de frontera del motor | 100% de reglas de §3 con prueba | Los 4 casos de §4 + valores límite de presupuesto, desempate en 3 niveles, 0/1/2/3 candidatos. |

**[D-34, ratificada]** Responsable de las alertas del ETL: **Ricardo Frontanilla**, correo `ricardofrontanillasalazar@gmail.com`. Es el destinatario configurado de las notificaciones de RNF-09, además de tener una cuenta con rol `Administrador` en el sistema (necesaria para HU-C13: gestión de roles y desbloqueo, y para HU-C01: carga de `indiceEstabilidad`, §9).

**Implementación:** el correo de destino **NO se escribe en el código ni en las migraciones** (regla "sin secretos ni datos hardcodeados en el repositorio", §1); vive en la configuración de la aplicación (`appsettings.{Environment}.json` fuera de control de versiones, o un secreto de despliegue), bajo una clave como `Alertas:EtlResponsableCorreo`. Esto permite cambiar el destinatario sin tocar código si el proyecto pasa a un equipo mayor.

**Riesgo de punto único:** con un solo responsable, si su cuenta de correo o su cuenta de Administrador quedan inaccesibles, la alerta no llega a nadie. Se documenta como riesgo aceptado para el MVP, no como falla de RNF-09. Cuando el equipo crezca, esta configuración puede ampliarse a una lista de correos sin cambiar el mecanismo.

---

## 9. Historias de autenticación, roles y gestión (alcance enmendado, §1.1)

**Matriz de acceso**

| Rol | Redirección tras login | Rutas permitidas |
|---|---|---|
| `Administrador` | `/admin` | `/admin/**`, `/cuenta` |
| `Gerente` | `/dashboard` | `/dashboard`, `/cuenta` |
| `Usuario` | `/perfil` | `/perfil`, `/recomendacion`, `/simulacion`, `/cuenta` |

### HU-C03a: Autenticación — 3 SP (propuesta)
1. Credenciales válidas de cuenta confirmada → redirección según la matriz.
2. Usuario inexistente, contraseña incorrecta o cuenta bloqueada → mismo mensaje genérico y mismo código HTTP en los tres casos.
3. `returnUrl` externo se ignora; solo se aceptan rutas locales.

### HU-C03b: Autorización por roles — 3 SP
1. Ruta sin permiso → 403. Sin sesión → redirección a `/login`. API: 401/403 en JSON.
2. Recomendación ajena por id → 404.
3. Prueba automatizada recorre la matriz completa (3 roles × todas las rutas).

### HU-C03c: Bloqueo de cuenta — 2 SP
1. 5 fallos consecutivos → bloqueo 15 min, mensaje genérico incluso con la contraseña correcta.
2. Login exitoso reinicia el contador a 0.
3. El Administrador puede desbloquear (HU-C13).

### HU-C09: Registro — 5 SP
1. Correo válido + contraseña que cumple RNF-05 → mensaje genérico + envío de enlace de confirmación (24 h, un solo uso).
2. Correo ya registrado → **mismo mensaje** genérico; no se crea otra cuenta; el titular recibe un aviso.
3. Toda cuenta nueva recibe **solo** el rol `Usuario`.
4. Correos comparados sin distinguir mayúsculas.

### HU-C12: Restablecer contraseña — 3 SP
1. Cualquier correo (exista o no) → mismo mensaje genérico.
2. Token válido (1 h, un solo uso) → cambio de contraseña, se cierran las demás sesiones.

### HU-C13: Gestión de roles y desbloqueo — 3 SP
1. Administrador asigna `Gerente` a una cuenta (un solo rol por cuenta).
2. Administrador desbloquea una cuenta; contador de fallos vuelve a 0.
3. Con un solo Administrador restante, no se le puede quitar el rol.

### HU-C10: Gestión de zonas — 3 SP
1. Nombre vacío o duplicado (sin distinguir mayúsculas/tildes) → error.
2. Desactivar (D-26) conserva cobertura, perfiles e historial; reactivar restaura disponibilidad.
3. Sin borrado físico.

### HU-C11: Baja y reactivación de planes — 3 SP
1. Plan desactivado no es candidato en nuevos cálculos.
2. Recomendaciones históricas con ese plan no cambian (snapshots intactos).
3. Reactivación lo vuelve candidato desde el siguiente cálculo.

### Enmienda a HU-C01: campo `indiceEstabilidad`
*Se agrega un criterio de aceptación a la historia de carga de catálogo, por la decisión D-33.*
1. El formulario de alta/edición de plan incluye el campo **Índice de estabilidad**, entero, obligatorio, entre 0 y 100. El plan no puede guardarse (ni en borrador) sin este valor: es obligatorio desde la creación, no solo para activarlo.
2. Un valor fuera de ese rango o no numérico impide guardar el plan y muestra el error de campo correspondiente (mismo mecanismo que los demás campos obligatorios de HU-C01).
3. El valor cargado es el que usa el motor SAW en §3.1.2 (`indiceEstabilidad / 100`), sin transformación adicional.
4. El formulario muestra junto al campo la guía de referencia de **D-35** (abajo), como texto de ayuda, para reducir la variación entre distintos Administradores.

**[D-35, propuesta] Guía operativa para cargar `indiceEstabilidad`.** El MVP no tiene una fuente automática de uptime o incidencias por proveedor, así que el valor es una **estimación informada del Administrador**, guiada por esta banda de referencia (no un cálculo exacto):

| Rango | Guía de asignación |
|---|---|
| 90–100 | Proveedor con reputación de alta confiabilidad; sin quejas recurrentes de caídas conocidas por el Administrador. |
| 70–89 | Servicio confiable en general, con caídas ocasionales reportadas informalmente. |
| 50–69 | Quejas moderadas o frecuentes de intermitencia, sin llegar a inutilizar el servicio. |
| 0–49 | Reportes frecuentes de caídas o mal servicio, o proveedor nuevo sin historial conocido. |

- **Consistencia por proveedor:** todos los planes de un mismo proveedor DEBERÍAN cargarse con el mismo `indiceEstabilidad`, salvo que el Administrador tenga evidencia concreta de que un plan específico (por ejemplo, uno de fibra frente a uno inalámbrico del mismo proveedor) se comporta distinto. La interfaz sugiere reutilizar el último valor cargado para ese proveedor, editable.
- **Limitación aceptada para el MVP:** el valor es subjetivo y depende del criterio del Administrador que lo carga. Se documenta como debilidad conocida del KPI 3 y de los desgloses de HU-08, no se resuelve en este release. Una fuente objetiva (histórico de incidencias reportadas) queda fuera de alcance (D-33) y es candidata para un release posterior.

---

## 10. Preguntas abiertas: estado final

| # | Pregunta | Respuesta | Estado |
|---|---|---|---|
| 1 | ¿Pesos ROC coinciden con la fórmula? | Sí, verificado en §4.0 con la tabla de HU-C05 (2 y 3 criterios; 4 no aplica, D-2). | **Cerrada** |
| 2 | Versión de .NET | .NET 10 (LTS), soporte hasta noviembre 2028; .NET 8/9 pierden soporte el 10-nov-2026. | **Ratificada** |
| 3 | Proveedor SMTP | Brevo (`staging`/`prod`, gratuito 300/día); Docker local en `dev`; `MailKit` como cliente (D-8 ampliada). | **Ratificada** |
| 4 | Namespace del motor | `SmartPlan.Motor` (RNF-06). | **Ratificada** |
| 5 | Compute y región de Supabase | `sa-east-1`, Micro con Small como escalón (D-32). | Propuesta |
| 6 | Responsable de alertas del ETL | **Ricardo Frontanilla**, `ricardofrontanillasalazar@gmail.com` (D-34). | **Cerrada** |
| 7 | Calibración de cortes de presupuesto | Provisional 120/200 (D-31), recalibrar con percentiles del catálogo real. | Propuesta |
| 8 | Estimaciones (DoR) | Aceptadas tal como quedaron redactadas en cada historia (§2.7, §3, §9). | **Ratificada** |
| 9 | Retención y borrado (D-9) | Resuelta: pseudonimización de `PerfilUsuario` en 72 h, historial de recomendaciones intacto (§2.5). | **Cerrada** |
| 10 | `indiceEstabilidad`: ¿de dónde sale? | **Carga manual del Administrador**, como un campo más del formulario de alta/edición de plan (D-33). Derivarlo de un histórico de incidencias queda fuera del MVP. | **Cerrada** |

---

## 11. Lista de verificación antes de mandar a desarrollo

- [ ] Ratificadas D-1 a D-33 (Parte 1 prevalece en conflictos, según el registro de reconciliación).
- [ ] Migración que agrega `indiceEstabilidad` y los campos `activo` de zona/plan (D-33, D-26).
- [ ] CI con: gate de cobertura vía `coverlet.msbuild` con verificación negativa; prueba de arquitectura `NetArchTest`; escaneo de migraciones con la lista negra ampliada (§2.6); escaneo de secretos (`gitleaks`); protección de rama.
- [ ] Roles de base de datos creados según §2.3, con `etl_runner` como dueño de la función ETL (no `migrator`).
- [ ] Políticas RLS explícitas por rol en `oltp` y `dw` (§2.2), no solo `ENABLE ROW LEVEL SECURITY`.
- [ ] Esquema `identity` separado de `oltp`, y ambos fuera de la Data API.
- [ ] Las 4 tablas del oráculo (§4) traducidas a pruebas xUnit, más las 95 combinaciones de reescalado (§4.5).
- [ ] Decidido el compute/región de Supabase y presupuestado el costo de `staging` + `prod` (§2.1).
- [x] Confirmado con el Squad: el backlog de la Actividad 3 es la única fuente de HU-C01, C02, C04 y C06; §2.7 queda como versión oficial (no reconstrucción provisional).
- [ ] Cerradas las preguntas 6 y 10 de §10 (ya resueltas: rol `Administrador`, ver D-34 y D-33).
- [ ] Existe la **cuenta `Administrador` semilla de Ricardo Frontanilla** (`ricardofrontanillasalazar@gmail.com`), creada por migración o script (no por HU-C09, que solo asigna rol `Usuario`), con correo confirmado antes del primer despliegue del ETL en `staging`/`prod`.
- [ ] `Alertas:EtlResponsableCorreo` configurado en `staging` y `prod` (fuera del repositorio) con ese correo.
- [ ] El formulario de alta/edición de plan (HU-C01, Parte 1) valida `indiceEstabilidad` entre 0 y 100, campo obligatorio.
