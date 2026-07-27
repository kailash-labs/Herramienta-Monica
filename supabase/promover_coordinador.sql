-- =============================================================================
-- Dar rol de coordinador a un usuario que YA existe en auth.
--
-- Antes de correr esto, invitar a la persona desde el dashboard de Supabase:
--   Authentication → Users → Invite user
-- Ella recibe el correo y elige su propia contrasena. El trigger de la
-- migracion 01 le crea el perfil solo, con rol 'admin_tienda' por defecto.
--
-- Despues, cambiar el correo de abajo y correr en el SQL Editor del dashboard.
-- =============================================================================

update public.perfiles p
set rol = 'coordinador'
from auth.users u
where u.id = p.id
  and u.email = 'CAMBIAR@correo.com';   -- <- el correo de la persona

-- Verificacion
select p.nombre, u.email, p.rol, p.activo
from public.perfiles p
join auth.users u on u.id = p.id
order by p.rol, u.email;


-- =============================================================================
-- Para un administrador de tienda: crear el perfil y darle sus tiendas
-- =============================================================================

-- 1. Asegurar el rol (por defecto ya queda admin_tienda, esto es por las dudas)
-- update public.perfiles p
-- set rol = 'admin_tienda'
-- from auth.users u
-- where u.id = p.id and u.email = 'admin@correo.com';

-- 2. Asignarle las tiendas que administra
-- insert into public.perfil_tiendas (perfil_id, tienda_id)
-- select p.id, t.id
-- from public.perfiles p
-- join auth.users u on u.id = p.id
-- cross join public.tiendas t
-- where u.email = 'admin@correo.com'
--   and t.codigo in ('Q40')          -- <- los codigos de sus tiendas
-- on conflict do nothing;
