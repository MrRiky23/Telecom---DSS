-- ============================================================================
-- SmartPlan DSS - Sistema de Soporte a Decisiones para Planes de Internet
-- Actividad 5: Arquitectura Dual - Del CRUD al Data Warehouse
-- Grupo: Nucita Premium
-- Dialecto: PostgreSQL (compatible, con ajustes menores, con MySQL/SQL Server)
-- ============================================================================


-- ============================================================================
-- 1) MODELO TRANSACCIONAL OLTP (CRUD) - Normalizado hasta 3FN
-- ============================================================================

DROP TABLE IF EXISTS DetalleRecomendacion CASCADE;
DROP TABLE IF EXISTS RecomendacionResult CASCADE;
DROP TABLE IF EXISTS CriterioPonderacion CASCADE;
DROP TABLE IF EXISTS MotorAnalitico CASCADE;
DROP TABLE IF EXISTS PlanTelecomunicacion CASCADE;
DROP TABLE IF EXISTS PerfilUsuario CASCADE;
DROP TABLE IF EXISTS ZonaCobertura CASCADE;

-- 1.1 ZonaCobertura -----------------------------------------------------------
CREATE TABLE ZonaCobertura (
    idZona          SERIAL PRIMARY KEY,
    nombreSector    VARCHAR(80)     NOT NULL,
    porcentajeAlta  DECIMAL(5,2)    NOT NULL CHECK (porcentajeAlta  BETWEEN 0 AND 100),
    porcentajeMedia DECIMAL(5,2)    NOT NULL CHECK (porcentajeMedia BETWEEN 0 AND 100),
    porcentajeBaja  DECIMAL(5,2)    NOT NULL CHECK (porcentajeBaja  BETWEEN 0 AND 100),
    CONSTRAINT ck_zona_suma_100 CHECK (porcentajeAlta + porcentajeMedia + porcentajeBaja = 100)
);

-- 1.2 PlanTelecomunicacion (N:1 con ZonaCobertura) -----------------------------
CREATE TABLE PlanTelecomunicacion (
    idPlan          SERIAL PRIMARY KEY,
    proveedor       VARCHAR(60)     NOT NULL,
    nombrePlan      VARCHAR(80)     NOT NULL,
    precioMensual   DECIMAL(8,2)    NOT NULL CHECK (precioMensual >= 0),
    velocidadMbps   INT             NOT NULL CHECK (velocidadMbps > 0),
    limiteDatosGB   INT             NOT NULL CHECK (limiteDatosGB >= 0),
    nivelCobertura  VARCHAR(20)     NOT NULL CHECK (nivelCobertura IN ('Alta','Media','Baja')),
    activo          BOOLEAN         NOT NULL DEFAULT TRUE,
    idZona          INT             NOT NULL,
    CONSTRAINT fk_plan_zona FOREIGN KEY (idZona) REFERENCES ZonaCobertura(idZona),
    CONSTRAINT uq_plan_duplicado UNIQUE (proveedor, nombrePlan, idZona)
);

-- 1.3 PerfilUsuario -------------------------------------------------------------
CREATE TABLE PerfilUsuario (
    idPerfil        SERIAL PRIMARY KEY,
    ubicacion       VARCHAR(100)    NOT NULL,
    presupuestoMax  DECIMAL(8,2)    NOT NULL CHECK (presupuestoMax >= 0),
    usoEstimadoGB   INT             NOT NULL CHECK (usoEstimadoGB >= 0)
);

-- 1.4 CriterioPonderacion (1:1 por composicion con PerfilUsuario) --------------
CREATE TABLE CriterioPonderacion (
    idPerfil        INT             PRIMARY KEY,
    pesoPrecio      DECIMAL(4,2)    NOT NULL CHECK (pesoPrecio      BETWEEN 0 AND 1),
    pesoVelocidad   DECIMAL(4,2)    NOT NULL CHECK (pesoVelocidad   BETWEEN 0 AND 1),
    pesoCobertura   DECIMAL(4,2)    NOT NULL CHECK (pesoCobertura   BETWEEN 0 AND 1),
    pesoEstabilidad DECIMAL(4,2)    NOT NULL CHECK (pesoEstabilidad BETWEEN 0 AND 1),
    CONSTRAINT fk_criterio_perfil FOREIGN KEY (idPerfil) REFERENCES PerfilUsuario(idPerfil) ON DELETE CASCADE,
    CONSTRAINT ck_pesos_normalizados CHECK (pesoPrecio + pesoVelocidad + pesoCobertura + pesoEstabilidad = 1)
);

