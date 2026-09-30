-- PARCHE DE ROLES Y RLS (SmartPlan DSS)
-- Seguro para produccion: NO borra tablas ni datos. Se puede ejecutar mas de una vez.
-- Ejecutar completo en el SQL Editor de Supabase.

begin;

-- 1) Funcion que lee el rol saltandose RLS (evita la recursion en las politicas)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and rol = 'admin'
  );
$$;

-- 2) Politicas de user_roles sin recursion
drop policy if exists roles_read  on user_roles;
drop policy if exists roles_admin on user_roles;

create policy roles_read on user_roles for select to authenticated
  using (auth.uid() = user_id or public.is_admin());

create policy roles_admin on user_roles for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 3) Resto de politicas: usar is_admin() en lugar de la subconsulta
drop policy if exists zonas_write   on zonacobertura;
drop policy if exists zp_write      on zonaproveedor;
drop policy if exists planes_write  on plantelecomunicacion;
drop policy if exists recom_select  on recomendacionresult;
drop policy if exists detalle_select on detallerecomendacion;

create policy zonas_write on zonacobertura for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy zp_write on zonaproveedor for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy planes_write on plantelecomunicacion for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy recom_select on recomendacionresult for select to authenticated
  using (
    idperfil in (select idperfil from perfilusuario where user_id = auth.uid())
    or public.is_admin()
  );

create policy detalle_select on detallerecomendacion for select to authenticated
  using (
    idrecomendacion in (
      select idrecomendacion from recomendacionresult
      where idperfil in (select idperfil from perfilusuario where user_id = auth.uid())
    )
    or public.is_admin()
  );

-- 4) Cada usuario nuevo recibe rol 'usuario' automaticamente
create or replace function public.handle_new_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, rol)
  values (new.id, 'usuario')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_role on auth.users;
create trigger on_auth_user_created_role
after insert on auth.users
for each row execute function public.handle_new_user_role();

-- 5) Cuentas existentes sin fila (no modifica a los que ya tienen rol)
insert into user_roles (user_id, rol)
select id, 'usuario' from auth.users
on conflict (user_id) do nothing;

commit;

-- Verificacion: deberias ver a todos los usuarios con su rol
-- select u.email, r.rol from auth.users u left join user_roles r on r.user_id = u.id order by u.email;
