-- Este script se ejecuta en el SQL Editor de Supabase

-- 1) DROP
DROP VIEW IF EXISTS vw_kpi_simulaciones CASCADE;
DROP VIEW IF EXISTS vw_kpi_zonas CASCADE;
DROP VIEW IF EXISTS vw_kpi_precio_velocidad CASCADE;

DROP TABLE IF EXISTS detallerecomendacion CASCADE;
DROP TABLE IF EXISTS recomendacionresult CASCADE;
DROP TABLE IF EXISTS motoranalitico CASCADE;
DROP TABLE IF EXISTS criterioponderacion CASCADE;
DROP TABLE IF EXISTS perfilusuario CASCADE;
DROP TABLE IF EXISTS plantelecomunicacion CASCADE;
DROP TABLE IF EXISTS zonaproveedor CASCADE;
DROP TABLE IF EXISTS zonacobertura CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;

DROP TABLE IF EXISTS dim_criterio CASCADE;
DROP TABLE IF EXISTS dim_segmento CASCADE;
DROP TABLE IF EXISTS dim_zona CASCADE;
DROP TABLE IF EXISTS dim_plan CASCADE;
DROP TABLE IF EXISTS dim_tiempo CASCADE;

-- 2) TABLAS OLTP

CREATE TABLE zonacobertura (
    idzona SERIAL PRIMARY KEY,
    nombresector VARCHAR(80) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(nombresector)
);

CREATE TABLE zonaproveedor (
    idzona INT,
    proveedor VARCHAR(60),
    nivelcobertura VARCHAR(10) CHECK (nivelcobertura IN ('alta','media','baja')),
    PRIMARY KEY(idzona, proveedor)
);

CREATE TABLE plantelecomunicacion (
    idplan SERIAL PRIMARY KEY,
    proveedor VARCHAR(60),
    nombreplan VARCHAR(80),
    preciomensual DECIMAL(10,2) CHECK (preciomensual >= 0),
    velocidadmbps INT CHECK (velocidadmbps > 0),
    limitedatosgb INT DEFAULT 0 CHECK (limitedatosgb >= 0),
    tecnologia VARCHAR(60) DEFAULT 'Fibra Óptica FTTH',
    indiceestabilidad SMALLINT NOT NULL CHECK (indiceestabilidad BETWEEN 0 AND 100),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    idzona INT REFERENCES zonacobertura(idzona),
    UNIQUE(proveedor, nombreplan)
);

