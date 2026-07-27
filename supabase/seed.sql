-- =============================================================================
-- seed · Aforo real de Q40 UNICENTRO - ARMENIA, semana del 3 al 9 de noviembre
-- Tomado del cronograma operativo exportado de Sipo. Sirve para probar el motor
-- de reglas contra un horario que de verdad se ejecuto.
--
-- Nota: el PDF reporta 19 colaboradores y 648 h; aca estan los 16 colaboradores
-- de los 5 cargos visibles en la exportacion (el filtro mostraba 5 de 6 cargos).
-- =============================================================================

insert into public.tiendas (codigo, nombre, ciudad, hora_apertura, hora_cierre)
values ('Q40', 'UNICENTRO - ARMENIA', 'Armenia', '11:00', '21:00')
on conflict (codigo) do nothing;

-- Colaboradores -------------------------------------------------------------
with tienda as (
  select id from public.tiendas where codigo = 'Q40'
),
nuevos (codigo_empleado, cargo_codigo, nombre_completo) as (
  values
  ('ADM-01', 'ADMINISTRACION', 'Colaborador ADM-01'),
  ('ADM-02', 'ADMINISTRACION', 'Colaborador ADM-02'),
  ('ADM-03', 'ADMINISTRACION', 'Colaborador ADM-03'),
  ('ADM-04', 'ADMINISTRACION', 'Colaborador ADM-04'),
  ('AUX-01', 'AUX_PREPARACION', 'Colaborador AUX-01'),
  ('AUX-02', 'AUX_PREPARACION', 'Colaborador AUX-02'),
  ('AUX-03', 'AUX_PREPARACION', 'Colaborador AUX-03'),
  ('DES-01', 'DESPACHO_COMBOS', 'Colaborador DES-01'),
  ('DES-02', 'DESPACHO_COMBOS', 'Colaborador DES-02'),
  ('DES-03', 'DESPACHO_COMBOS', 'Colaborador DES-03'),
  ('DES-04', 'DESPACHO_COMBOS', 'Colaborador DES-04'),
  ('DES-05', 'DESPACHO_COMBOS', 'Colaborador DES-05'),
  ('DES-06', 'DESPACHO_COMBOS', 'Colaborador DES-06'),
  ('DES-07', 'DESPACHO_COMBOS', 'Colaborador DES-07'),
  ('OFI-01', 'OFICIOS_VARIOS', 'Colaborador OFI-01'),
  ('OFI-02', 'OFICIOS_VARIOS', 'Colaborador OFI-02')
)
insert into public.colaboradores (tienda_id, cargo_id, codigo_empleado, nombre_completo, horas_contrato)
select t.id, cg.id, n.codigo_empleado, n.nombre_completo, 42
from nuevos n
cross join tienda t
join public.cargos cg on cg.codigo = n.cargo_codigo
on conflict (codigo_empleado) where codigo_empleado is not null do nothing;

-- Semana --------------------------------------------------------------------
insert into public.semanas (tienda_id, fecha_inicio, estado, notas)
select id, date '2025-11-03', 'borrador',
       'Aforo real exportado de Sipo (Q40 - AFORO 7 HORAS)'
from public.tiendas where codigo = 'Q40'
on conflict (tienda_id, fecha_inicio) do nothing;