-- 1.5 MotorAnalitico (trazabilidad del algoritmo/version usados) --------------
CREATE TABLE MotorAnalitico (
    idAlgoritmo     SERIAL PRIMARY KEY,
    nombreAlgoritmo VARCHAR(60)     NOT NULL,
    version         VARCHAR(10)     NOT NULL
);

-- 1.6 RecomendacionResult (N:1 con PerfilUsuario y MotorAnalitico; ------------
--     auto-referencia para simulaciones -> HU-03) -----------------------------
CREATE TABLE RecomendacionResult (
    idRecomendacion         SERIAL PRIMARY KEY,
    idPerfil                INT             NOT NULL,
    idAlgoritmo             INT             NOT NULL,
    idRecomendacionOrigen   INT             NULL,
    fechaCalculo            TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    puntajeGlobal           DECIMAL(5,2)    NOT NULL CHECK (puntajeGlobal BETWEEN 0 AND 100),
    esSimulacion            BOOLEAN         NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_recom_perfil  FOREIGN KEY (idPerfil)              REFERENCES PerfilUsuario(idPerfil),
    CONSTRAINT fk_recom_motor   FOREIGN KEY (idAlgoritmo)           REFERENCES MotorAnalitico(idAlgoritmo),
    CONSTRAINT fk_recom_origen  FOREIGN KEY (idRecomendacionOrigen) REFERENCES RecomendacionResult(idRecomendacion),
    -- si es simulacion, debe tener una recomendacion de origen
    CONSTRAINT ck_simulacion_origen CHECK (
        (esSimulacion = FALSE AND idRecomendacionOrigen IS NULL) OR
        (esSimulacion = TRUE  AND idRecomendacionOrigen IS NOT NULL)
    )
);

-- 1.7 DetalleRecomendacion (tabla intermedia N:M para el Top-3) ---------------
CREATE TABLE DetalleRecomendacion (
    idRecomendacion     INT             NOT NULL,
    idPlan              INT             NOT NULL,
    posicionRanking     INT             NOT NULL CHECK (posicionRanking BETWEEN 1 AND 3),
    puntajeIndividual   DECIMAL(5,2)    NOT NULL CHECK (puntajeIndividual BETWEEN 0 AND 100),
    PRIMARY KEY (idRecomendacion, idPlan),
    CONSTRAINT fk_detalle_recom FOREIGN KEY (idRecomendacion) REFERENCES RecomendacionResult(idRecomendacion) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_plan  FOREIGN KEY (idPlan)          REFERENCES PlanTelecomunicacion(idPlan),
    CONSTRAINT uq_detalle_posicion UNIQUE (idRecomendacion, posicionRanking)
);

-- Indices de apoyo para las consultas mas frecuentes del CRUD -----------------
CREATE INDEX idx_plan_zona           ON PlanTelecomunicacion(idZona);
CREATE INDEX idx_plan_proveedor      ON PlanTelecomunicacion(proveedor);
CREATE INDEX idx_recom_perfil        ON RecomendacionResult(idPerfil);
CREATE INDEX idx_recom_fecha         ON RecomendacionResult(fechaCalculo);
CREATE INDEX idx_detalle_plan        ON DetalleRecomendacion(idPlan);


-- ============================================================================
-- 2) DATA WAREHOUSE (DSS) - Esquema en Estrella
--    Grano: 1 fila = 1 plan recomendado, en una posicion del ranking,
--    dentro de una recomendacion (original o simulada) puntual.
-- ============================================================================

