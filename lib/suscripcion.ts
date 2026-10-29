// Cobro mensual de los clientes. Todas las fechas son 'YYYY-MM-DD' en hora de Venezuela (UTC-4, sin horario de verano).
import type { ClienteAgencia } from './supabase'

export const MENSUALIDAD_BASE = 100

export const hoyVE = () => new Date(Date.now() - 4 * 3_600_000).toISOString().slice(0, 10)

const partes = (f: string) => { const [y, m, d] = f.split('-').map(Number); return { y, m, d } }
const aStr = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
const diasDelMes = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()

/** Mismo día del mes siguiente (si ese mes no tiene ese día, el último: 31 ene → 28 feb). `ancla` = día de cobro original. */
export function sumarMes(f: string, ancla?: number): string {
  const { y, m, d } = partes(f)
  const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1
  return aStr(ny, nm, Math.min(ancla ?? d, diasDelMes(ny, nm)))
}

/** Días de `a` a `b` (positivo si `b` es posterior). */
const ms = (f: string) => { const { y, m, d } = partes(f); return Date.UTC(y, m - 1, d) }
export const diasEntre = (a: string, b: string) => Math.round((ms(b) - ms(a)) / 86_400_000)

export const fechaLarga = (f: string) => { const { y, m, d } = partes(f); return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}` }

export type Cobro =
  | { tipo: 'sin_fecha' }
  | { tipo: 'vencido'; dias: number }
  | { tipo: 'por_vencer'; dias: number }   // 0 = vence hoy
  | { tipo: 'al_dia'; dias: number }

/** Situación de cobro del cliente según su vencimiento (el último día pagado es el propio vencimiento). */
export function cobroDe(c: Pick<ClienteAgencia, 'vencimiento'>, hoy = hoyVE()): Cobro {
  if (!c.vencimiento) return { tipo: 'sin_fecha' }
  const d = diasEntre(hoy, c.vencimiento)
  if (d < 0) return { tipo: 'vencido', dias: -d }
  return d <= 7 ? { tipo: 'por_vencer', dias: d } : { tipo: 'al_dia', dias: d }
}

/** ¿Tiene el cliente el servicio abierto hoy? Misma regla que la función estado_servicio de la base. */
export function servicioAbierto(c: Pick<ClienteAgencia, 'servicio' | 'vencimiento' | 'dias_gracia'>, hoy = hoyVE()) {
  if (c.servicio === 'activo') return true
  if (c.servicio === 'suspendido') return false
  return !c.vencimiento || diasEntre(hoy, c.vencimiento) + (c.dias_gracia ?? 0) >= 0
}