-- Turnos --------------------------------------------------------------------
with semana as (
  select s.id, s.fecha_inicio
  from public.semanas s
  join public.tiendas t on t.id = s.tienda_id
  where t.codigo = 'Q40' and s.fecha_inicio = date '2025-11-03'
),
plan (label, dow, bloque, hora_inicio, hora_fin, tipo) as (
  values
  ('ADM-01', 1, 1, '14:40', '21:40', 'completo'),
  ('ADM-01', 3, 1, '14:20', '21:20', 'completo'),
  ('ADM-01', 4, 1, '14:40', '21:40', 'completo'),
  ('ADM-01', 5, 1, '08:20', '15:20', 'completo'),
  ('ADM-01', 6, 1, '07:40', '14:40', 'completo'),
  ('ADM-01', 7, 1, '08:00', '15:00', 'completo'),
  ('ADM-02', 1, 1, '08:20', '15:20', 'completo'),
  ('ADM-02', 2, 1, '14:40', '21:40', 'completo'),
  ('ADM-02', 3, 1, '08:00', '15:00', 'completo'),
  ('ADM-02', 5, 1, '11:00', '15:20', 'partido'),
  ('ADM-02', 5, 2, '17:20', '20:00', 'partido'),
  ('ADM-02', 6, 1, '12:00', '17:00', 'partido'),
  ('ADM-02', 6, 2, '18:00', '20:00', 'partido'),
  ('ADM-02', 7, 1, '14:00', '21:00', 'completo'),
  ('ADM-03', 1, 1, '12:00', '16:00', 'parcial'),
  ('ADM-03', 2, 1, '07:40', '14:40', 'completo'),
  ('ADM-03', 4, 1, '08:20', '15:20', 'completo'),
  ('ADM-03', 5, 1, '15:00', '22:00', 'completo'),
  ('ADM-03', 6, 1, '14:00', '16:00', 'partido'),
  ('ADM-03', 6, 2, '17:00', '22:00', 'partido'),
  ('ADM-03', 7, 1, '12:00', '19:00', 'completo'),
  ('ADM-04', 2, 1, '11:00', '15:00', 'parcial'),
  ('ADM-04', 3, 1, '11:00', '15:00', 'parcial'),
  ('ADM-04', 4, 1, '11:40', '15:40', 'parcial'),
  ('AUX-01', 1, 1, '14:40', '21:40', 'completo'),
  ('AUX-01', 2, 1, '14:40', '21:40', 'completo'),
  ('AUX-01', 3, 1, '14:20', '21:20', 'completo'),
  ('AUX-01', 5, 1, '08:20', '15:20', 'completo'),
  ('AUX-01', 6, 1, '15:00', '22:00', 'completo'),
  ('AUX-01', 7, 1, '08:00', '15:00', 'completo'),
  ('AUX-02', 2, 1, '08:20', '15:20', 'completo'),
  ('AUX-02', 3, 1, '08:00', '15:00', 'completo'),
  ('AUX-02', 4, 1, '14:40', '21:40', 'completo'),
  ('AUX-02', 5, 1, '15:00', '22:00', 'completo'),
  ('AUX-02', 6, 1, '08:00', '15:00', 'completo'),
  ('AUX-02', 7, 1, '14:00', '21:00', 'completo'),
  ('AUX-03', 1, 1, '08:20', '15:20', 'completo'),
  ('AUX-03', 4, 1, '08:20', '15:20', 'completo'),
  ('AUX-03', 7, 1, '12:00', '16:00', 'parcial'),
  ('DES-01', 1, 1, '09:20', '16:20', 'completo'),
  ('DES-01', 2, 1, '10:20', '17:20', 'completo'),
  ('DES-01', 3, 1, '14:20', '21:20', 'completo'),
  ('DES-01', 5, 1, '09:20', '16:20', 'completo'),
  ('DES-01', 6, 1, '12:00', '14:00', 'partido'),
  ('DES-01', 6, 2, '16:00', '21:00', 'partido'),
  ('DES-01', 7, 1, '12:00', '14:20', 'partido'),
  ('DES-01', 7, 2, '16:20', '21:00', 'partido'),
  ('DES-02', 1, 1, '09:20', '16:20', 'completo'),
  ('DES-02', 2, 1, '14:40', '21:40', 'completo'),
  ('DES-02', 3, 1, '14:20', '21:20', 'completo'),
  ('DES-02', 4, 1, '09:40', '16:40', 'completo'),
  ('DES-02', 5, 1, '12:00', '14:20', 'partido'),
  ('DES-02', 5, 2, '16:20', '21:00', 'partido'),
  ('DES-02', 7, 1, '12:00', '15:00', 'partido'),
  ('DES-02', 7, 2, '16:00', '20:00', 'partido'),
  ('DES-03', 1, 1, '14:40', '21:40', 'completo'),
  ('DES-03', 2, 1, '14:40', '21:40', 'completo'),
  ('DES-03', 4, 1, '14:40', '21:40', 'completo'),
  ('DES-03', 5, 1, '15:00', '22:00', 'completo'),
  ('DES-03', 6, 1, '13:00', '16:00', 'partido'),
  ('DES-03', 6, 2, '18:00', '22:00', 'partido'),
  ('DES-03', 7, 1, '14:00', '21:00', 'completo'),
  ('DES-04', 1, 1, '14:40', '21:40', 'completo'),
  ('DES-04', 3, 1, '11:20', '14:00', 'partido'),
  ('DES-04', 3, 2, '15:40', '20:00', 'partido'),
  ('DES-04', 4, 1, '09:20', '16:20', 'completo'),
  ('DES-04', 5, 1, '15:00', '22:00', 'completo'),
  ('DES-04', 6, 1, '12:00', '15:00', 'partido'),
  ('DES-04', 6, 2, '16:00', '20:00', 'partido'),
  ('DES-04', 7, 1, '11:40', '18:40', 'completo'),
  ('DES-05', 2, 1, '12:00', '14:20', 'partido'),
  ('DES-05', 2, 2, '16:00', '20:40', 'partido'),
  ('DES-05', 3, 1, '09:00', '16:00', 'completo'),
  ('DES-05', 4, 1, '12:00', '16:40', 'partido'),
  ('DES-05', 4, 2, '18:00', '20:20', 'partido'),
  ('DES-05', 5, 1, '09:20', '16:20', 'completo'),
  ('DES-05', 6, 1, '09:00', '16:00', 'completo'),
  ('DES-05', 7, 1, '09:00', '16:00', 'completo'),
  ('DES-06', 1, 1, '11:00', '15:00', 'parcial'),
  ('DES-06', 2, 1, '09:20', '16:20', 'completo'),
  ('DES-06', 3, 1, '09:00', '16:00', 'completo'),
  ('DES-06', 4, 1, '14:40', '21:40', 'completo'),
  ('DES-06', 6, 1, '15:00', '22:00', 'completo'),
  ('DES-06', 7, 1, '09:00', '16:00', 'completo'),
  ('DES-07', 1, 1, '11:00', '15:00', 'parcial'),
  ('DES-07', 2, 1, '11:20', '15:20', 'parcial'),
  ('DES-07', 3, 1, '11:40', '15:40', 'parcial'),
  ('DES-07', 4, 1, '11:40', '15:40', 'parcial'),
  ('DES-07', 5, 1, '11:40', '15:40', 'parcial'),
  ('DES-07', 6, 1, '09:00', '16:00', 'completo'),
  ('OFI-01', 2, 1, '07:40', '14:40', 'fijo_oficios'),
  ('OFI-01', 3, 1, '08:00', '15:00', 'fijo_oficios'),
  ('OFI-01', 4, 1, '08:20', '15:20', 'fijo_oficios'),
  ('OFI-01', 5, 1, '08:20', '15:20', 'fijo_oficios'),
  ('OFI-01', 6, 1, '07:40', '14:40', 'fijo_oficios'),
  ('OFI-01', 7, 1, '08:00', '15:00', 'fijo_oficios'),
  ('OFI-02', 1, 1, '08:20', '15:20', 'fijo_oficios')
)
insert into public.turnos (semana_id, colaborador_id, fecha, orden_bloque, hora_inicio, hora_fin, tipo_turno)
select
  s.id,
  c.id,
  s.fecha_inicio + (p.dow - 1),
  p.bloque,
  p.hora_inicio::time,
  p.hora_fin::time,
  p.tipo::public.tipo_turno