DROP TABLE IF EXISTS FACT_Recomendacion CASCADE;
DROP TABLE IF EXISTS DIM_Tiempo   CASCADE;
DROP TABLE IF EXISTS DIM_Usuario  CASCADE;
DROP TABLE IF EXISTS DIM_Plan     CASCADE;
DROP TABLE IF EXISTS DIM_Zona     CASCADE;
DROP TABLE IF EXISTS DIM_Criterio CASCADE;

-- 2.1 DIM_Tiempo ----------------------------------------------------------------
CREATE TABLE DIM_Tiempo (
    idTiempo        SERIAL PRIMARY KEY,
    fecha           DATE            NOT NULL UNIQUE,
    dia             INT             NOT NULL,
    mes             INT             NOT NULL,
    nombreMes       VARCHAR(15)     NOT NULL,
    trimestre       INT             NOT NULL,
    anio            INT             NOT NULL,
    diaSemana       VARCHAR(10)     NOT NULL,
    esFinDeSemana   BOOLEAN         NOT NULL
);

-- 2.2 DIM_Usuario (desnormalizada a partir de PerfilUsuario) --------------------
CREATE TABLE DIM_Usuario (
    idUsuario         SERIAL PRIMARY KEY,
    idPerfilOrigen    INT             NOT NULL,   -- referencia logica al OLTP (idPerfil)
    ubicacion         VARCHAR(100)    NOT NULL,
    rangoPresupuesto  VARCHAR(20)     NOT NULL CHECK (rangoPresupuesto IN ('Bajo','Medio','Alto')),
    segmentoUso       VARCHAR(20)     NOT NULL CHECK (segmentoUso IN ('Ligero','Moderado','Intensivo'))
);

-- 2.3 DIM_Plan (desnormalizada a partir de PlanTelecomunicacion) ---------------
CREATE TABLE DIM_Plan (
    idPlan          SERIAL PRIMARY KEY,
    idPlanOrigen    INT             NOT NULL,     -- referencia logica al OLTP (idPlan)
    proveedor       VARCHAR(60)     NOT NULL,
    nombrePlan      VARCHAR(80)     NOT NULL,
    rangoVelocidad  VARCHAR(20)     NOT NULL,
    rangoPrecio     VARCHAR(20)     NOT NULL,
    nivelCobertura  VARCHAR(20)     NOT NULL
);

-- 2.4 DIM_Zona (desnormalizada a partir de ZonaCobertura) ----------------------
CREATE TABLE DIM_Zona (
    idZona                          SERIAL PRIMARY KEY,
    idZonaOrigen                    INT             NOT NULL, -- referencia logica al OLTP (idZona)
    nombreSector                    VARCHAR(80)     NOT NULL,
    categoriaCoberturaPredominante  VARCHAR(20)     NOT NULL CHECK (categoriaCoberturaPredominante IN ('Alta','Media','Baja'))
);

-- 2.5 DIM_Criterio ---------------------------------------------------------------
CREATE TABLE DIM_Criterio (
    idCriterio        SERIAL PRIMARY KEY,
    criterioDominante VARCHAR(20)     NOT NULL CHECK (criterioDominante IN ('Precio','Velocidad','Cobertura','Estabilidad')),
    descripcion       VARCHAR(100)
);