CREATE TABLE perfilusuario (
    idperfil UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    ubicacion VARCHAR(100) DEFAULT '',
    presupuestomax DECIMAL(10,2) NOT NULL DEFAULT 300 CHECK (presupuestomax BETWEEN 1 AND 10000),
    tipousos TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE criterioponderacion (
    idperfil UUID PRIMARY KEY REFERENCES perfilusuario(idperfil) ON DELETE CASCADE,
    criteriosseleccionados TEXT[] NOT NULL DEFAULT '{"precio","velocidad","cobertura"}',
    pesoprecio DECIMAL(3,2) NOT NULL DEFAULT 0.61,
    pesovelocidad DECIMAL(3,2) NOT NULL DEFAULT 0.28,
    pesocobertura DECIMAL(3,2) NOT NULL DEFAULT 0.11,
    pesoestabilidad DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    CHECK (ROUND(pesoprecio + pesovelocidad + pesocobertura + pesoestabilidad, 2) = 1.00)
);

CREATE TABLE motoranalitico (
    idalgoritmo SERIAL PRIMARY KEY,
    nombrealgoritmo VARCHAR(60),
    version VARCHAR(10)
);

CREATE TABLE recomendacionresult (
    idrecomendacion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idperfil UUID REFERENCES perfilusuario(idperfil),
    idalgoritmo INT REFERENCES motoranalitico(idalgoritmo) DEFAULT 1,
    idzona INT REFERENCES zonacobertura(idzona),
    idrecomendacionorigen UUID NULL REFERENCES recomendacionresult(idrecomendacion),
    fechacalculo TIMESTAMPTZ NOT NULL DEFAULT now(),
    versionalgoritmo VARCHAR(20) NOT NULL DEFAULT 'SAW-1.0',
    presupuestousado DECIMAL(10,2) NOT NULL CHECK (presupuestousado BETWEEN 1 AND 10000),
    pesoprecio DECIMAL(3,2) NOT NULL,
    pesovelocidad DECIMAL(3,2) NOT NULL,
    pesocobertura DECIMAL(3,2) NOT NULL,
    pesoestabilidad DECIMAL(3,2) NOT NULL,
    essimulacion BOOLEAN NOT NULL DEFAULT FALSE,
    essimulacionorigen BOOLEAN NOT NULL DEFAULT FALSE,
    tiposimulacion TEXT NULL CHECK (tiposimulacion IN ('PESO','PRESUPUESTO')),
    criteriomodificado TEXT NULL CHECK (criteriomodificado IN ('precio','velocidad','cobertura','estabilidad')),
    CHECK ((essimulacion = FALSE AND idrecomendacionorigen IS NULL AND tiposimulacion IS NULL) OR (essimulacion = TRUE AND idrecomendacionorigen IS NOT NULL AND tiposimulacion IS NOT NULL)),
    CHECK (ROUND(pesoprecio + pesovelocidad + pesocobertura + pesoestabilidad, 2) = 1.00)
);

CREATE TABLE detallerecomendacion (
    iddetalle UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idrecomendacion UUID REFERENCES recomendacionresult(idrecomendacion) ON DELETE CASCADE,
    idplan INT REFERENCES plantelecomunicacion(idplan),
    posicion SMALLINT NOT NULL CHECK (posicion BETWEEN 1 AND 3),
    puntajetotal DECIMAL(5,4) NOT NULL CHECK (puntajetotal BETWEEN 0 AND 1),
    puntajeprecio DECIMAL(5,4) NOT NULL DEFAULT 0,
    puntajevelocidad DECIMAL(5,4) NOT NULL DEFAULT 0,
    puntajecobertura DECIMAL(5,4) NOT NULL DEFAULT 0,
    puntajeestabilidad DECIMAL(5,4) NOT NULL DEFAULT 0,
    preciosnapshot DECIMAL(10,2) NOT NULL,
    velocidadsnapshot INT NOT NULL,
    UNIQUE(idrecomendacion, posicion)
);

CREATE TABLE user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    rol TEXT NOT NULL DEFAULT 'usuario' CHECK (rol IN ('usuario','gerente','admin'))
);

-- 3) TRIGGER

CREATE OR REPLACE FUNCTION fn_set_essimulacionorigen()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.idrecomendacionorigen IS NOT NULL THEN
        SELECT essimulacion INTO NEW.essimulacionorigen
        FROM recomendacionresult
        WHERE idrecomendacion = NEW.idrecomendacionorigen;
        
        IF NEW.essimulacionorigen = TRUE THEN
            RAISE EXCEPTION 'La recomendacion origen no puede ser una simulacion';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_essimulacionorigen
BEFORE INSERT ON recomendacionresult
FOR EACH ROW
EXECUTE FUNCTION fn_set_essimulacionorigen();

-- 4) UNIQUE INDEX

CREATE UNIQUE INDEX idx_recomendacion_simulacion ON recomendacionresult(idrecomendacionorigen) WHERE essimulacion = TRUE;

-- 5) RLS

ALTER TABLE zonacobertura ENABLE ROW LEVEL SECURITY;
ALTER TABLE zonaproveedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantelecomunicacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfilusuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE criterioponderacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE recomendacionresult ENABLE ROW LEVEL SECURITY;
ALTER TABLE detallerecomendacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY zonas_read ON zonacobertura FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY zonas_write ON zonacobertura FOR ALL TO authenticated USING ((SELECT rol FROM user_roles WHERE user_id = auth.uid()) = 'admin');

