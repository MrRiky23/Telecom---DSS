# PRD SmartPlan DSS — v2.0 (React + Vite + Supabase)

> Este documento **reemplaza al PRD v1.2** (stack .NET). Las **reglas de negocio** de v1.2 se conservan; cambian la arquitectura técnica, la seguridad, las pruebas y el modelo de datos, para reflejar el proyecto real (React 18 + Vite + Supabase) y cerrar las brechas de la auditoría del 28-sep-2026 (Anexo A). Todo lo marcado **[D-n]** es una decisión que el Squad DEBE ratificar antes de desarrollo; hasta entonces su estado es *Propuesta*. Las decisiones D-1 a D-35 de v1.2 se mantienen, salvo las derogadas en el registro de cambios.
>
> **Lenguaje normativo:** DEBE / NO DEBE = obligatorio y verificable. DEBERÍA = recomendado. Ante cualquier ambigüedad que este documento no resuelva, la persona o el agente **se detiene y pregunta** a una persona del Squad; no la resuelve por su cuenta ni edita este documento para "cerrarla" (§1).
>
> **Convención de nombres:** en PostgreSQL, tablas y columnas en minúsculas y sin comillas (`preciomensual`); en JavaScript, camelCase (`precioMensual`). La traducción se hace en un único módulo (`src/services/mappers.js`), no en los componentes. Las migraciones NO DEBEN usar comillas dobles en nombres.

### Registro de cambios v1.2 → v2.0

