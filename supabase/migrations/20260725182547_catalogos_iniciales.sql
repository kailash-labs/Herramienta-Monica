-- =============================================================================
-- 05 · Catalogos de configuracion
-- Son parte del esquema, no datos de prueba: sin esto el motor no corre.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Cargos · las bandas del cronograma operativo
-- ---------------------------------------------------------------------------

insert into public.cargos (codigo, nombre, color, orden) values
  ('ADMINISTRACION',    'ADMINISTRACION',      '#5C3A2E', 10),
  ('AUX_PREPARACION',   'AUX. DE PREPARACION', '#B47FC4', 20),
  ('DESPACHO_COMBOS',   'DESPACHO COMBOS',     '#5FC9AE', 30),
  ('OFICIOS_VARIOS',    'OFICIOS VARIOS',      '#A8D66E', 40),
  ('ADICIONALES',       'ADICIONALES',         '#9AA3AF', 90)
on conflict (codigo) do nothing;

-- ---------------------------------------------------------------------------
-- Reglas del motor
-- Bloqueantes: impiden publicar la semana. Advertencias: avisan y quedan registradas.
-- ---------------------------------------------------------------------------

insert into public.reglas (codigo, nombre, descripcion, severidad, parametros) values
  ('MAX_HORAS_SEMANA',
   'Tope de horas semanales',
   'Ningun colaborador puede superar sus horas contratadas en la semana. Todo lo que pase el tope es hora extra planeada.',
   'bloqueante',
   '{"horas_max": 42}'),

  ('DIA_DESCANSO',
   'Dia de descanso obligatorio',
   'Cada colaborador debe tener al menos un dia completo de descanso en la semana.',
   'bloqueante',
   '{"dias_min": 1}'),

  ('SOLAPE_TURNOS',
   'Bloques cruzados',
   'Los dos bloques de un turno partido no pueden superponerse.',
   'bloqueante',
   '{}'),

  ('DESCANSO_ENTRE_TURNOS',
   'Descanso minimo entre jornadas',
   'Entre el fin de un turno y el inicio del siguiente debe mediar el descanso minimo.',
   'advertencia',
   '{"horas_min": 12}'),

  ('MAX_DIAS_CONSECUTIVOS',
   'Dias seguidos de trabajo',
   'Limita las rachas de dias trabajados sin descanso intermedio.',
   'advertencia',
   '{"dias_max": 6}'),

  ('EQUIDAD_APERTURAS',
   'Equidad en aperturas',
   'Las aperturas se reparten parejo entre los colaboradores de un mismo cargo.',
   'advertencia',
   '{"brecha_max": 2}'),

  ('EQUIDAD_CIERRES',
   'Equidad en cierres',
   'Los cierres se reparten parejo entre los colaboradores de un mismo cargo.',
   'advertencia',
   '{"brecha_max": 2}'),

  ('EQUIDAD_PARTIDOS',
   'Equidad en turnos partidos',
   'Los turnos partidos se reparten parejo entre los colaboradores de un mismo cargo.',
   'advertencia',
   '{"brecha_max": 2}')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Conceptos de nomina
-- Codigos preliminares: al cargar el primer reporte real de Frisby hay que
-- ajustar la columna codigo al que traiga el archivo.
-- ---------------------------------------------------------------------------

insert into public.conceptos_nomina
  (codigo, nombre, clasificacion, cuenta_como_extra, cuenta_como_recargo, incluir_en_conciliacion) values
  ('HED',  'Hora extra diurna',              'extra_diurna',             true,  false, true),
  ('HEN',  'Hora extra nocturna',            'extra_nocturna',           true,  false, true),
  ('HEDD', 'Hora extra dominical diurna',    'extra_dominical_diurna',   true,  false, true),
  ('HEDN', 'Hora extra dominical nocturna',  'extra_dominical_nocturna', true,  false, true),
  ('RN',   'Recargo nocturno',               'recargo_nocturno',         false, true,  true),
  ('RD',   'Recargo dominical',              'recargo_dominical',        false, true,  true),
  ('RF',   'Recargo festivo',                'recargo_festivo',          false, true,  true),
  ('ORD',  'Hora ordinaria',                 'ordinaria',                false, false, false)
on conflict (codigo) do nothing;

-- ---------------------------------------------------------------------------
-- Plantillas de mensaje
-- ---------------------------------------------------------------------------

insert into public.plantillas_mensaje (codigo, tipo, asunto_tpl, cuerpo_tpl) values
  ('LLAMADO_ATENCION_EXTRAS',
   'llamado_atencion',
   'Diferencia en horas extra · {{colaborador}} · {{periodo}}',
   E'Buen dia,\n\nEn el cierre de {{periodo}} de la tienda {{tienda}} encontramos una diferencia en las horas extra de {{colaborador}}.\n\n  Horas extra planeadas: {{horas_planeadas}}\n  Horas extra pagadas:   {{horas_reales}}\n  Diferencia:            {{diferencia}}\n\nTe pedimos revisar a que corresponde esta diferencia y responder con la justificacion antes del cierre del proximo periodo.\n\nGracias.'),

  ('BORRADOR_AJUSTE_AFORO',
   'borrador_ajuste',
   'Ajuste requerido en el aforo · {{tienda}} · semana del {{semana}}',
   E'Buen dia,\n\nEl aforo cargado para la semana del {{semana}} en {{tienda}} no cumple una de las reglas:\n\n  {{hallazgo}}\n\nAntes de publicar la semana necesitamos el ajuste, para no generar la hora extra.\n\nGracias.')
on conflict (codigo) do nothing;