CREATE POLICY zp_read ON zonaproveedor FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY zp_write ON zonaproveedor FOR ALL TO authenticated USING ((SELECT rol FROM user_roles WHERE user_id = auth.uid()) = 'admin');

CREATE POLICY planes_read ON plantelecomunicacion FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY planes_write ON plantelecomunicacion FOR ALL TO authenticated USING ((SELECT rol FROM user_roles WHERE user_id = auth.uid()) = 'admin');

CREATE POLICY perfil_own ON perfilusuario FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY criterio_own ON criterioponderacion FOR ALL TO authenticated USING (idperfil IN (SELECT idperfil FROM perfilusuario WHERE user_id = auth.uid()));

CREATE POLICY recom_own ON recomendacionresult FOR ALL TO authenticated
    USING (idperfil IN (SELECT idperfil FROM perfilusuario WHERE user_id = auth.uid())
           OR (SELECT rol FROM user_roles WHERE user_id = auth.uid()) IN ('admin','gerente'));

CREATE POLICY detalle_own ON detallerecomendacion FOR ALL TO authenticated
    USING (idrecomendacion IN (
        SELECT idrecomendacion FROM recomendacionresult
        WHERE idperfil IN (SELECT idperfil FROM perfilusuario WHERE user_id = auth.uid())
        OR (SELECT rol FROM user_roles WHERE user_id = auth.uid()) IN ('admin','gerente')
    ));

CREATE POLICY roles_read ON user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR (SELECT rol FROM user_roles WHERE user_id = auth.uid()) = 'admin');
CREATE POLICY roles_admin ON user_roles FOR ALL TO authenticated USING ((SELECT rol FROM user_roles WHERE user_id = auth.uid()) = 'admin');

-- 6) TABLAS DW

CREATE TABLE dim_tiempo (
    idtiempo SERIAL PRIMARY KEY,
    fecha DATE UNIQUE,
    dia INT,
    mes INT,
    nombremes VARCHAR(15),
    trimestre INT,
    anio INT,
    diasemana VARCHAR(10),
    esfindesemana BOOLEAN
);

CREATE TABLE dim_plan (
    sk_plan SERIAL PRIMARY KEY,
    idplanorigen INT,
    proveedor VARCHAR(60),
    nombreplan VARCHAR(80),
    rangovelociodad VARCHAR(20),
    rangoprecio VARCHAR(20)
);

CREATE TABLE dim_zona (
    sk_zona SERIAL PRIMARY KEY,
    idzonaorigen INT,
    nombresector VARCHAR(80),
    coberturapredominate VARCHAR(20)
);

CREATE TABLE dim_segmento (
    sk_segmento SERIAL PRIMARY KEY,
    categoriapresupuesto VARCHAR(20) CHECK (categoriapresupuesto IN ('Bajo','Medio','Alto')),
    segmentouso VARCHAR(30)
);

CREATE TABLE dim_criterio (
    sk_criterio SMALLINT PRIMARY KEY,
    nombre VARCHAR(20)
);

-- 7) VISTAS KPI

CREATE OR REPLACE VIEW vw_kpi_precio_velocidad AS
SELECT p.proveedor,
       EXTRACT(YEAR FROM r.fechacalculo AT TIME ZONE 'America/La_Paz') AS anio,
       EXTRACT(MONTH FROM r.fechacalculo AT TIME ZONE 'America/La_Paz') AS mes,
       AVG(d.preciosnapshot) AS precio_prom,
       AVG(d.velocidadsnapshot) AS velocidad_prom,
       COUNT(DISTINCT r.idrecomendacion) AS total_recomendaciones
FROM recomendacionresult r
JOIN detallerecomendacion d ON d.idrecomendacion = r.idrecomendacion
JOIN plantelecomunicacion p ON p.idplan = d.idplan
WHERE r.essimulacion = FALSE
GROUP BY p.proveedor, anio, mes
ORDER BY anio, mes, p.proveedor;

