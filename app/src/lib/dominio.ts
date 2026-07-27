import type { Database } from '@/lib/supabase/database.types'

export type TipoTurno = Database['public']['Enums']['tipo_turno']
export type EstadoSemana = Database['public']['Enums']['estado_semana']
export type Severidad = Database['public']['Enums']['severidad_regla']
export type MotivoCambio = Database['public']['Enums']['motivo_cambio']
export type EstadoLinea = Database['public']['Enums']['estado_linea_conciliacion']

export const DIAS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const

export const ETIQUETA_TIPO: Record<TipoTurno, string> = {
  completo: 'Completo',
  parcial: 'Parcial',
  partido: 'Partido',
  fijo_oficios: 'Fijo-oficios',
}

export type TipoAusencia = Database['public']['Enums']['tipo_ausencia']
export type CausaAusencia = Database['public']['Enums']['causa_ausencia']

export const TIPOS_AUSENCIA: { valor: TipoAusencia; etiqueta: string }[] = [
  { valor: 'incapacidad', etiqueta: 'Incapacidad' },
  { valor: 'permiso_remunerado', etiqueta: 'Permiso remunerado' },
  { valor: 'permiso_no_remunerado', etiqueta: 'Permiso no remunerado' },
  { valor: 'ausencia_injustificada', etiqueta: 'Ausencia injustificada' },
  { valor: 'vacaciones', etiqueta: 'Vacaciones' },
  { valor: 'licencia', etiqueta: 'Licencia' },
]

export const CAUSAS_AUSENCIA: { valor: CausaAusencia; etiqueta: string }[] = [
  { valor: 'viral', etiqueta: 'Viral' },
  { valor: 'cita_medica', etiqueta: 'Cita médica' },
  { valor: 'accidente_laboral', etiqueta: 'Accidente laboral' },
  { valor: 'accidente_comun', etiqueta: 'Accidente común' },
  { valor: 'enfermedad_general', etiqueta: 'Enfermedad general' },
  { valor: 'maternidad_paternidad', etiqueta: 'Maternidad o paternidad' },
  { valor: 'calamidad_domestica', etiqueta: 'Calamidad doméstica' },
  { valor: 'personal', etiqueta: 'Personal' },
  { valor: 'otro', etiqueta: 'Otro' },
]

export const MOTIVOS: { valor: MotivoCambio; etiqueta: string }[] = [
  { valor: 'planeacion_inicial', etiqueta: 'Planeación inicial' },
  { valor: 'incapacidad', etiqueta: 'Incapacidad' },
  { valor: 'ausencia', etiqueta: 'Ausencia' },
  { valor: 'permiso', etiqueta: 'Permiso' },
  { valor: 'vacaciones', etiqueta: 'Vacaciones' },
  { valor: 'retiro', etiqueta: 'Retiro' },
  { valor: 'cambio_operativo', etiqueta: 'Cambio operativo' },
  { valor: 'solicitud_colaborador', etiqueta: 'Solicitud del colaborador' },
  { valor: 'correccion', etiqueta: 'Corrección' },
  { valor: 'otro', etiqueta: 'Otro' },
]

/** '14:40:00' | '14:40' -> minutos desde medianoche */
export function aMinutos(hora: string): number {
  const [h, m] = hora.split(':')
  return Number(h) * 60 + Number(m)
}

/** Duración de un bloque, contemplando el cruce de medianoche */
export function duracionMinutos(inicio: string, fin: string): number {
  const d = aMinutos(fin) - aMinutos(inicio)
  return d <= 0 ? d + 1440 : d
}

/** '14:40:00' -> '14:40' */
export function hhmm(hora: string): string {
  return hora.slice(0, 5)
}

export function horas(minutos: number): string {
  const h = minutos / 60
  return Number.isInteger(h) ? String(h) : h.toFixed(1)
}

/** Lunes de la semana que contiene la fecha, en ISO */
export function lunesDe(fecha: Date): string {
  const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()))
  const dow = d.getUTCDay() === 0 ? 7 : d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - (dow - 1))
  return d.toISOString().slice(0, 10)
}

export function sumarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** '2025-11-03' -> '3 de noviembre' */
export function fechaCorta(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} de ${MESES[m - 1]}`
}

export function rangoSemana(inicio: string): string {
  const fin = sumarDias(inicio, 6)
  const anio = fin.slice(0, 4)
  return `${fechaCorta(inicio)} al ${fechaCorta(fin)} de ${anio}`
}

export function nombreMes(mes: number): string {
  return MESES[mes - 1] ?? String(mes)
}
