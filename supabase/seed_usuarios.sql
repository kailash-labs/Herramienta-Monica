-- =============================================================================
-- Usuarios de desarrollo local · monica123 / admin123
--
-- Crea cuentas con contrasenas conocidas. En produccion serian una puerta
-- abierta, asi que el archivo se niega a correr salvo que se lo confirme
-- explicitamente. Un pegado accidental en el SQL Editor del dashboard falla:
--
--   docker exec -i supabase_db_Herramienta-Monica psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -c "set app.entorno_local = 'si'" \
--     -f /dev/stdin < supabase/seed_usuarios.sql
--
-- O mas comodo, con el guard en la misma sesion (ver README).
-- =============================================================================

do $$
begin
  if coalesce(current_setting('app.entorno_local', true), '') <> 'si' then
    raise exception
      'Este archivo crea usuarios con contrasenas conocidas y es solo para la base local. '
      'Si de verdad estas en local, corre antes:  set app.entorno_local = ''si'';';
  end if;
end
$$;

-- Monica (coordinadora, ve todas las tiendas)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  -- GoTrue no tolera null en estas columnas: espera cadena vacia
  confirmation_token, recovery_token, email_change_token_new,
  email_change_token_current, phone_change_token, reauthentication_token,
  email_change
)
values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated',
  'monica@kailash.co', crypt('monica123', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"nombre":"Mónica"}',
  '', '', '', '', '', '', ''
)
on conflict (id) do nothing;

-- Administrador de tienda (solo ve Q40)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  -- GoTrue no tolera null en estas columnas: espera cadena vacia
  confirmation_token, recovery_token, email_change_token_new,
  email_change_token_current, phone_change_token, reauthentication_token,
  email_change
)
values (
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-222222222222',
  'authenticated', 'authenticated',
  'mauricio@kailash.co', crypt('admin123', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"nombre":"Mauricio"}',
  '', '', '', '', '', '', ''
)
on conflict (id) do nothing;

-- Identities: sin esto el login por password no resuelve
insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
values
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   '{"sub":"11111111-1111-1111-1111-111111111111","email":"monica@kailash.co","email_verified":true}',
   'email', now(), now()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
   '{"sub":"22222222-2222-2222-2222-222222222222","email":"mauricio@kailash.co","email_verified":true}',
   'email', now(), now())
on conflict (provider_id, provider) do nothing;

-- El trigger ya creo los perfiles: ajustamos rol y alcance
update public.perfiles set rol = 'coordinador', nombre = 'Mónica'
where id = '11111111-1111-1111-1111-111111111111';

update public.perfiles set rol = 'admin_tienda', nombre = 'Mauricio'
where id = '22222222-2222-2222-2222-222222222222';

insert into public.perfil_tiendas (perfil_id, tienda_id)
select '22222222-2222-2222-2222-222222222222', id
from public.tiendas where codigo = 'Q40'
on conflict do nothing;