CREATE OR REPLACE VIEW vw_kpi_zonas AS
SELECT z.nombresector,
       COUNT(DISTINCT r.idrecomendacion) AS total_recomendaciones,
       AVG(d.puntajetotal) FILTER (WHERE d.posicion = 1) AS puntaje_global_prom,
       COUNT(DISTINCT r.idrecomendacion)::NUMERIC /
           NULLIF(SUM(COUNT(DISTINCT r.idrecomendacion)) OVER (), 0) AS pct_total
FROM recomendacionresult r
JOIN zonacobertura z ON z.idzona = r.idzona
JOIN detallerecomendacion d ON d.idrecomendacion = r.idrecomendacion
WHERE r.essimulacion = FALSE
GROUP BY z.idzona, z.nombresector
ORDER BY total_recomendaciones DESC, z.nombresector;

CREATE OR REPLACE VIEW vw_kpi_simulaciones AS
SELECT
    CASE WHEN r.presupuestousado < 120 THEN 'Bajo'
         WHEN r.presupuestousado <= 200 THEN 'Medio'
         ELSE 'Alto'
    END AS rango_presupuesto,
    COUNT(DISTINCT r.idrecomendacion) AS originales,
    COUNT(DISTINCT s.idrecomendacion) FILTER (WHERE s.essimulacion) AS con_simulacion,
    MODE() WITHIN GROUP (ORDER BY s.criteriomodificado)
        FILTER (WHERE s.tiposimulacion = 'PESO') AS criterio_mas_modificado
FROM recomendacionresult r
LEFT JOIN recomendacionresult s ON s.idrecomendacionorigen = r.idrecomendacion
WHERE r.essimulacion = FALSE
GROUP BY rango_presupuesto;

GRANT SELECT ON vw_kpi_precio_velocidad TO authenticated;
GRANT SELECT ON vw_kpi_zonas TO authenticated;
GRANT SELECT ON vw_kpi_simulaciones TO authenticated;

-- 8) SEED DATA

-- 8) SEED DATA (9 Departamentos de Bolivia y Ciudades Principales)

INSERT INTO zonacobertura (idzona, nombresector, activo) VALUES
(1, 'La Paz (Centro, Sopocachi, Zona Sur) - Dpto. La Paz', TRUE),
(2, 'El Alto (Ciudad Satélite, 16 de Julio) - Dpto. La Paz', TRUE),
(3, 'Santa Cruz de la Sierra (Equipetrol, Anillos 1-4) - Dpto. Santa Cruz', TRUE),
(4, 'Montero y Warnes (Norte Integrado) - Dpto. Santa Cruz', TRUE),
(5, 'Cochabamba (Cercado - Zona Norte/Centro) - Dpto. Cochabamba', TRUE),
(6, 'Quillacollo y Sacaba (Valle Bajo/Alto) - Dpto. Cochabamba', TRUE),
(7, 'Sucre (Casco Viejo, Zona Urbana) - Dpto. Chuquisaca', TRUE),
(8, 'Oruro (Ciudad Central y Zona Minera) - Dpto. Oruro', TRUE),
(9, 'Potosí (Ciudad Alta y Centro Histórico) - Dpto. Potosí', TRUE),
(10, 'Tarija (Cercado y San Lorenzo) - Dpto. Tarija', TRUE),
(11, 'Yacuiba y Bermejo (Gran Chaco) - Dpto. Tarija', TRUE),
(12, 'Trinidad y Riberalta (Zona Amazónica) - Dpto. Beni', TRUE),
(13, 'Cobija y Porvenir (Zona Urbana/Frontera) - Dpto. Pando', TRUE),
(14, 'Uyuni y Salar (Zona Turística/Sur) - Dpto. Potosí', TRUE);

-- Ajustar la secuencia del SERIAL de idzona
SELECT setval('zonacobertura_idzona_seq', 14, true);

