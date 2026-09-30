-- PARCHE PANEL ADMIN (SmartPlan DSS)
-- Requiere haber ejecutado antes parche-roles.sql (usa public.is_admin()).
-- No borra datos. Se puede ejecutar mas de una vez.

begin;

-- 1) Lista de usuarios con correo y fechas (solo para admins).
--    El navegador no puede leer auth.users; esta funcion lo hace de forma controlada.
create or replace function public.admin_listar_usuarios()
returns table (
  user_id uuid,
  email text,
  rol text,
  creado timestamptz,
  ultimo_acceso timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  return query
    select u.id,
           u.email::text,
           coalesce(r.rol, 'usuario')::text,
           u.created_at,
           u.last_sign_in_at
    from auth.users u
    left join public.user_roles r on r.user_id = u.id
    order by u.created_at desc;
end;
$$;

-- 2) Cambio de rol con reglas en el servidor:
--    solo admins, solo 'usuario' o 'gerente', nunca sobre un admin ni sobre uno mismo.
create or replace function public.admin_cambiar_rol(p_user uuid, p_rol text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actual text;
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if p_rol not in ('usuario', 'gerente') then
    raise exception 'Solo se puede asignar usuario o gerente';
  end if;

  if p_user = auth.uid() then
    raise exception 'No puedes cambiar tu propio rol';
  end if;

  select rol into v_actual from public.user_roles where user_id = p_user;
  if v_actual = 'admin' then
    raise exception 'No se puede cambiar el rol de un administrador';
  end if;

  insert into public.user_roles (user_id, rol)
  values (p_user, p_rol)
  on conflict (user_id) do update set rol = excluded.rol;
end;
$$;

-- 3) Solo usuarios autenticados pueden llamarlas (dentro, ademas, se exige ser admin)
revoke all on function public.admin_listar_usuarios() from public, anon;
revoke all on function public.admin_cambiar_rol(uuid, text) from public, anon;
grant execute on function public.admin_listar_usuarios() to authenticated;
grant execute on function public.admin_cambiar_rol(uuid, text) to authenticated;

commit;