| Área | v1.2 (.NET) | v2.0 | Motivo |
|---|---|---|---|
| Stack | ASP.NET Core 10, EF, Identity | **React 18 + Vite 5 + Supabase (Postgres, Auth, RPC, `pg_cron`) + Vercel** [D-36] | Es el stack real del proyecto. |
| Dónde vive el motor SAW | Función pura en C# (`decimal`) | **Funciones PostgreSQL con `numeric`, expuestas por RPC** [D-40]; el cliente no calcula | JavaScript no tiene `decimal`; el servidor decide y persiste (v1.2 §3.3.5). |
| Redondeo del puntaje | Texto: normalizados a 4 decimales antes de multiplicar; oráculo Caso 4 incoherente con ese texto | **Sin redondeo intermedio; total redondeado una sola vez** [D-37] | Es la única regla que reproduce los valores publicados del oráculo (§4). |
| Cobertura | `ZonaCobertura` por zona×proveedor, pero el catálogo arrastraba `idzona` | **Solo zona×proveedor; se elimina `plantelecomunicacion.idzona`** [D-39] | v1.2 D-6; el modelo previo permitía dos fuentes de verdad. |
| Persistencia | Una transacción (EF) | **Una transacción dentro de una RPC** `SECURITY DEFINER` | El cliente ya no inserta en tablas inmutables. |
| Autenticación | Identity, PBKDF2 (D-28), bloqueo 5/15 | **Supabase Auth** [D-44]; D-28 **derogada**; el bloqueo por cuenta depende del plan | Ver §8 RNF-05. |
| Correo | MailKit + Brevo SMTP (D-30) | **Supabase Auth con SMTP personalizado de Brevo**; alertas ETL por Edge Function | Sin backend propio. |
| Roles de BD | `app_rw`, `dw_reader`, `migrator`, `etl_runner` | Roles de Supabase (`anon`, `authenticated`, `service_role`) + `app_calc` y `etl_runner` (NOLOGIN) | §2.5. |
| Esquemas | `identity`, `oltp`, `dw` | `auth` (gestionado por Supabase), `public` (OLTP), `dw` (no expuesto) [D-42] | PostgREST solo expone `public`. |
| Pruebas | xUnit, `coverlet.msbuild`, NetArchTest | **pgTAP** (motor, ETL), **Vitest** (`@vitest/coverage-v8`) y una prueba de arquitectura propia | §8 RNF-06/07/13. |
| Dependencias | Lista NuGet (D-8) | **Lista npm (D-8')** | §2.6. |
| Historial de recomendaciones | Sin HU | **HU-C14** (propuesta) | La vista ya existe en el código y necesita contrato. |
| Códigos de error | HTTP (422, 404) | Códigos de negocio en RPC (`ZONA_INVALIDA`, `SIMULACION_EXISTENTE`, …) | §3.0. |
| Auditoría del código | — | **Anexo A** con 18 brechas priorizadas | Trazabilidad entre PRD y repositorio. |

---

## 1. Reglas de operación para agentes de IA (ampliadas)

**SIEMPRE**
- Implementar solo lo que este documento describe, citando en cada commit y PR el ID de la HU, RNF o D-n que lo origina.
- Escribir las pruebas junto con el código: al menos una por cada regla de frontera de §3 y cada fila del oráculo (§4), con **igualdad exacta a 4 decimales** (nunca `toBeCloseTo` ni tolerancias).
- Ejecutar la suite completa (Vitest + pgTAP) y los gates de CI antes de proponer un PR.
- Expresar todo cambio de esquema como migración versionada en `supabase/migrations/`.
- Usar exclusivamente datos ficticios en `dev` y `staging`.
- Trabajar solo contra Supabase local (`supabase start`); el agente no tiene credenciales de `staging` ni `prod`.
- Tocar un solo alcance por PR (≈400 líneas de diff) y citar la HU (mecanismo en §2.9).

**PREGUNTAR ANTES (detenerse y consultar a una persona)**
- Agregar o actualizar dependencias npm fuera de D-8', o habilitar extensiones de Postgres fuera de §2.6.
- Crear vistas materializadas, índices nuevos o cualquier cambio de esquema fuera de una migración revisada.
- Cambiar un umbral de RNF, una decisión D-n, el plan/compute de Supabase o la configuración de Auth.
- Añadir un requisito, un campo o un comportamiento que este documento no defina.

**NUNCA**
- Usar datos reales, ni guardar secretos en el repositorio o en un zip de entrega.
- Poner `service_role`, `sb_secret_*` o cualquier clave privilegiada en el frontend, en variables `VITE_*` o en `dist/`.
- Aprobar o fusionar sus propios PR; editar este PRD, los archivos de CI o las reglas de protección de rama.
- Deshabilitar, omitir o relajar pruebas, lint, advertencias o gates de CI.
- **Calcular, redondear u ordenar puntajes en el cliente**, ni enviar pesos, puntajes o `idperfil` desde el cliente para persistirlos.
- Guardar datos de dominio (recomendaciones, perfiles, catálogo, historial) en `localStorage`/`sessionStorage`.
- Deshabilitar RLS, crear políticas `USING (true)` sobre tablas con datos de usuario, otorgar privilegios a `anon` o crear roles con `BYPASSRLS`.
- Crear vistas sobre `public` o `dw` sin `security_invoker = true`, ni exponerlas a `authenticated` (los KPIs se sirven por funciones, §7).
- Ejecutar `UPDATE` o `DELETE` sobre `recomendacionresult` o `detallerecomendacion`.
- Borrar físicamente planes, zonas, proveedores o cobertura (baja lógica, D-26).
- Ejecutar DDL/DML destructivo contra `staging` o `prod`, o incluir `DROP` en una migración.
- Dejar un modo "demo" que asigne privilegios en el cliente. El rol lo decide siempre la base de datos.
- Escribir en `dw` desde la aplicación (solo el ETL escribe).

### 1.1 Justificación de la enmienda al alcance (heredada de v1.2)

El alcance original no definía cómo se crean las cuentas ni cómo se recupera el acceso. Se incluyen explícitamente: registro con confirmación de correo, restablecimiento de contraseña y gestión de roles por un Administrador. No amplía el alcance funcional del DSS (Top 3, simulación, KPIs): es la plomería de autenticación sin la cual el resto no se puede operar.

---

## 2. Arquitectura, entornos, seguridad y gobierno de datos

### 2.1 Arquitectura de referencia [D-36, D-40]

| Capa | Tecnología | Responsabilidad | NO hace |
|---|---|---|---|
| Navegador | React 18 + Vite 5, alojado en Vercel | Interfaz, validación de formularios (solo UX), llamadas con `supabase-js` | Calcular puntajes; decidir permisos; guardar datos de dominio localmente. |
| Identidad | Supabase Auth | Registro, sesión, correo de confirmación y restablecimiento | Asignar roles (los asigna la base de datos). |
| Acceso a datos | PostgREST (tablas) y RPC (funciones) | Única puerta a los datos, siempre con el JWT del usuario | Exponer `dw` ni tablas sin RLS. |
| Datos y lógica | PostgreSQL: motor SAW, reglas, inmutabilidad, ETL (`pg_cron`), KPIs | Fuente de verdad y autoridad de cálculo | — |
| Tareas con secretos | Supabase Edge Functions (Deno), **solo tres**: `notificar-etl`, `admin-usuarios`, `baja-cuenta` | Operaciones que requieren `service_role` o un proveedor externo | Cualquier lógica de negocio del DSS. |

No existe backend propio. Toda Edge Function DEBE verificar el JWT del llamante y su rol antes de actuar, y NO DEBE devolver información que el rol no pueda ver.

### 2.2 Entornos

| Entorno | Base de datos | Frontend | Correo |
|---|---|---|---|
| `dev` | Supabase local (CLI + Docker) | `vite` en `localhost:3000` | Servidor de captura local (Inbucket, incluido en la CLI) |
| `staging` | Proyecto Supabase propio | Vercel *Preview* | Brevo (SMTP personalizado de Auth) |
| `prod` | Proyecto Supabase propio | Vercel *Production* | Brevo |

- No existe modo demo: si faltan `VITE_SUPABASE_URL` o la clave pública, la aplicación DEBE mostrar una pantalla de error de configuración y NO DEBE otorgar ningún rol ni datos.
- El esquema vive **solo** en `supabase/migrations/` (generado con `supabase db diff` y revisado). Los scripts sueltos con `DROP` (`supabase-schema.sql`) se retiran; el dato de prueba va en `supabase/seed.sql` y solo corre en `dev`.

### 2.3 Supabase: plan, región y costo (heredado de v1.2; revalidar precios antes de contratar)

| Hallazgo | Consecuencia |
|---|---|
| Plan **Free**: 500 MB, sin backups, proyecto pausado tras 7 días de inactividad. | No sirve para RNF-08 ni para `staging`/`prod` reales; el ETL no corre con el proyecto pausado. |
| Plan **Pro**: $25/mes por organización, backups diarios con 7 días de retención, sin pausa. | Plan mínimo para RNF-03 y RNF-08. |
| El **compute se factura por proyecto**, aparte de los $25; Pro incluye $10/mes de crédito (una instancia Micro). | `staging` + `prod` con Micro ≈ **$35/mes**. Debe presupuestarse. |
| Región **South America (São Paulo, `sa-east-1`)** disponible. | La más cercana a Bolivia. |
| El *Password Verification Hook* de Auth figura como disponible solo en planes **Teams y Enterprise** (documentación de Supabase, revisada el 28-sep-2026). | Condiciona el bloqueo por cuenta de RNF-05 (D-44). |

**[D-32]** Región `sa-east-1`; compute **Micro** en `staging` y `prod`, con **Small** (≈$15/mes) como escalón si RNF-03 no se cumple con índices. *Propuesta.*

Extensiones requeridas: `pg_cron`, `pg_net` (alertas del ETL), `unaccent` (unicidad de zonas sin distinguir tildes) y `pgtap` (solo `dev` y CI).

### 2.4 Exposición de datos y RLS [D-42]

- La Data API expone **solo `public`**. El esquema `dw` NO DEBE estar en la lista de esquemas expuestos.
- `anon` NO DEBE tener ningún privilegio sobre tablas, vistas ni funciones de la aplicación (`REVOKE ALL` y `ALTER DEFAULT PRIVILEGES … REVOKE` en la primera migración). La aplicación no tiene ninguna pantalla pública salvo autenticación, que usa Auth.
- **RLS habilitado en todas las tablas de `public` y `dw` con políticas explícitas por rol** (no basta con habilitarlo). RLS es defensa en profundidad; los `GRANT` siguen siendo la barrera principal.
- El rol de aplicación se consulta con `public.fn_rol_actual()` (`SECURITY DEFINER`, `STABLE`, `SET search_path = ''`), que devuelve el `rol` de `auth.uid()`. Las políticas NO DEBEN consultar `user_roles` directamente: una política sobre `user_roles` que lee `user_roles` es un riesgo de recursión.
- Las funciones `SECURITY DEFINER` DEBEN fijar `search_path`, validar `auth.uid()` y NO DEBEN aceptar identificadores de usuario como parámetro cuando puedan derivarse del JWT.
- Ninguna vista de `public` sobre datos de usuario o de `dw` sin `security_invoker = true`. Los KPIs se sirven por funciones que verifican el rol (§7).
- Ningún rol de aplicación tiene `BYPASSRLS`.

**Matriz de políticas (tablas de `public`)**

| Tabla | `usuario` | `gerente` | `admin` |
|---|---|---|---|
| `proveedor`, `zonacobertura`, `zonaproveedor`, `plantelecomunicacion` | `SELECT` | `SELECT` | `SELECT`, `INSERT`, `UPDATE` (sin `DELETE`) |
| `perfilusuario`, `criterioponderacion` | `SELECT`/`UPDATE` de lo propio (la fila se crea por trigger de alta) | — | — |
| `recomendacionresult`, `detallerecomendacion` | `SELECT` de lo propio; `INSERT` **solo** vía RPC | — | — |
| `user_roles` | `SELECT` de la fila propia | `SELECT` de la fila propia | `SELECT` propio; cambios solo vía `fn_asignar_rol` |
| `dw.*` | — | solo vía `fn_kpi_*` | solo `fn_etl_estado` |

Ningún rol recibe `UPDATE` ni `DELETE` sobre las tablas inmutables (§5.1). La lectura de recomendaciones ajenas queda **prohibida** para `gerente` y `admin`: el Gerente consume KPIs agregados del `dw`, no historiales individuales.

### 2.5 Roles de base de datos

| Rol | Uso | Privilegios |
|---|---|---|
| `anon` | Sin uso en la aplicación | Ninguno. |
| `authenticated` | Toda sesión iniciada; el rol funcional sale de `user_roles` | Solo lo que otorgan §2.4 y las funciones expuestas. |
| `app_calc` (NOLOGIN, sin `BYPASSRLS`) | Dueño de `fn_guardar_recomendacion` y `fn_confirmar_simulacion` | `INSERT` en `recomendacionresult` y `detallerecomendacion`; `SELECT` en catálogo. |
| `etl_runner` (NOLOGIN, sin `BYPASSRLS`) | **Dueño y ejecutor de la función ETL** | `SELECT` en `public`; `INSERT`/`UPDATE` en `dw`. (Si el dueño fuera un rol con permisos de escritura en `public`, una función `SECURITY DEFINER` podría violar "el ETL no escribe en OLTP".) |
| `postgres` / migraciones | Solo CI, tras PR aprobado | DDL. |
| `service_role` | Solo Edge Functions, mediante secretos de Supabase | Total; NUNCA en el navegador. |

Roles funcionales de aplicación (`user_roles.rol`): `usuario`, `gerente`, `admin`, equivalentes a *Usuario*, *Gerente* y *Administrador* del resto del documento.

### 2.6 Dependencias permitidas [D-8']

| Tipo | Paquetes |
|---|---|
| Ejecución | `react`, `react-dom`, `@supabase/supabase-js`, `react-router-dom` (rutas por rol, D-43) |
| Desarrollo | `vite`, `@vitejs/plugin-react`, `vitest`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `eslint` y `eslint-plugin-react-hooks` |
| Herramientas externas (no npm) | Supabase CLI (migraciones y `supabase test db` para pgTAP), `k6` (carga), `gitleaks` (secretos), Lighthouse CI (RNF-12) |

No se requieren `decimal.js` ni librerías de estado: la aritmética exacta vive en la base de datos y el estado es local a los componentes. Cualquier otro paquete requiere PR aprobado por el Squad.

### 2.7 Secretos y configuración

- El cliente solo recibe `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (clave **pública**: anon o publishable). Cualquier otra variable `VITE_*` que contenga una credencial es una violación.
- Los archivos `.env*` NO DEBEN incluirse en commits ni en zips de entrega; solo `.env.example` sin valores.
- Los secretos de servidor (`service_role`, clave de Brevo, `ALERTAS_ETL_RESPONSABLE_CORREO`, secreto compartido `pg_net` → Edge Function) viven como secretos de Supabase o en Vault, nunca en el repositorio ni en migraciones.
- CI DEBE fallar si `dist/` o `src/` contienen `service_role`, `sb_secret_` o un JWT con `"role":"service_role"`.

### 2.8 D-9 y D-38: retención y borrado de datos personales

`recomendacionresult` y `detallerecomendacion` son inmutables, por lo que no se borran filas al eliminar una cuenta. Se resuelve con **pseudonimización, no con borrado del historial**:

1. El usuario solicita la baja mediante `fn_solicitar_baja_cuenta()`, que marca `perfilusuario.baja_solicitada_en`.
2. Un job de `pg_cron` (cada hora) ejecuta `fn_pseudonimizar_bajas()`: en ≤ **72 h** desde la solicitud reemplaza `perfilusuario.idzona` por `NULL`, vacía `tipousos` y registra `pseudonimizado_en`. Se conservan solo los campos numéricos necesarios para los KPIs.
3. La cuenta de Auth se elimina desde la Edge Function `baja-cuenta` (con `service_role`) **después** de la pseudonimización. `perfilusuario.user_id` usa `ON DELETE SET NULL` para que el borrado del usuario no arrastre ni bloquee el historial.
4. `dw.dim_usuario` nunca contuvo datos personales (solo llave sustituta). Las filas de `recomendacionresult`/`detallerecomendacion` y `fact_recomendacion` se conservan intactas.

### 2.9 Gates de CI

| Gate | Criterio |
|---|---|
| Lint | `eslint` sin errores ni advertencias. |
| Pruebas | `vitest run --coverage` (umbral RNF-06) y `supabase test db` (pgTAP: oráculo, ETL, RLS). |
| Prueba de arquitectura | Test Vitest propio (`arquitectura.test.js`, sin dependencias nuevas): (a) solo `src/lib/supabaseClient.js` y `src/services/**` importan `@supabase/supabase-js`; (b) ningún archivo de `src/components/**` ni `src/views/**` llama `.insert`, `.update`, `.upsert` ni `.delete` sobre tablas inmutables, ni `.rpc` de cálculo fuera de `src/services/**`; (c) ningún archivo usa `localStorage` o `sessionStorage` para datos de dominio; (d) ninguna referencia a `service_role`. |
| Escaneo de migraciones | Falla ante `DROP`, `TRUNCATE`, `DropColumn`; `DISABLE TRIGGER`/`ENABLE REPLICA` sobre tablas inmutables; `DISABLE ROW LEVEL SECURITY`/`NO FORCE`; `BYPASSRLS`; `GRANT` a `anon`; `ALTER … OWNER TO` fuera de §2.5; `REVOKE` sobre políticas de §2.4; función `SECURITY DEFINER` sin `SET search_path`; vista sin `security_invoker`. |
| Secretos | `gitleaks` sobre el repositorio y escaneo de `dist/` (§2.7). |
| Dependencias | `npm audit --audit-level=high` sin hallazgos. |
| Rama | Protección de rama; un PR requiere aprobación de una persona distinta del autor. |
| Tamaño de PR | Aviso sobre ≈400 líneas de diff y sobre PR que toquen más de un alcance (HU). |
| Verificación negativa | Al menos una vez por release, una prueba deliberadamente bajo umbral DEBE romper el pipeline. |

### 2.10 Funciones existentes sin historia de usuario

Toda pantalla o comportamiento DEBE originarse en una HU. Las funciones presentes en el código sin HU (Anexo A.3) requieren ratificación del Squad (se les asigna HU) o se retiran.

---

## 2.11 Historias base del backlog (Actividad 3), ratificadas en v1.2 y adaptadas

> **Nota de procedencia:** HU-C01, HU-C02, HU-C04 y HU-C06 provienen del backlog de la Actividad 3 (HU-01, HU-02, HU-04, HU-05), que es su única fuente. Se conservan las reglas ratificadas (D-5, D-6, D-18, D-26, D-33) y se adaptan al stack y al modelo de datos de v2.0.

### HU-C01: Carga de catálogo de planes — 5 SP (propuesta)
**Como** Administrador, **quiero** cargar el catálogo de planes y precios de los proveedores, **para** que el sistema cuente con la oferta actualizada.
1. El formulario registra: proveedor (selección de un `proveedor` activo, D-41), nombre del plan, precio mensual (> 0, hasta 2 decimales), velocidad en Mbps (entero > 0), límite de datos, tecnología, **`indiceEstabilidad`** (entero de 0 a 100, obligatorio desde la creación, D-33) y `activo` (por defecto `true`, D-26). Junto al campo de estabilidad se muestra la guía de D-35 y, como sugerencia editable, el último valor cargado para ese proveedor.
2. El sistema rechaza el guardado si falta un campo obligatorio o si un valor está fuera de rango, con el error específico de cada campo.
3. Un valor `indiceEstabilidad = 0` DEBE guardarse y leerse como 0; ningún valor por defecto (por ejemplo 90) puede sustituirlo.
4. Mismo proveedor + nombre de plan (sin distinguir mayúsculas) produce "Ya existe un plan con ese nombre para este proveedor." y no se guarda (índice único; la UI traduce la violación).
5. Un plan nuevo es candidato en el siguiente cálculo (§3.1), sujeto a que su proveedor tenga cobertura registrada en la zona (D-6).
6. No existe borrado: un plan se desactiva (HU-C11). Solo `admin` puede escribir (RLS).

**Tablas:** `plantelecomunicacion`, `proveedor`. **Estimación:** 5 SP.

### HU-C02: Carga de cobertura por zona y proveedor — 3 SP (propuesta)
**Como** Administrador, **quiero** cargar el nivel de cobertura de cada proveedor por zona, **para** que las recomendaciones reflejen la disponibilidad real.
1. Se asocia un nivel (`alta`/`media`/`baja`) a cada combinación zona × proveedor, en una pantalla de matriz.
2. El sistema confirma al guardar.
3. Un proveedor **sin fila de cobertura** en una zona queda excluido de los candidatos de esa zona (D-6): no se trata como "baja". Quitar la cobertura elimina la fila de configuración (`DELETE` permitido solo sobre `zonaproveedor`; el historial no se ve afectado por los snapshots).
4. Cambiar un nivel **no** modifica recomendaciones históricas; solo afecta cálculos futuros.
5. Solo `admin` puede escribir.

**Tablas:** `zonaproveedor`. **Depende de:** HU-C10. **Estimación:** 3 SP.

### HU-C04: Perfil del usuario (ubicación, uso, presupuesto) — 3 SP (propuesta)
**Como** Usuario/PYME, **quiero** ingresar mi ubicación, tipos de uso y presupuesto, **para** recibir una recomendación personalizada.
1. La ubicación es una **zona activa** (`perfilusuario.idzona`, D-26). Una zona inexistente, inactiva o vacía produce el código `ZONA_INVALIDA`.
2. El presupuesto es un número entre 1,00 y 10.000,00 Bs con hasta 2 decimales (D-18); fuera de rango muestra el error de campo.
3. Se exige al menos un tipo de uso de la lista predefinida (`streaming`, `gaming`, `teletrabajo`, `otro`).
4. Con dos o más tipos de uso, el perfil queda categorizado como `Mixto` para el ETL (§6, regla 3).
5. La fila de perfil (y la de criterios y rol) la crea un trigger de alta de usuario, no el cliente. Los valores por defecto son editables.

**Tablas:** `perfilusuario`. **Depende de:** HU-C10. **Estimación:** 3 SP.

### HU-C06: Guardar perfil y trazabilidad del cálculo — 5 SP (propuesta)
**Como** Usuario/PYME, **quiero** conservar mi perfil y que cada recomendación registre cómo se calculó, **para** no reingresar datos y poder auditar el resultado.
1. El perfil (zona, tipos de uso, presupuesto, criterios y pesos) se conserva entre sesiones y dispositivos porque vive en la base de datos, no en el navegador.
2. Editar el perfil **no** modifica recomendaciones ya generadas.
3. Cada `recomendacionresult` guarda `versionalgoritmo` (p. ej. `SAW-1.0`), `presupuestousado` y los pesos usados en ese cálculo (no una referencia al perfil actual).
4. Una simulación guarda además `tiposimulacion`, `criteriomodificado` (o `NULL` si fue de presupuesto) y referencia al original (`idrecomendacionorigen`); los valores originales se leen de esa fila (§5.1).

**Tablas:** `perfilusuario`, `criterioponderacion`, `recomendacionresult`. **Depende de:** HU-C04, HU-C05. **Estimación:** 5 SP.

---

## 3. Motor analítico SAW: contrato

Autoridad: v1.2 (HU-C07, HU-C08), con D-37 (redondeo), D-39 (cobertura) y D-40 (motor en PostgreSQL). **Nunca se seleccionan 4 criterios** (D-2): entre 2 y 3 de los 4.

### 3.0 Interfaz del motor (RPC) [D-40]

| Función | Tipo | Efecto |
|---|---|---|
| `fn_pesos_roc(p_criterios text[])` | `IMMUTABLE` | Devuelve los 4 pesos (`numeric(3,2)`) según la tabla ROC de §3.2. |
| `fn_reescalar_pesos(p_pesos jsonb, p_criterio text, p_nuevo numeric)` | `IMMUTABLE` | Reescalado de §3.3.3. |
| `fn_calcular_top3(p_idzona int, p_presupuesto numeric, p_criterios text[], p_criterio_mod text default null, p_nuevo_peso numeric default null)` | `STABLE`, `SECURITY INVOKER` | Calcula sin escribir. Devuelve `jsonb`: `candidatos`, `pesos`, `presupuesto`, `mensaje` y `top3[]` (posición, plan, proveedor, precio, velocidad, puntaje total, puntaje por criterio y valores normalizados). Sirve al cálculo original y a las previsualizaciones. |
| `fn_guardar_recomendacion(p_idzona int, p_presupuesto numeric, p_criterios text[])` | `VOLATILE`, `SECURITY DEFINER` (dueño `app_calc`) | Deriva `idperfil` de `auth.uid()`, invoca el cálculo y persiste en **una transacción**. Devuelve `idrecomendacion`. |
| `fn_confirmar_simulacion(p_idorigen uuid, p_tipo text, p_criterio text default null, p_nuevo_peso numeric default null, p_nuevo_presupuesto numeric default null)` | `VOLATILE`, `SECURITY DEFINER` | Recalcula desde la fila original y persiste la simulación (D-3, D-4). |

Códigos de error (el campo `message` de la excepción contiene solo el código; la UI lo traduce a texto):

| Código | Cuándo |
|---|---|
| `ZONA_INVALIDA` | Zona inexistente, inactiva o nula. |
| `PRESUPUESTO_FUERA_DE_RANGO` | Fuera de 1,00–10.000,00 o con más de 2 decimales. |
| `CRITERIOS_INVALIDOS` | Menos de 2, más de 3, repetidos o desconocidos. |
| `PESO_FUERA_DE_RANGO` | Fuera de 0,05–0,95, no múltiplo de 0,05 o de un criterio no seleccionado. |
| `VARIABLE_UNICA` | La simulación cambia ninguna o ambas variables (D-4). |
| `ORIGEN_INVALIDO` | El original no existe, no es del usuario o es una simulación (mismo código en los tres casos, para no revelar existencia). |
| `SIN_CANDIDATOS` | El cálculo no deja ningún plan y se intentó persistir. |
| `SIMULACION_EXISTENTE` | Ya hay una simulación confirmada para ese original (D-3). |

El cliente NO DEBE realizar aritmética con los valores devueltos: solo los muestra (el formato numérico es presentación, no cálculo).

### 3.1 HU-C07: Generar el Top 3

**Como** Usuario/PYME, **quiero** un Top 3 de planes según mi perfil y mis criterios, **para** decidir con un desglose objetivo del puntaje.

1. **Candidatos:** planes con `activo = true`, de un proveedor `activo`, en una zona `activa` donde ese proveedor **tiene fila en `zonaproveedor`** (D-6: sin fila = excluido, no "baja"), con `preciomensual <= presupuesto` (D-5: filtro duro, límite inclusivo). La disponibilidad de un plan en una zona se deriva solo de `zonaproveedor` (D-39).
2. **Normalización min-max** sobre los candidatos, en `numeric` con al menos 20 decimales de escala y **sin redondeo intermedio** (D-37):
   - Precio (costo): `(max − x) / (max − min)`. Velocidad (beneficio, Mbps): `(x − min) / (max − min)`.
   - Cobertura (escala fija): `alta` = 1,00; `media` = 0,50; `baja` = 0,00, tomada de `zonaproveedor.nivelcobertura` de la zona y el proveedor del plan. NO es un atributo del plan.
   - Estabilidad: `indiceestabilidad / 100`; el valor 0 es válido.
   - **Si `max = min`** en precio o velocidad, todos los candidatos reciben 1,00 en ese criterio.
3. **Puntaje** [D-37]: por criterio, `puntaje_c = round4(peso_c × norm_c)`; **total** = `round4(Σ peso_c × norm_c)`, redondeado **una sola vez** a 4 decimales, half-up (`ROUND` sobre `numeric` redondea "half away from zero", equivalente a half-up para valores ≥ 0). Los valores normalizados que se muestran a 4 decimales son solo de presentación. La suma de los parciales puede diferir del total hasta 0,0002 (la invariante de §5.2 tolera 0,0005).
4. **Desempate**, en orden: (1) menor `preciomensual`; (2) mayor `indiceestabilidad`; (3) menor `idplan`. Se compara el total ya redondeado a 4 decimales.
5. **Casos borde:** 0 candidatos → "No hay planes disponibles en tu zona para ese presupuesto." y no se persiste nada (`SIN_CANDIDATOS` al intentar guardar); 1 o 2 candidatos → se devuelven y persisten los que haya, con el aviso "Solo se encontraron N planes que cumplen tus criterios."
6. **Persistencia**, en una sola transacción (una RPC): un `recomendacionresult` (`versionalgoritmo`, `presupuestousado`, pesos usados a 2 decimales, `fechacalculo = now()` de la base) y hasta 3 `detallerecomendacion` (posición, total, parciales, snapshots de precio y velocidad). El cliente solo envía zona, presupuesto y **criterios ordenados**; los pesos, el perfil y los puntajes los produce el servidor.
7. **Arquitectura:** `fn_calcular_top3` es `STABLE`, sin efectos secundarios, no lee `auth.uid()` ni tablas de usuario y solo consulta catálogo y cobertura; es determinista. La prueba de arquitectura de §2.9 impide que el cliente calcule.
8. **Presentación:** la interfaz muestra los valores tal como los devuelve la RPC; no recalcula, no reordena y no aplica valores por defecto.
9. Cumple RNF-01. Los 6 casos del oráculo (§4) son pruebas pgTAP obligatorias; ningún PR que toque el motor se aprueba sin que pasen.

**Tablas:** `plantelecomunicacion`, `proveedor`, `zonaproveedor`, `perfilusuario`, `criterioponderacion`, `recomendacionresult`, `detallerecomendacion`. **Dependencias:** HU-C01, HU-C02, HU-C04, HU-C05. **Estimación:** 8 SP.

### 3.2 HU-C05: Criterios y pesos (ROC)

**Como** Usuario/PYME, **quiero** seleccionar entre 2 y 3 de los 4 criterios (`precio`, `velocidad`, `cobertura`, `estabilidad`) y ordenarlos por importancia, **para** que el ranking refleje mis preferencias.

1. El sistema impide continuar con menos de 2 o más de 3 criterios (UI y `CRITERIOS_INVALIDOS`).
2. Pesos por **ROC**, tabla fija a 2 decimales (verificada en §4.0):

   | Criterios elegidos | Peso 1.º | Peso 2.º | Peso 3.º |
   |---|---|---|---|
   | 2 | 0,75 | 0,25 | n/a |
   | 3 | 0,61 | 0,28 | 0,11 |

3. Los criterios no seleccionados reciben peso `0,00`.
4. Los pesos suman **exactamente 1,00** (`numeric`); una prueba pgTAP falla si la suma no es exacta.
5. Los pesos guardados en `criterioponderacion` DEBEN coincidir con `fn_pesos_roc(criteriosseleccionados)` (restricción `CHECK`).

**Tablas:** `criterioponderacion` (`idperfil`, `criteriosseleccionados text[]`, 4 columnas `numeric(3,2)`). **Estimación:** 3 SP.

### 3.3 HU-C08: Simular un escenario

**Como** Usuario/PYME, **quiero** ajustar una variable de mi recomendación y ver el ranking recalculado, **para** entender cómo cambia mi resultado sin perder la consulta original.

1. Una simulación modifica **exactamente una variable** (D-4): (a) el peso de un criterio seleccionado, **o** (b) el presupuesto máximo. Nunca ambas (`VARIABLE_UNICA`).
2. **Previsualización:** cada movimiento del slider o cambio de presupuesto invoca `fn_calcular_top3` (solo lectura, sin escribir) con *debounce* de 250 ms. Es ilimitada y es lo que mide RNF-02.
3. **Ajuste de peso:** el slider va de 0,05 a 0,95 en pasos de 0,05, solo sobre criterios seleccionados. Los demás seleccionados se reescalan proporcionalmente:

   `w_i' = round(w_i × (1 − w_nuevo) / (1 − w_original), 2)`

   El residuo de redondeo (para sumar exactamente 1,00) se asigna al criterio con mayor peso resultante entre los reescalados; en empate, al de **menor código de criterio** (orden fijo: Precio < Velocidad < Cobertura < Estabilidad). Los no seleccionados permanecen en 0,00. El reescalado lo hace `fn_reescalar_pesos`; la UI muestra los pesos que devuelve la RPC. Verificado con 95 casos (§4.7).
4. **Ajuste de presupuesto:** hasta 2 decimales, `1,00 ≤ presupuesto ≤ 10.000,00` Bs/mes (D-18), ambos extremos inclusive. Se recalculan candidatos y normalización desde cero.
5. **Confirmar:** `fn_confirmar_simulacion` **recalcula** desde la fila del original (nunca persiste valores del cliente) y crea un `recomendacionresult` con `essimulacion = true`, `idrecomendacionorigen`, `tiposimulacion` (`PESO` o `PRESUPUESTO`) y `criteriomodificado` (`NULL` si es de presupuesto). **La recomendación original nunca se modifica.**
6. **Una sola simulación confirmada por original (D-3):** `UNIQUE (idrecomendacionorigen) WHERE essimulacion`. La función captura la violación y lanza `SIMULACION_EXISTENTE`; la UI muestra "Ya existe una simulación para esta recomendación." sin exponer el error de base de datos.
7. `idrecomendacionorigen` **siempre** apunta a una recomendación no simulada y propia: un trigger `BEFORE INSERT` copia `essimulacionorigen` desde la fila referenciada y rechaza si es `true` (un `CHECK` simple no puede consultar otra fila); la función valida la propiedad (`ORIGEN_INVALIDO`).
8. Si la simulación deja 0 candidatos, se muestra el mensaje de §3.1.5 y "Confirmar" queda deshabilitado (`SIN_CANDIDATOS` si se intenta igualmente).
9. Vista comparativa lado a lado: el original se lee de la fila persistida. La simulación se calcula contra el **catálogo vigente al confirmar**; si el catálogo cambió desde el original, la vista muestra la fecha del original.
10. Confirmar exige un original guardado: la UI lo guarda primero mediante `fn_guardar_recomendacion` y solo con su `idrecomendacion` real llama a `fn_confirmar_simulacion`. Si el guardado falla, no se continúa ni se informa éxito.

**Tablas:** `recomendacionresult`, `detallerecomendacion`, `criterioponderacion`. **Dependencias:** HU-C06, HU-C07. **Estimación:** 8 SP.

### 3.4 HU-C14: Historial de recomendaciones — 3 SP (propuesta, nueva)
**Como** Usuario/PYME, **quiero** ver mis recomendaciones anteriores y su simulación, **para** consultar y auditar lo que el sistema me recomendó.
1. Lista solo las recomendaciones del propio usuario, ordenadas por fecha descendente y paginadas, con una sola consulta por página (recomendación con sus detalles; sin una consulta por fila).
2. El detalle muestra posición, plan, puntaje total y por criterio, y los **snapshots** de precio y velocidad; una simulación aparece enlazada a su original.
3. Es solo lectura: la interfaz no ofrece editar ni eliminar (y la base lo impide, §5.1).
4. Una recomendación ajena por id no existe para el usuario: la UI muestra "no encontrada" (404 de presentación).
5. Los datos vienen solo de la base de datos; no se mezcla ningún dato local del navegador.

**Tablas:** `recomendacionresult`, `detallerecomendacion`, `plantelecomunicacion` (nombre y proveedor). **Estimación:** 3 SP.

---

## 4. Ejemplo oráculo (datos ficticios)

Todos los valores se recalcularon el 28-sep-2026 con `decimal.js` (precisión 60) aplicando la regla de **D-37**; ninguno es estimado. En los Casos 1–4 la columna *Cobertura* es el nivel de `zonaproveedor` del proveedor del plan en la zona del perfil (se asume un proveedor distinto por plan).

**Por qué D-37 y no otra regla.** El Caso 4 (§4.4) discrimina entre las lecturas posibles: redondear primero los valores normalizados a 4 decimales daría C = 0,6348 (el oráculo publicado dice 0,6349); redondear cada parcial y luego sumar daría B = 0,5985 (el oráculo dice 0,5986). Solo "normalizar sin redondeo intermedio y redondear el total una vez" reproduce los valores publicados de los cuatro casos. Las pruebas DEBEN comparar con **igualdad exacta a 4 decimales**: una tolerancia de 3 decimales (`toBeCloseTo(x, 3)`) oculta esta diferencia.

### 4.0 Verificación de la tabla de pesos ROC

Fórmula exacta para *n* criterios: `w_i = (1/n) · Σ_{k=i}^{n} 1/k`.

| n | Pesos exactos (4 decimales) | Redondeados a 2 decimales (D-2) | Suma |
|---|---|---|---|
| 2 | 0,7500 / 0,2500 | 0,75 / 0,25 | 1,00 ✓ |
| 3 | 0,6111 / 0,2778 / 0,1111 | 0,61 / 0,28 / 0,11 | 1,00 ✓ |

(4 criterios no se calculan: D-2 limita la selección a 2 o 3.)

### 4.1 Caso 1: recomendación original y su simulación de peso

**Perfil:** presupuesto 150 Bs; criterios Precio, Velocidad, Cobertura → pesos 0,61 / 0,28 / 0,11 (Estabilidad = 0,00).

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

### 4.2 Caso 2: estabilidad activa y desempate real

**Perfil:** presupuesto 200 Bs; criterios Estabilidad, Precio → pesos 0,75 / 0,25 (Precio 0,25; Estabilidad 0,75).

| Plan | Precio | Velocidad | Cobertura | Estabilidad | idPlan |
|---|---|---|---|---|---|
| Q | 100 | 100 | alta | 80 | 7 |
| P | 100 | 150 | media | 80 | 12 |
| R | 150 | 120 | alta | 90 | 3 |
| S | 200 | 300 | alta | 60 | 9 |

Los 4 son candidatos. Precio ∈ [100, 200].

| Plan | n(precio) | n(estabilidad) | Puntaje | Desempate | Posición |
|---|---|---|---|---|---|
| Q | 1,0000 | 0,80 | **0,8500** | igual a P: precio 100=100 → estabilidad 80=80 → `idPlan` 7 < 12 | **1** |
| P | 1,0000 | 0,80 | **0,8500** | — | **2** |
| R | 0,5000 | 0,90 | **0,8000** | — | 3 |
| S | 0,0000 | 0,60 | 0,4500 | — | fuera del Top 3 |

Ejercita los **tres niveles de desempate**.

### 4.3 Caso 3: `max = min` con solo 2 candidatos

**Perfil:** presupuesto 90 Bs; criterios Velocidad, Cobertura → pesos 0,75 / 0,25.

| Plan | Precio | Velocidad | Cobertura | idPlan |
|---|---|---|---|---|
| F | 90 | 100 | alta | 21 |
| G | 90 | 100 | baja | 22 |
| H | 95 | 100 | alta | 23 |

H se excluye (95 > 90). En F y G, precio y velocidad son idénticos (`max = min`) → n(velocidad) = 1,00 para ambos.

| Plan | n(velocidad) | n(cobertura) | Puntaje | Posición |
|---|---|---|---|---|
| F | 1,0000 | 1,00 | **1,0000** | 1 |
| G | 1,0000 | 0,00 | **0,7500** | 2 |

Confirma la regla `max = min ⇒ 1,00` y que con 2 candidatos se persisten 2 filas con el aviso de §3.1.5.

### 4.4 Caso 4: simulación de **presupuesto**

Mismo perfil y catálogo del Caso 1 (pesos 0,61 / 0,28 / 0,11), `tiposimulacion = PRESUPUESTO`.

**Presupuesto simulado a 200 Bs** (entra D; límite inclusivo):

| Plan | Puntaje | Posición |
|---|---|---|
| C | **0,6349** | 1 |
| A | **0,6183** | 2 |
| E | **0,6100** | 3 |
| B | 0,5986 | fuera del Top 3 |
| D | 0,3900 | fuera del Top 3 |

**Presupuesto simulado a 90 Bs** (solo B y E; A, C y D se excluyen):

| Plan | Puntaje | Posición |
|---|---|---|
| E | **0,6100** | 1 |
| B | **0,3350** | 2 |

Confirma: (a) presupuesto igual al precio de un plan lo incluye (`<=`); (b) `PRESUPUESTO` deja `criteriomodificado = NULL`; (c) candidatos y rangos min-max se recalculan por completo; (d) la regla de redondeo de D-37.

### 4.5 Caso 5 (nuevo): cobertura por zona y proveedor (D-6, D-39)

**Zona Z:** Entel = `alta`, Viva = `media`, **Tigo sin fila en `zonaproveedor`**. **Perfil:** presupuesto 200 Bs; criterios Precio, Cobertura → pesos 0,75 / 0,25.

| Plan | Proveedor | Precio | idPlan |
|---|---|---|---|
| X | Entel | 100 | 31 |
| Y | Viva | 90 | 32 |
| W | Tigo | 80 | 33 |

W es el más barato pero **se excluye** (sin cobertura registrada en Z). Candidatos X, Y; precio ∈ [90, 100].

| Plan | n(precio) | n(cobertura) | Puntaje | Posición |
|---|---|---|---|---|
| Y | 1,0000 | 0,50 | **0,8750** | 1 |
| X | 0,0000 | 1,00 | **0,2500** | 2 |

Con la matriz de cobertura omitida, W entraría y ganaría: la prueba DEBE fallar si el filtro por zona no se aplica. Además, el nivel de cobertura debe salir de `zonaproveedor` y no de un atributo del plan.

### 4.6 Caso 6 (nuevo): `indiceEstabilidad = 0` es un valor válido

**Perfil:** presupuesto 200 Bs; criterios Estabilidad, Precio → Estabilidad 0,75, Precio 0,25. Cobertura y velocidad no intervienen (peso 0,00).

| Plan | Precio | Estabilidad | idPlan |
|---|---|---|---|
| M | 100 | 0 | 41 |
| N | 150 | 50 | 42 |

Precio ∈ [100, 150].

| Plan | n(precio) | n(estabilidad) | Puntaje | Posición |
|---|---|---|---|---|
| N | 0,0000 | 0,50 | **0,3750** | 1 |
| M | 1,0000 | 0,00 | **0,2500** | 2 |

Si un `0` se sustituye por un valor por defecto (p. ej. 90), M subiría a 0,9250 y pasaría al primer lugar: la prueba DEBE detectarlo.

### 4.7 Verificación de la fórmula de reescalado (§3.3.3)

Se probaron las **95 combinaciones**: 2 criterios seleccionados × 2 criterios modificables × 19 valores de `w_nuevo` (de 0,05 a 0,95) = 38, más 3 criterios × 3 modificables × 19 = 57, en total 95. En las 95, la suma reescalada da exactamente 1,00 y ningún criterio seleccionado queda en 0 o negativo. 0 fallos. La suite pgTAP DEBE recorrer las 95.

---

## 5. Contrato de datos

### 5.1 Esquema `public` (OLTP)

| Tabla | Definición (DEBE) |
|---|---|
| `proveedor` (nueva, D-41) | `idproveedor serial PK`; `nombre text NOT NULL`; `activo boolean NOT NULL default true`; índice único `lower(nombre)`. Sembrada con Entel, Viva y Tigo. |
| `zonacobertura` | `idzona serial PK`; `nombresector text NOT NULL`; `activo boolean NOT NULL default true` (baja lógica, D-26); índice único sobre `lower(unaccent(nombresector))`. |
| `zonaproveedor` | `PK (idzona, idproveedor)`, ambos `FK NOT NULL`; `nivelcobertura text NOT NULL CHECK IN ('alta','media','baja')`. |
| `plantelecomunicacion` | `idplan serial PK`; `idproveedor FK NOT NULL`; `nombreplan text NOT NULL`; `preciomensual numeric(10,2) CHECK (> 0)`; `velocidadmbps integer CHECK (> 0)`; `limitedatosgb integer default 0 CHECK (>= 0)`; `tecnologia text`; `indiceestabilidad smallint NOT NULL CHECK (BETWEEN 0 AND 100)` (D-33); `activo boolean NOT NULL default true`; índice único `(idproveedor, lower(nombreplan))`. **Sin `idzona`** (D-39). |
| `perfilusuario` | `idperfil uuid PK`; `user_id uuid UNIQUE REFERENCES auth.users ON DELETE SET NULL`; `idzona int FK` (reemplaza `ubicacion`); `presupuestomax numeric(10,2) NOT NULL CHECK (BETWEEN 1 AND 10000)`; `tipousos text[] NOT NULL CHECK (cardinality >= 1 AND <@ {streaming,gaming,teletrabajo,otro})`; `activo boolean`; `baja_solicitada_en`, `pseudonimizado_en timestamptz`. |
| `criterioponderacion` | `idperfil uuid PK FK`; `criteriosseleccionados text[] CHECK (cardinality BETWEEN 2 AND 3, subconjunto de {precio,velocidad,cobertura,estabilidad})`; `pesoprecio`, `pesovelocidad`, `pesocobertura`, `pesoestabilidad numeric(3,2)`; `CHECK` de suma exacta 1,00 y de igualdad con `fn_pesos_roc(criteriosseleccionados)`. |
| `user_roles` | `user_id uuid PK FK auth.users`; `rol text NOT NULL CHECK IN ('usuario','gerente','admin')`. Sin escritura directa: solo `fn_asignar_rol` (HU-C13). |
| `motoranalitico` | Catálogo de versiones del algoritmo (`SAW-1.0`). |
| `recomendacionresult` | **Inmutable.** Ver abajo. |
| `detallerecomendacion` | **Inmutable.** Ver abajo. |

**`recomendacionresult`**

| Columna | Tipo | Nota |
|---|---|---|
| `idrecomendacion` | `uuid PK` | Generado por la base. |
| `idperfil`, `idzona`, `idalgoritmo` | FK, **`NOT NULL`** | `idperfil` lo deriva la RPC de `auth.uid()`. |
| `fechacalculo` | `timestamptz NOT NULL default now()` | UTC, asignada por la base. |
| `versionalgoritmo` | `text NOT NULL` | `SAW-1.0`. |
| `presupuestousado` | `numeric(10,2)` | `CHECK (BETWEEN 1 AND 10000)` (D-18). |
| `pesoprecio`, `pesovelocidad`, `pesocobertura`, `pesoestabilidad` | **`numeric(3,2)`** | Suma exacta 1,00. |
| `essimulacion`, `essimulacionorigen` | `boolean NOT NULL default false` | `essimulacionorigen` la copia el trigger (§3.3.7). |
| `tiposimulacion` | `text` null | `PESO` o `PRESUPUESTO` (nunca `AMBOS`, D-4). |
| `criteriomodificado` | `text` null | Nulo si `tiposimulacion = PRESUPUESTO`. |
| `idrecomendacionorigen` | FK null | Solo en simulaciones. |

Restricciones: `UNIQUE (idrecomendacionorigen) WHERE essimulacion` (D-3); `NOT essimulacion ⇒ idrecomendacionorigen IS NULL ∧ tiposimulacion IS NULL ∧ criteriomodificado IS NULL`; `essimulacion ⇒ idrecomendacionorigen IS NOT NULL ∧ tiposimulacion IS NOT NULL`; `tiposimulacion = 'PESO' ⇒ criteriomodificado IS NOT NULL`; `tiposimulacion = 'PRESUPUESTO' ⇒ criteriomodificado IS NULL`. Los valores originales de una simulación se leen del original referenciado; no se duplican.

**`detallerecomendacion`**

| Columna | Tipo | Nota |
|---|---|---|
| `iddetalle` | `uuid PK` | |
| `idrecomendacion`, `idplan` | FK, **`NOT NULL`** | Sin `ON DELETE CASCADE`. |
| `posicion` | `smallint` | 1 a 3, única por recomendación. |
| `puntajetotal` | `numeric(5,4)` | 0 a 1 inclusive. |
| `puntajeprecio`, `puntajevelocidad`, `puntajecobertura`, `puntajeestabilidad` | `numeric(5,4)` | Aporte ponderado por criterio (D-37). |
| `preciosnapshot`, `velocidadsnapshot` | `numeric(10,2)`, `integer` | Copiados al calcular; nunca leídos después del catálogo. |

`CHECK (ABS(puntajetotal − Σ parciales) <= 0.0005)`.

**Inmutabilidad y disparadores.** Un trigger `BEFORE UPDATE OR DELETE` en `recomendacionresult` y `detallerecomendacion` DEBE lanzar excepción para cualquier rol (incluidos `service_role` y `admin`); ningún rol tiene privilegios `UPDATE`/`DELETE` sobre ellas. Otros disparadores: `trg_alta_usuario` (`AFTER INSERT` en `auth.users`: crea `user_roles = 'usuario'`, el perfil y los criterios por defecto, D-44) y `trg_essimulacionorigen` (§3.3.7). Está prohibido deshabilitarlos (§2.9).

### 5.2 Grano e invariantes de `dw.fact_recomendacion`

Una fila por plan dentro del Top 3 de una recomendación (1 a 3 filas), incluida como máximo 1 simulación confirmada por original (D-3).

| Columna | Tipo | Nota |
|---|---|---|
| `idfact` | `bigint PK` | |
| `iddetalle_nk` | `uuid UNIQUE` | Garantiza idempotencia del ETL. |
| `idrecomendacion_nk`, `idrecomendacionorigen_nk` | `uuid` | |
| `sk_tiempo`, `sk_usuario`, `sk_plan`, `sk_zona`, `sk_segmento` | `int FK` | `sk_zona` = zona de la consulta. |
| `sk_criterio_modificado` | `smallint FK` | `0` = Ninguno (originales y simulaciones de presupuesto). |
| `posicion`, `puntajetotal`, `puntaje{precio,velocidad,cobertura,estabilidad}` | | |
| `peso{precio,velocidad,cobertura,estabilidad}` | `numeric(3,2)` | |
| `preciosnapshot`, `velocidadsnapshot`, `presupuestousado` | | |
| `essimulacion` | `boolean` | |
| `tiposimulacion` | `text` null | `PESO` o `PRESUPUESTO`. |
| `versionalgoritmo`, `fechacalculo`, `idcorrida` | | |

**Invariantes (`CHECK`):**
1. `NOT essimulacion ⇒ idrecomendacionorigen_nk IS NULL ∧ tiposimulacion IS NULL ∧ sk_criterio_modificado = 0`.
2. `essimulacion ⇒ idrecomendacionorigen_nk IS NOT NULL ∧ tiposimulacion IS NOT NULL`.
3. `tiposimulacion = 'PRESUPUESTO' ⇒ sk_criterio_modificado = 0`.
4. `tiposimulacion = 'PESO' ⇒ sk_criterio_modificado BETWEEN 1 AND 4`.
5. `posicion BETWEEN 1 AND 3`; único el par (`idrecomendacion_nk`, `posicion`).
6. Suma de los 4 pesos `= 1.00` **exacta**.
7. `ABS(puntajetotal − Σ parciales) ≤ 0,0005` (tolera el redondeo de D-37; la diferencia máxima real es 0,0002).

### 5.3 Dimensiones

`dim_tiempo`, `dim_usuario` (solo llave seudónima, sin datos personales, §2.8), `dim_plan` (SCD1, sin precio/velocidad), `dim_zona` (SCD1, cobertura predominante recalculada), `dim_segmento` (categoría de presupuesto y de uso), `dim_criterio` (0 Ninguno, 1 Precio, 2 Velocidad, 3 Cobertura, 4 Estabilidad), `dw.etl_bitacora` (`idcorrida`, `inicio`, `fin`, `watermark_desde`, `watermark_hasta`, `estado`, `filas_leidas`, `filas_cargadas`, `filas_rechazadas`, `filas_omitidas`, `mensaje`) y `dw.etl_rechazo`.

---

## 6. Proceso ETL

**Ejecución:** función SQL `dw.fn_ejecutar_etl()`, `SECURITY DEFINER`, **dueño y ejecutor `etl_runner`** (§2.5), `SET search_path` fijo, agendada con `pg_cron` a las `0 6 * * *` (06:00 UTC = 02:00 en Bolivia).

**Pasos:**
1. `pg_try_advisory_lock`. Si no se obtiene, se registra una corrida `OMITIDA` ("corrida concurrente") y se termina sin tocar datos.
2. `watermark_desde` = `watermark_hasta` de la última corrida `OK` o `ALERTA` (`ERROR`/`OMITIDA` no cuentan; la primera usa `-infinity`). `cutoff` = inicio de la corrida menos 5 minutos. **Lectura con solape de 24 h:** `fechacalculo > watermark_desde − 24h AND fechacalculo <= cutoff`. El solape existe porque `now()` es el inicio de la transacción: una transacción larga puede confirmarse después del `cutoff` con una `fechacalculo` anterior; la carga es idempotente, así que el solape no duplica.
3. Leer `detallerecomendacion` unido a `recomendacionresult` en esa ventana.
4. Actualizar `dim_usuario`, `dim_plan`, `dim_zona`, `dim_segmento` (*upsert*).
5. Transformar con las reglas de abajo, validar y enviar los inválidos a `etl_rechazo`.
6. Insertar en el hecho con `ON CONFLICT (iddetalle_nk) DO NOTHING`; lo ya cargado cuenta como `filas_omitidas`.
7. Cerrar la bitácora con la conciliación (RNF-04). Todo en **una transacción**; ante excepción, rollback, estado `ERROR` y el watermark no avanza.

**Estados y alerta.** `OK`, `ALERTA` (propuesta: corrida completada con rechazo > 1% de las filas nuevas; v1.2 no fijaba el umbral), `ERROR`, `OMITIDA`. Ante `ERROR`, `ALERTA` u `OMITIDA`, la función llama con `pg_net` a la Edge Function `notificar-etl` (secreto compartido en Vault), que envía el correo (RNF-09).

**Reglas de transformación:**
1. **Explosión:** cada `detallerecomendacion` produce una fila de hechos.
2. **Snapshot:** `preciosnapshot`/`velocidadsnapshot` se copian del detalle, nunca de `plantelecomunicacion`.
3. **Categorización (`dim_segmento`):**
   - Presupuesto (Bs) **[D-31, propuesta]**: `Bajo` < 120; `Medio` 120–200 inclusive; `Alto` > 200. Recalibrar por release con los percentiles P33/P66 del catálogo real.
   - Uso: 1 tipo → ese tipo; 2 o más → `Mixto`. El tipo de uso se toma del perfil al momento de la corrida (el perfil no es inmutable); es una limitación aceptada del MVP.
4. **Cobertura predominante por zona:** moda de los niveles de `zonaproveedor`; empate → el nivel más bajo; sin filas → `sin_datos`.
5. **Tiempo:** `sk_tiempo` derivado de `fechacalculo` en `America/La_Paz`, no UTC.
6. **Simulaciones:** se cargan `essimulacion`, `tiposimulacion`, `criteriomodificado`, `idrecomendacionorigen_nk`; `sk_criterio_modificado` = el `criteriomodificado` de la fila.

**Rechazo si:** no resuelve alguna dimensión; `posicion` fuera de 1–3; `puntajetotal` fuera de [0,1]; `preciosnapshot` o `presupuestousado` ≤ 0; viola un invariante de §5.2; campo obligatorio nulo.

---

## 7. Definición de los KPIs

Se sirven **solo** por funciones `public.fn_kpi_*` (`SECURITY DEFINER`, dueño `etl_runner`, `SET search_path = ''`) que leen `dw`. Cada función verifica `public.fn_rol_actual() = 'gerente'` y, si no, lanza `SIN_PERMISO`. Parámetros comunes: `p_desde date`, `p_hasta date`, `p_idzona int default null`. Rango por defecto: 30 días; máximo 366 días (`RANGO_INVALIDO` si se supera). El filtro de fechas usa `dim_tiempo.fecha` (KPI 3: fecha de la recomendación **original**).

**Frescura:** `fn_kpi_frescura()` devuelve el fin de la última corrida `OK`/`ALERTA` y un indicador `desactualizado` si supera 26 h; la interfaz muestra "Datos al: <fecha y hora>" y, si corresponde, "Datos desactualizados" (RNF-09).

### HU-D01: KPI de precio y velocidad por proveedor y mes — 3 SP (propuesta)
**Como** Gerente, **quiero** ver el precio y la velocidad promedio del Top 3 por proveedor y mes, **para** entender qué ofertas recomienda el sistema.
1. **Dado** un rango de fechas válido, **entonces** veo una fila por proveedor y mes con precio y velocidad promedio, solo de recomendaciones originales (D-7).
2. **Dado** un filtro de zona, **entonces** los promedios se recalculan solo con esa zona.
3. **Dado** un rango sin recomendaciones, **entonces** veo "Sin datos para el periodo seleccionado", sin filas vacías ni error.
4. **Dado** cualquier vista del KPI, **entonces** veo la leyenda de frescura (arriba).
5. **Dado** un rango mayor a 366 días, **entonces** el sistema lo rechaza y pide un rango menor.

**Tablas:** `dw.fact_recomendacion`, `dw.dim_plan`, `dw.dim_tiempo`. **Depende de:** ETL en operación (§6). **Estimación:** 3 SP.

```sql
SELECT p.proveedor, t.anio, t.mes,
       AVG(f.preciosnapshot) AS precio_prom, AVG(f.velocidadsnapshot) AS velocidad_prom
FROM dw.fact_recomendacion f
JOIN dw.dim_plan p   ON p.sk_plan = f.sk_plan
JOIN dw.dim_tiempo t ON t.sk_tiempo = f.sk_tiempo
WHERE NOT f.essimulacion AND t.fecha BETWEEN p_desde AND p_hasta
  AND (p_idzona IS NULL OR f.sk_zona = p_idzona)
GROUP BY p.proveedor, t.anio, t.mes ORDER BY t.anio, t.mes, p.proveedor;
```

### HU-D02: KPI de zona con más recomendaciones — 3 SP (propuesta)
**Como** Gerente, **quiero** saber qué zona concentra más recomendaciones y su puntaje global promedio, **para** priorizar dónde reforzar cobertura o negociar con proveedores.
1. **Dado** un periodo sin filtro de zona, **entonces** veo las zonas de mayor a menor número de recomendaciones, con su puntaje global promedio (posición 1) y su % del total.
2. **Dado** un filtro de zona, **entonces** veo esa zona con su % **sobre el total del periodo sin filtrar** (D-12): nunca 100%, salvo que sea la única con recomendaciones.
3. **Dado** dos zonas con igual número, **entonces** se desempatan alfabéticamente por nombre.
4. **Dado** un rango sin datos, **entonces** veo "Sin datos para el periodo seleccionado".
5. **Dado** cualquier vista, **entonces** veo el texto fijo: *"El puntaje se normaliza contra los planes disponibles en cada consulta; comparar promedios entre zonas con pocos datos puede no ser representativo."*

**Tablas:** `dw.fact_recomendacion`, `dw.dim_zona`, `dw.dim_tiempo`. **Estimación:** 3 SP.

```sql
WITH base AS (
  SELECT f.sk_zona, COUNT(DISTINCT f.idrecomendacion_nk) AS n,
         AVG(f.puntajetotal) FILTER (WHERE f.posicion = 1) AS puntaje
  FROM dw.fact_recomendacion f
  JOIN dw.dim_tiempo t ON t.sk_tiempo = f.sk_tiempo
  WHERE NOT f.essimulacion AND t.fecha BETWEEN p_desde AND p_hasta
  GROUP BY f.sk_zona
), pct AS (
  SELECT b.*, b.n::numeric / NULLIF(SUM(b.n) OVER (), 0) AS pct_total FROM base b
)
SELECT z.nombresector, p.n AS recomendaciones, p.puntaje AS puntaje_global_prom, p.pct_total
FROM pct p JOIN dw.dim_zona z ON z.sk_zona = p.sk_zona
WHERE (p_idzona IS NULL OR p.sk_zona = p_idzona)
ORDER BY p.n DESC, z.nombresector;
```
**Limitación declarada:** el puntaje se normaliza por conjunto de candidatos de cada consulta (min-max relativo), por lo que promediarlo entre consultas con conjuntos distintos es un indicador aproximado.

### HU-D03: KPI de simulaciones y criterio más modificado — 5 SP (propuesta)
**Como** Gerente, **quiero** ver qué porcentaje de recomendaciones se simuló y qué criterio se modificó más, por rango de presupuesto, **para** entender cómo ajustan sus decisiones los usuarios.
1. **Dado** un periodo, **entonces** veo, por rango de presupuesto (Bajo/Medio/Alto, D-31), el número de originales, el de originales con simulación confirmada y el `% simuladas` (denominador = todas las originales del segmento, D-19).
2. **Dado** un rango con al menos una simulación `PESO`, **entonces** aparece el criterio más modificado (empate: menor `sk_criterio`), o "Ninguno" si solo hubo `PRESUPUESTO`.
3. **Dado** un rango sin simulaciones, **entonces** el `% simuladas` muestra 0% y el criterio "Sin simulaciones", sin error de división.
4. **Dado** simulaciones `PRESUPUESTO`, **entonces** se reportan en un conteo aparte por rango, sin mezclarse con el criterio modificado.
5. **Dado** cualquier vista, **entonces** veo la nota: *"Incluye solo simulaciones confirmadas (D-19); no cuenta las previsualizaciones sin confirmar."*

**Tablas:** `dw.fact_recomendacion`, `dw.dim_segmento`, `dw.dim_criterio`. **Estimación:** 5 SP.

```sql
WITH orig AS (
  SELECT DISTINCT f.idrecomendacion_nk, f.sk_segmento
  FROM dw.fact_recomendacion f JOIN dw.dim_tiempo t ON t.sk_tiempo = f.sk_tiempo
  WHERE NOT f.essimulacion AND t.fecha BETWEEN p_desde AND p_hasta
    AND (p_idzona IS NULL OR f.sk_zona = p_idzona)
), sim AS (
  SELECT DISTINCT idrecomendacionorigen_nk, tiposimulacion, sk_criterio_modificado
  FROM dw.fact_recomendacion WHERE essimulacion
)
-- 7a. % simuladas por rango (denominador = TODAS las originales del segmento)
SELECT g.categoriapresupuesto,
       COUNT(DISTINCT o.idrecomendacion_nk) AS originales,
       COUNT(DISTINCT s.idrecomendacionorigen_nk) AS con_simulacion,
       COUNT(DISTINCT s.idrecomendacionorigen_nk)::numeric
         / NULLIF(COUNT(DISTINCT o.idrecomendacion_nk), 0) AS pct_simuladas
FROM orig o JOIN dw.dim_segmento g ON g.sk_segmento = o.sk_segmento
LEFT JOIN sim s ON s.idrecomendacionorigen_nk = o.idrecomendacion_nk
GROUP BY g.categoriapresupuesto;
```
```sql
-- 7b. Criterio más modificado (solo tiposimulacion = 'PESO'; empate: menor sk_criterio)
SELECT categoriapresupuesto, criterio, n_simulaciones FROM (
  SELECT g.categoriapresupuesto, c.nombre AS criterio, COUNT(*) AS n_simulaciones,
         ROW_NUMBER() OVER (PARTITION BY g.categoriapresupuesto
           ORDER BY COUNT(*) DESC, c.sk_criterio) AS rk
  FROM orig o JOIN dw.dim_segmento g ON g.sk_segmento = o.sk_segmento
  JOIN sim s ON s.idrecomendacionorigen_nk = o.idrecomendacion_nk
  JOIN dw.dim_criterio c ON c.sk_criterio = s.sk_criterio_modificado
  WHERE s.tiposimulacion = 'PESO'
  GROUP BY g.categoriapresupuesto, c.nombre, c.sk_criterio
) x WHERE rk = 1;
```
```sql
-- 7c. Simulaciones de presupuesto, reportadas aparte
SELECT g.categoriapresupuesto, COUNT(*) AS sim_presupuesto
FROM orig o JOIN dw.dim_segmento g ON g.sk_segmento = o.sk_segmento
JOIN sim s ON s.idrecomendacionorigen_nk = o.idrecomendacion_nk
WHERE s.tiposimulacion = 'PRESUPUESTO'
GROUP BY g.categoriapresupuesto;
```

---

## 8. Requerimientos no funcionales

| ID | Requisito | Umbral | Condiciones de medición |
|---|---|---|---|
| RNF-01 | Top 3 (HU-C07) | Servicio p95 ≤ 2000 ms; pantalla completa p95 ≤ 5 s | `POST /rest/v1/rpc/fn_calcular_top3` y `fn_guardar_recomendacion` con `k6` y JWT de usuarios sintéticos; 500 planes activos; 50 usuarios virtuales, 1 s de espera; 1 min de rampa + 5 min estables (≥1.000 solicitudes). `staging` con el plan/compute de producción (§2.3). Sin scroll para ver el plan #1 en 1366×768 y 360×640. |
| RNF-02 | Previsualización (HU-C08) | p95 ≤ 1500 ms | Mismo volumen; RPC de solo lectura; *debounce* de 250 ms en cliente. |
| RNF-03 | Consulta de KPI | p95 ≤ 3000 ms | `fn_kpi_*` con 1.000.000 de filas sintéticas en el hecho; índices en `sk_tiempo`, `sk_zona`, `sk_plan`, `sk_segmento`, `idrecomendacion_nk`; 100 ejecuciones por consulta tras 5 de calentamiento. Válido solo en Pro con el compute declarado. |
| RNF-04 | Integridad del ETL | Conciliación 100% (`leídas = cargadas + rechazadas + omitidas`); rechazo ≤ 1% de filas **nuevas**; máx. 3 filas por recomendación; duración ≤ 15 min | 100.000 recomendaciones (~300.000 filas) en `staging`. |
| RNF-05 | Control de acceso | Ver §8.1 | Ver §8.1 y §9. |
| RNF-06 | Calidad de código | Cobertura ≥ 80% líneas y ≥ 70% ramas en `src/services/**` y `src/lib/**` | `@vitest/coverage-v8` con `coverage.thresholds` en la configuración de Vitest. Verificación negativa: un umbral incumplido DEBE romper el pipeline. La lógica de negocio del motor se mide con RNF-13, no con este umbral. |
| RNF-07 | Pruebas del ETL | 100% de las reglas con prueba | pgTAP en CI (`supabase test db`): 6 reglas, idempotencia, solape, `OMITIDA`, rechazos, invariantes de §5.2. |
| RNF-08 | Respaldo | RPO ≤ 24 h, RTO ≤ 4 h | Requiere Pro. Restauración completa probada antes de producción, con el tiempo registrado en `/docs/rnf/`. |
| RNF-09 | Observabilidad del ETL | Alerta ≤ 15 min | Estados `ERROR`/`ALERTA`/`OMITIDA` visibles en `/admin/etl` y notificados por correo al responsable de D-34 mediante la Edge Function `notificar-etl`. |
| RNF-10 | Seguridad | 0 fallas | HTTPS con TLS ≥ 1.2; cabeceras definidas en `vercel.json`: HSTS `max-age ≥ 31536000; includeSubDomains`, `Content-Security-Policy` restrictiva (todo recurso externo, como fuentes o iconos, se autoriza explícitamente o se autoaloja), `X-Content-Type-Options`, `Referrer-Policy` y `frame-ancestors 'none'`; pgTAP de RLS (3 roles + `anon` × cada tabla y función de §2.4); 0 secretos en `dist/`; `npm audit` sin altas/críticas; checklist OWASP Top 10 completo. *El anti-forgery de v1.2 no aplica (la API usa JWT en cabecera, no cookies); en su lugar se exige CSP estricta, porque `supabase-js` conserva la sesión en el almacenamiento del navegador.* |
| RNF-11 | Compatibilidad | Últimas 2 versiones de Chrome/Edge/Firefox/Safari | Desde 360 px sin scroll horizontal; objetivos táctiles ≥ 44×44 px. |
| RNF-12 | Accesibilidad | Lighthouse ≥ 90 | Contraste ≥ 4,5:1; operable por teclado. |
| RNF-13 | Pruebas de frontera del motor | 100% de las reglas de §3 con prueba | pgTAP con igualdad exacta: los 6 casos de §4, valores límite de presupuesto (1,00 y 10.000,00), desempate en 3 niveles, 0/1/2/3 candidatos, las 95 combinaciones de §4.7. |
| RNF-14 | Integridad del estado en cliente (nuevo) | 0 datos de dominio en almacenamiento local; 0 falsos "guardado" | La prueba de arquitectura (§2.9) verifica lo primero; una prueba de componente verifica que, ante un error de RPC, la interfaz no informa éxito. |
| RNF-15 | Reproducibilidad del esquema (nuevo) | `supabase db reset` en dev y CI produce un esquema idéntico al de `staging` | `supabase db diff` sin cambios pendientes en CI. |

### 8.1 RNF-05: control de acceso con Supabase Auth [D-44]

| Aspecto | v1.2 (.NET) | v2.0 |
|---|---|---|
| Hash de contraseña | PBKDF2-HMAC-SHA512, 100.000 iteraciones (D-28) | Lo gestiona Supabase Auth y no es configurable por el proyecto. **D-28 queda derogada.** |
| Longitud | 10–128 | Mínimo 10 (configurado en Auth y validado en el cliente). El máximo lo impone Supabase Auth: verificar el valor vigente y ajustar el requisito, que puede ser inferior a 128. |
| Contraseñas filtradas | — | DEBERÍA activarse la protección contra contraseñas filtradas si el plan contratado la ofrece (verificar). |
| Bloqueo por cuenta (5 intentos / 15 min) | Identity con `lockoutOnFailure` | El *Password Verification Hook* de Auth figura solo en Teams y Enterprise (§2.3). **Opción A:** plan Teams + hook con tabla de intentos (la documentación advierte del riesgo de bloquear a usuarios legítimos). **Opción B (Pro):** CAPTCHA (p. ej. Turnstile) y límites de tasa de Auth, con riesgo residual documentado; HU-C03c queda como "no aplica". *Estado: Propuesta B hasta que el Squad ratifique.* |
| Sesión de 30 min | Cookie de sesión de 30 min | Expiración del JWT ≤ 30 min y, si el plan lo ofrece, límite de inactividad de Auth (verificar); además un temporizador de inactividad en el cliente que cierra sesión a los 30 min (UX, no es control de seguridad por sí solo). |
| Confirmación de correo | Enlace 24 h | Confirmación obligatoria. Auth expone un solo parámetro de expiración de enlaces por proyecto (verificar): se fija en **1 h** para confirmación y restablecimiento, con reenvío. HU-C09 pasa de 24 h a 1 h. |
| Correo saliente | MailKit + Brevo | SMTP personalizado de Auth con Brevo (plan gratuito, 300 correos/día, D-30). Las pruebas de carga NO DEBEN ejercitar rutas que envíen correo. |

**[D-34, ratificada]** Responsable de las alertas del ETL: **Ricardo Frontanilla**, `ricardofrontanillasalazar@gmail.com`; destinatario de RNF-09 y titular de una cuenta `admin` (necesaria para HU-C13 y para cargar `indiceEstabilidad`, HU-C01).

**Implementación:** el correo NO se escribe en el código ni en las migraciones. Vive como secreto de la Edge Function `notificar-etl` (`ALERTAS_ETL_RESPONSABLE_CORREO`), lo que permite cambiar el destinatario sin tocar código. **Riesgo de punto único:** si su cuenta de correo o de Administrador queda inaccesible, la alerta no llega a nadie; se documenta como riesgo aceptado del MVP, no como falla de RNF-09. La configuración puede ampliarse a una lista sin cambiar el mecanismo.

---

## 9. Historias de autenticación, roles y gestión (alcance enmendado, §1.1)

**Matriz de acceso y rutas [D-43]** (`react-router-dom`; las guardas de interfaz son UX, la autoridad es RLS/RPC)

| Rol | Redirección tras login | Rutas permitidas |
|---|---|---|
| `admin` | `/admin` | `/admin/**` (catálogo, zonas, cobertura, usuarios, ETL), `/cuenta` |
| `gerente` | `/dashboard` | `/dashboard`, `/cuenta` |
| `usuario` | `/perfil` | `/perfil`, `/recomendacion`, `/simulacion`, `/historial`, `/cuenta` |

Rutas públicas: `/login`, `/registro`, `/restablecer`. Sin sesión, cualquier otra ruta redirige a `/login`.

### HU-C03a: Autenticación — 3 SP (propuesta)
1. Credenciales válidas de una cuenta confirmada → redirección según la matriz.
2. Usuario inexistente, contraseña incorrecta, cuenta sin confirmar o bloqueada → **el mismo mensaje genérico**: la interfaz traduce todos los errores de `signInWithPassword`, salvo los de red, a un solo texto.
3. Un parámetro de retorno externo se ignora; solo se aceptan rutas locales (que empiezan con `/` y no con `//`).

### HU-C03b: Autorización por roles — 3 SP
1. Ruta sin permiso → pantalla 403; sin sesión → redirección a `/login`. Toda operación denegada por RLS o por una RPC se muestra como "sin permiso" (401/403 de PostgREST).
2. Una recomendación ajena por id → "no encontrada" (RLS la oculta).
3. Los guardas usan el rol leído de la base tras el login; si no se puede leer, **se deniega**. Nunca hay un rol por defecto ni de "demostración".
4. Prueba automatizada: Vitest recorre 3 roles × todas las rutas; pgTAP recorre 3 roles + `anon` × cada tabla y función de §2.4 (permitido y denegado).

### HU-C03c: Bloqueo de cuenta — 2 SP (depende de D-44)
- **Opción A:** 5 fallos consecutivos → bloqueo de 15 min con mensaje genérico incluso con la contraseña correcta; un login exitoso reinicia el contador; el Administrador puede desbloquear (HU-C13).
- **Opción B (Pro):** se implementa CAPTCHA tras fallos y se documenta el riesgo residual; esta historia queda sin criterios de bloqueo.

### HU-C09: Registro — 5 SP
1. Correo válido + contraseña que cumple RNF-05 → mensaje genérico y envío del enlace de confirmación (un solo uso, expiración de §8.1).
2. Correo ya registrado → **el mismo mensaje** genérico; no se crea otra cuenta (con la confirmación de correo activa, Auth responde sin distinguir; se verifica en `staging` con una prueba E2E). El aviso al titular es DEBERÍA (requiere el *Send Email Hook*).
3. Toda cuenta nueva recibe **solo** el rol `usuario` mediante `trg_alta_usuario`; ningún dato enviado por el cliente (p. ej. `user_metadata`) puede fijar el rol.
4. Los correos se comparan sin distinguir mayúsculas.

### HU-C12: Restablecer contraseña — 3 SP
1. Cualquier correo (exista o no) → el mismo mensaje genérico. El envío usa `resetPasswordForEmail` con `redirectTo` a `/restablecer`.
2. `/restablecer` procesa el evento `PASSWORD_RECOVERY`, exige una contraseña que cumpla RNF-05 y llama a `updateUser`; luego cierra las demás sesiones (`signOut({ scope: 'others' })`).
3. El enlace es de un solo uso y expira según §8.1.

### HU-C13: Gestión de roles y suspensión — 3 SP
1. El Administrador lista las cuentas (correo, rol, estado) mediante la Edge Function `admin-usuarios`, que verifica su rol antes de usar `service_role`.
2. Asigna `gerente` (un solo rol por cuenta) mediante `fn_asignar_rol`.
3. Con un solo Administrador restante, no se le puede quitar el rol (`fn_asignar_rol` lo valida).
4. Puede desbloquear una cuenta (Opción A, contador de fallos a 0) o suspender/reactivar una cuenta (Opción B) mediante `admin-usuarios`.

### HU-C10: Gestión de zonas — 3 SP
1. Nombre vacío o duplicado (sin distinguir mayúsculas ni tildes) → error.
2. Desactivar (D-26) conserva cobertura, perfiles e historial; reactivar restaura la disponibilidad. Si se desactiva la zona de un perfil, este conserva su `idzona` y el cálculo devuelve `ZONA_INVALIDA` hasta que el usuario elija otra.
3. Sin borrado físico: no existe la acción ni el privilegio `DELETE`.

### HU-C11: Baja y reactivación de planes — 3 SP
1. Un plan desactivado no es candidato en nuevos cálculos.
2. Las recomendaciones históricas con ese plan no cambian (snapshots intactos).
3. La reactivación lo vuelve candidato desde el siguiente cálculo.
4. No existe acción de eliminar plan.

### D-35 (propuesta): guía para cargar `indiceEstabilidad`
El MVP no tiene una fuente automática de uptime por proveedor, así que el valor es una **estimación informada del Administrador** (D-33), guiada por esta banda (no es un cálculo exacto):

| Rango | Guía de asignación |
|---|---|
| 90–100 | Proveedor con reputación de alta confiabilidad; sin quejas recurrentes de caídas conocidas. |
| 70–89 | Servicio confiable en general, con caídas ocasionales reportadas informalmente. |
| 50–69 | Quejas moderadas o frecuentes de intermitencia, sin inutilizar el servicio. |
| 0–49 | Reportes frecuentes de caídas o mal servicio, o proveedor nuevo sin historial. |

- **Consistencia por proveedor:** todos los planes de un proveedor DEBERÍAN cargarse con el mismo valor, salvo evidencia concreta de que un plan se comporta distinto (p. ej., fibra frente a inalámbrico). La interfaz sugiere reutilizar el último valor cargado para ese proveedor, editable.
- **Limitación aceptada para el MVP:** el valor es subjetivo. Se documenta como debilidad conocida del criterio Estabilidad; una fuente objetiva (histórico de incidencias) queda fuera de alcance (D-33) y es candidata para un release posterior.