INSERT INTO zonaproveedor (idzona, proveedor, nivelcobertura) VALUES
-- 1. La Paz
(1,'Entel','alta'),(1,'Viva','alta'),(1,'Tigo','alta'),
-- 2. El Alto
(2,'Entel','alta'),(2,'Viva','media'),(2,'Tigo','alta'),
-- 3. Santa Cruz
(3,'Entel','alta'),(3,'Viva','alta'),(3,'Tigo','alta'),
-- 4. Montero / Warnes
(4,'Entel','alta'),(4,'Viva','media'),(4,'Tigo','alta'),
-- 5. Cochabamba Cercado
(5,'Entel','alta'),(5,'Viva','alta'),(5,'Tigo','alta'),
-- 6. Quillacollo / Sacaba
(6,'Entel','alta'),(6,'Viva','media'),(6,'Tigo','media'),
-- 7. Sucre
(7,'Entel','alta'),(7,'Viva','media'),(7,'Tigo','alta'),
-- 8. Oruro
(8,'Entel','alta'),(8,'Viva','media'),(8,'Tigo','media'),
-- 9. Potosí
(9,'Entel','alta'),(9,'Viva','baja'),(9,'Tigo','media'),
-- 10. Tarija
(10,'Entel','alta'),(10,'Viva','media'),(10,'Tigo','alta'),
-- 11. Yacuiba
(11,'Entel','alta'),(11,'Viva','baja'),(11,'Tigo','media'),
-- 12. Trinidad / Beni
(12,'Entel','alta'),(12,'Viva','baja'),(12,'Tigo','baja'),
-- 13. Cobija / Pando
(13,'Entel','alta'),(13,'Viva','baja'),
-- 14. Uyuni
(14,'Entel','media'),(14,'Viva','baja'),(14,'Tigo','baja');

INSERT INTO plantelecomunicacion (proveedor,nombreplan,preciomensual,velocidadmbps,limitedatosgb,tecnologia,indiceestabilidad,activo,idzona) VALUES
('Entel','Entel Fibra 30',149,30,0,'Fibra Óptica GPON',88,TRUE,1),
('Entel','Entel Fibra 60',169,60,0,'Fibra Óptica GPON',90,TRUE,1),
('Entel','Entel Fibra 120',229,120,0,'Fibra Óptica GPON',93,TRUE,1),
('Entel','Entel Fibra Empresa 300',369,300,0,'Fibra Óptica GPON Empresarial',96,TRUE,1),
('Entel','Entel Fibra Empresa 450',499,450,0,'Fibra Óptica GPON Empresarial',97,TRUE,1),
('Viva','Viva Fibra 60',179,60,0,'Fibra Óptica FTTH',87,TRUE,1),
('Viva','Viva Fibra 90',209,90,0,'Fibra Óptica FTTH',89,TRUE,1),
('Viva','Viva Fibra 120',239,120,0,'Fibra Óptica FTTH',90,TRUE,1),
('Viva','Viva WiFi LTE Explora',199,16,600,'LTE Fijo Inalámbrico 4G',72,TRUE,3),
('Viva','Viva WiFi LTE Libre',249,22,800,'LTE Fijo Inalámbrico 4G',74,TRUE,3),
('Tigo','Tigo Hogar 50',189,50,0,'Fibra Óptica FTTH',91,TRUE,1),
('Tigo','Tigo Hogar 100',229,100,0,'Fibra Óptica FTTH',93,TRUE,1),
('Tigo','Tigo Hogar 200',319,200,0,'Fibra Óptica FTTH',94,TRUE,1),
('Tigo','Tigo Business 150',349,150,0,'Fibra Óptica FTTH Empresarial',95,TRUE,1),
('Tigo','Tigo Business 400',549,400,0,'Fibra Óptica FTTH Empresarial',96,TRUE,1);

INSERT INTO motoranalitico (nombrealgoritmo, version) VALUES ('SAW (Simple Additive Weighting)','1.0');

INSERT INTO dim_criterio (sk_criterio, nombre) VALUES (0,'Ninguno'),(1,'Precio'),(2,'Velocidad'),(3,'Cobertura'),(4,'Estabilidad');