-- 2.6 FACT_Recomendacion (tabla de hechos: solo FKs + metricas) ----------------
CREATE TABLE FACT_Recomendacion (
    idRecomendacion_sk         BIGSERIAL PRIMARY KEY,
    idTiempo                   INT             NOT NULL,
    idUsuario                  INT             NOT NULL,
    idPlan                     INT             NOT NULL,
    idZona                     INT             NOT NULL,
    idCriterio                 INT             NOT NULL,
    posicionRanking            INT             NOT NULL CHECK (posicionRanking BETWEEN 1 AND 3),
    puntajeIndividual          DECIMAL(5,2)    NOT NULL,
    puntajeGlobal              DECIMAL(5,2)    NOT NULL,
    precioPlan_snapshot        DECIMAL(8,2)    NOT NULL,
    velocidadMbps_snapshot     INT             NOT NULL,
    presupuestoMax_snapshot    DECIMAL(8,2)    NOT NULL,
    usoEstimadoGB_snapshot     INT             NOT NULL,
    esSimulacion                BOOLEAN        NOT NULL DEFAULT FALSE,
    idRecomendacionOrigen_sk    BIGINT         NULL,   -- referencia logica a esta misma tabla (recomendacion original)
    CONSTRAINT fk_fact_tiempo   FOREIGN KEY (idTiempo)   REFERENCES DIM_Tiempo(idTiempo),
    CONSTRAINT fk_fact_usuario  FOREIGN KEY (idUsuario)  REFERENCES DIM_Usuario(idUsuario),
    CONSTRAINT fk_fact_plan     FOREIGN KEY (idPlan)     REFERENCES DIM_Plan(idPlan),
    CONSTRAINT fk_fact_zona     FOREIGN KEY (idZona)     REFERENCES DIM_Zona(idZona),
    CONSTRAINT fk_fact_criterio FOREIGN KEY (idCriterio) REFERENCES DIM_Criterio(idCriterio)
);

-- Indices de apoyo para las consultas analiticas (KPIs) -------------------------
CREATE INDEX idx_fact_tiempo   ON FACT_Recomendacion(idTiempo);
CREATE INDEX idx_fact_usuario  ON FACT_Recomendacion(idUsuario);
CREATE INDEX idx_fact_plan     ON FACT_Recomendacion(idPlan);
CREATE INDEX idx_fact_zona     ON FACT_Recomendacion(idZona);
CREATE INDEX idx_fact_criterio ON FACT_Recomendacion(idCriterio);


-- ============================================================================
-- 3) CONSULTAS DE EJEMPLO PARA LOS 3 KPIs DEL NEGOCIO
-- ============================================================================

-- KPI 1 (HU-02): precio y velocidad promedio del Top 3, por proveedor y mes
-- SELECT dp.proveedor,
--        dt.anio, dt.mes, dt.nombreMes,
--        ROUND(AVG(f.precioPlan_snapshot), 2)    AS precio_promedio,
--        ROUND(AVG(f.velocidadMbps_snapshot), 2) AS velocidad_promedio
-- FROM FACT_Recomendacion f
-- JOIN DIM_Plan   dp ON dp.idPlan   = f.idPlan
-- JOIN DIM_Tiempo dt ON dt.idTiempo = f.idTiempo
-- WHERE f.esSimulacion = FALSE
-- GROUP BY dp.proveedor, dt.anio, dt.mes, dt.nombreMes
-- ORDER BY dt.anio, dt.mes, dp.proveedor;

-- KPI 2 (HU-01): zona con mas recomendaciones y su puntaje global promedio
-- SELECT dz.nombreSector,
--        COUNT(*)                          AS total_recomendaciones,
--        ROUND(AVG(f.puntajeGlobal), 2)     AS puntaje_global_promedio
-- FROM FACT_Recomendacion f
-- JOIN DIM_Zona dz ON dz.idZona = f.idZona
-- GROUP BY dz.nombreSector
-- ORDER BY total_recomendaciones DESC;

-- KPI 3 (HU-03): % de recomendaciones simuladas y criterio mas ajustado,
--                por rango de presupuesto
-- SELECT du.rangoPresupuesto,
--        dc.criterioDominante,
--        COUNT(*) FILTER (WHERE f.esSimulacion = TRUE)                 AS total_simulaciones,
--        ROUND(100.0 * COUNT(*) FILTER (WHERE f.esSimulacion = TRUE)
--              / NULLIF(COUNT(*), 0), 2)                                AS pct_simulacion
-- FROM FACT_Recomendacion f
-- JOIN DIM_Usuario  du ON du.idUsuario  = f.idUsuario
-- JOIN DIM_Criterio dc ON dc.idCriterio = f.idCriterio
-- GROUP BY du.rangoPresupuesto, dc.criterioDominante
-- ORDER BY du.rangoPresupuesto, pct_simulacion DESC;