from plan p
join public.colaboradores c on c.codigo_empleado = p.label
cross join semana s
on conflict (colaborador_id, fecha, orden_bloque) do nothing;

-- ---------------------------------------------------------------------------
-- Segunda tienda: sirve para comprobar que el aislamiento por tienda funciona
-- y para que el consolidado de la coordinadora tenga mas de una fila.
-- ---------------------------------------------------------------------------

insert into public.tiendas (codigo, nombre, ciudad, hora_apertura, hora_cierre)
values ('Q17', 'PORTAL DEL QUINDIO', 'Armenia', '11:00', '21:00')
on conflict (codigo) do nothing;

with tienda as (select id from public.tiendas where codigo = 'Q17'),
nuevos (codigo_empleado, cargo_codigo, nombre_completo) as (
  values
    ('P-ADM-01', 'ADMINISTRACION',  'Colaborador P-ADM-01'),
    ('P-DES-01', 'DESPACHO_COMBOS', 'Colaborador P-DES-01'),
    ('P-DES-02', 'DESPACHO_COMBOS', 'Colaborador P-DES-02')
)
insert into public.colaboradores (tienda_id, cargo_id, codigo_empleado, nombre_completo, horas_contrato)
select t.id, cg.id, n.codigo_empleado, n.nombre_completo, 42
from nuevos n
cross join tienda t
join public.cargos cg on cg.codigo = n.cargo_codigo
on conflict (codigo_empleado) where codigo_empleado is not null do nothing;

insert into public.semanas (tienda_id, fecha_inicio, estado, notas)
select id, date '2025-11-03', 'borrador', 'Semana de ejemplo'
from public.tiendas where codigo = 'Q17'
on conflict (tienda_id, fecha_inicio) do nothing;

-- Una semana liviana: 5 dias completos para el admin, 6 para despacho
with semana as (
  select s.id, s.fecha_inicio from public.semanas s
  join public.tiendas t on t.id = s.tienda_id
  where t.codigo = 'Q17' and s.fecha_inicio = date '2025-11-03'
),
plan (label, dow, hora_inicio, hora_fin) as (
  values
    ('P-ADM-01',1,'08:00','15:00'),('P-ADM-01',2,'08:00','15:00'),('P-ADM-01',3,'08:00','15:00'),
    ('P-ADM-01',4,'08:00','15:00'),('P-ADM-01',5,'08:00','15:00'),
    ('P-DES-01',1,'14:00','21:00'),('P-DES-01',2,'14:00','21:00'),('P-DES-01',3,'14:00','21:00'),
    ('P-DES-01',4,'14:00','21:00'),('P-DES-01',5,'14:00','21:00'),('P-DES-01',6,'14:00','21:00'),
    ('P-DES-02',2,'11:00','18:00'),('P-DES-02',3,'11:00','18:00'),('P-DES-02',4,'11:00','18:00'),
    ('P-DES-02',5,'11:00','18:00'),('P-DES-02',6,'11:00','18:00'),('P-DES-02',7,'11:00','18:00')
)
insert into public.turnos (semana_id, colaborador_id, fecha, orden_bloque, hora_inicio, hora_fin, tipo_turno)
select s.id, c.id, s.fecha_inicio + (p.dow - 1), 1, p.hora_inicio::time, p.hora_fin::time, 'completo'
from plan p
join public.colaboradores c on c.codigo_empleado = p.label
cross join semana s
on conflict (colaborador_id, fecha, orden_bloque) do nothing;
