-- LLAVE FORANEA zonaproveedor -> zonacobertura (SmartPlan DSS)
-- No destruye datos. Se puede ejecutar mas de una vez.

-- 0) Revision previa (debe devolver 0 filas; si devuelve alguna, esas filas apuntan a una zona que no existe)
-- select * from zonaproveedor zp where not exists (select 1 from zonacobertura z where z.idzona = zp.idzona);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'zonaproveedor_idzona_fkey' and conrelid = 'public.zonaproveedor'::regclass
  ) then
    alter table public.zonaproveedor
      add constraint zonaproveedor_idzona_fkey
      foreign key (idzona) references public.zonacobertura(idzona) on delete cascade;
  end if;
end $$;

-- Refresca la cache de esquema de la API para que reconozca la relacion
notify pgrst, 'reload schema';
