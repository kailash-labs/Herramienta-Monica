-- =============================================================================
-- Datos de ejemplo para ver el tablero de ausentismo con volumen realista.
-- NO se aplica solo: es demo, no dominio. Correrlo a mano si hace falta mostrar
-- el tablero con datos antes de que se acumulen los reales.
--
--   docker exec -i supabase_db_Herramienta-Monica psql -U postgres -d postgres \
--     < supabase/seed_ausentismo_demo.sql
-- =============================================================================
with c as (select id, row_number() over (order by codigo_empleado) rn, tienda_id from public.colaboradores)
insert into public.ausencias (colaborador_id, tienda_id, tipo, causa, fecha_inicio, fecha_fin)
select c.id, c.tienda_id, v.tipo::public.tipo_ausencia, v.causa::public.causa_ausencia, v.fi, v.ff
from (values
    (5, 'incapacidad', 'accidente_comun', date '2025-01-13', date '2025-01-13' + 0),
    (4, 'ausencia_injustificada', 'personal', date '2025-01-12', date '2025-01-12' + 0),
    (3, 'incapacidad', 'viral', date '2025-01-14', date '2025-01-14' + 2),
    (18, 'permiso_remunerado', 'personal', date '2025-01-14', date '2025-01-14' + 0),
    (19, 'incapacidad', 'viral', date '2025-02-19', date '2025-02-19' + 2),
    (2, 'incapacidad', 'viral', date '2025-02-18', date '2025-02-18' + 0),
    (19, 'ausencia_injustificada', 'personal', date '2025-03-10', date '2025-03-10' + 6),
    (19, 'incapacidad', 'accidente_comun', date '2025-03-19', date '2025-03-19' + 1),
    (19, 'incapacidad', 'accidente_comun', date '2025-04-02', date '2025-04-02' + 1),
    (14, 'incapacidad', 'enfermedad_general', date '2025-04-25', date '2025-04-25' + 2),
    (12, 'ausencia_injustificada', 'personal', date '2025-04-10', date '2025-04-10' + 1),
    (19, 'incapacidad', 'cita_medica', date '2025-04-10', date '2025-04-10' + 6),
    (15, 'incapacidad', 'enfermedad_general', date '2025-04-10', date '2025-04-10' + 0),
    (6, 'incapacidad', 'enfermedad_general', date '2025-04-25', date '2025-04-25' + 2),
    (14, 'vacaciones', 'otro', date '2025-04-02', date '2025-04-02' + 0),
    (16, 'incapacidad', 'viral', date '2025-05-19', date '2025-05-19' + 4),
    (9, 'incapacidad', 'accidente_laboral', date '2025-05-16', date '2025-05-16' + 0),
    (10, 'incapacidad', 'cita_medica', date '2025-05-21', date '2025-05-21' + 4),
    (12, 'incapacidad', 'personal', date '2025-05-01', date '2025-05-01' + 4),
    (4, 'incapacidad', 'cita_medica', date '2025-05-16', date '2025-05-16' + 0),
    (5, 'incapacidad', 'enfermedad_general', date '2025-05-24', date '2025-05-24' + 1),
    (3, 'incapacidad', 'cita_medica', date '2025-05-06', date '2025-05-06' + 4),
    (5, 'incapacidad', 'enfermedad_general', date '2025-05-14', date '2025-05-14' + 6),
    (13, 'incapacidad', 'viral', date '2025-06-08', date '2025-06-08' + 0),
    (8, 'incapacidad', 'accidente_comun', date '2025-06-22', date '2025-06-22' + 1),
    (6, 'incapacidad', 'enfermedad_general', date '2025-06-09', date '2025-06-09' + 1),
    (18, 'permiso_remunerado', 'otro', date '2025-06-12', date '2025-06-12' + 2),
    (13, 'incapacidad', 'personal', date '2025-07-13', date '2025-07-13' + 2),
    (13, 'incapacidad', 'viral', date '2025-07-02', date '2025-07-02' + 1),
    (15, 'incapacidad', 'viral', date '2025-07-06', date '2025-07-06' + 0),
    (4, 'incapacidad', 'cita_medica', date '2025-07-01', date '2025-07-01' + 0),
    (1, 'incapacidad', 'viral', date '2025-07-03', date '2025-07-03' + 1),
    (12, 'incapacidad', 'viral', date '2025-08-20', date '2025-08-20' + 2),
    (16, 'incapacidad', 'viral', date '2025-08-15', date '2025-08-15' + 4),
    (5, 'licencia', 'personal', date '2025-08-04', date '2025-08-04' + 2),
    (17, 'vacaciones', 'personal', date '2025-08-01', date '2025-08-01' + 1),
    (17, 'incapacidad', 'cita_medica', date '2025-09-10', date '2025-09-10' + 0),
    (17, 'incapacidad', 'viral', date '2025-09-12', date '2025-09-12' + 0),
    (8, 'licencia', 'personal', date '2025-10-20', date '2025-10-20' + 1),
    (7, 'incapacidad', 'viral', date '2025-10-17', date '2025-10-17' + 4),
    (1, 'incapacidad', 'viral', date '2025-10-26', date '2025-10-26' + 1),
    (12, 'vacaciones', 'personal', date '2025-10-15', date '2025-10-15' + 2),
    (8, 'incapacidad', 'cita_medica', date '2025-10-04', date '2025-10-04' + 1),
    (7, 'incapacidad', 'personal', date '2025-10-16', date '2025-10-16' + 0),
    (12, 'permiso_remunerado', 'otro', date '2025-10-26', date '2025-10-26' + 0),
    (7, 'incapacidad', 'personal', date '2025-10-16', date '2025-10-16' + 0),
    (11, 'incapacidad', 'calamidad_domestica', date '2025-10-03', date '2025-10-03' + 2),
    (6, 'incapacidad', 'accidente_comun', date '2025-11-06', date '2025-11-06' + 0),
    (15, 'incapacidad', 'personal', date '2025-11-26', date '2025-11-26' + 0),
    (16, 'incapacidad', 'accidente_comun', date '2025-11-22', date '2025-11-22' + 2),
    (5, 'permiso_remunerado', 'personal', date '2025-11-01', date '2025-11-01' + 0),
    (14, 'incapacidad', 'viral', date '2025-11-07', date '2025-11-07' + 1),
    (10, 'vacaciones', 'otro', date '2025-11-17', date '2025-11-17' + 1),
    (18, 'incapacidad', 'calamidad_domestica', date '2025-11-14', date '2025-11-14' + 0),
    (15, 'incapacidad', 'enfermedad_general', date '2025-12-22', date '2025-12-22' + 6),
    (5, 'incapacidad', 'viral', date '2025-12-18', date '2025-12-18' + 0),
    (15, 'incapacidad', 'maternidad_paternidad', date '2025-12-25', date '2025-12-25' + 0),
    (5, 'incapacidad', 'calamidad_domestica', date '2025-12-06', date '2025-12-06' + 0)
) as v(rn, tipo, causa, fi, ff)
join c on c.rn = v.rn;
