// Motor de chequeos del Mous Hub (solo servidor): revisa si cada sitio responde, guarda el resultado y avisa por Telegram.
import { createClient } from '@supabase/supabase-js'
import { cobroDe, fechaLarga, hoyVE, MENSUALIDAD_BASE, servicioAbierto } from '@/lib/suscripcion'

import { OWNER_EMAIL } from '@/lib/config'
export const HUB_EMAIL = OWNER_EMAIL
const URL_DB = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const clienteAnon = () => createClient(URL_DB, KEY, { auth: { persistSession: false, autoRefreshToken: false } })

export type Objetivo = { id: number; nombre: string; slug: string | null; url_vivo: string; en_linea: boolean | null }
export type Resultado = { id: number; nombre: string; ok: boolean; http: number | null; ms: number | null; antes: boolean | null }
export type CobroFila = { id: number; nombre: string; contacto: string | null; telefono: string | null; mensualidad: number | null; vencimiento: string | null; dias_gracia: number | null; servicio: string | null; estado: string }

/** Llama a una función de la base protegida por el secreto de las tareas automáticas. */
export async function rpc<T>(nombre: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await clienteAnon().rpc(nombre, { p_secreto: process.env.CRON_SECRET, ...args })
  if (error) throw new Error(`${nombre}: ${error.message}`)
  return data as T
}

async function revisar(o: Objetivo): Promise<Resultado> {
  const t0 = Date.now()
  try {
    const r = await fetch(o.url_vivo, { redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(20_000), headers: { 'User-Agent': 'MousHub-Monitor/1.0' } })
    // "En línea" = el servidor contesta y la página existe (los accesos con login devuelven 200/401/403, todos válidos).
    const ok = r.status < 500 && r.status !== 404 && r.status !== 410
    return { id: o.id, nombre: o.nombre, ok, http: r.status, ms: Date.now() - t0, antes: o.en_linea }
  } catch {
    return { id: o.id, nombre: o.nombre, ok: false, http: null, ms: null, antes: o.en_linea }
  }
}

/** Revisa todos los sitios en tandas de 8 para no saturar la conexión. */
export async function revisarTodos(lista: Objetivo[]): Promise<Resultado[]> {
  const out: Resultado[] = []
  for (let i = 0; i < lista.length; i += 8) out.push(...(await Promise.all(lista.slice(i, i + 8).map(revisar))))
  return out
}

export async function chequearYGuardar(): Promise<Resultado[]> {
  const lista = await rpc<Objetivo[]>('hub_urls')
  const res = await revisarTodos(lista)
  await rpc('hub_guardar_estado', { p_datos: res.map(r => ({ id: r.id, ok: r.ok, http: r.http, ms: r.ms })) })
  return res
}

export async function telegram(texto: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID
  if (!token || !chat) return { enviado: false, motivo: 'Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID' }
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: texto, parse_mode: 'HTML', disable_web_page_preview: true }),
  })
  return { enviado: r.ok, motivo: r.ok ? '' : `Telegram respondió ${r.status}` }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Arma el resumen diario: sitios caídos o recuperados y cobros que requieren atención. Devuelve '' si no hay nada que avisar. */
export function armarResumen(res: Resultado[], cobros: CobroFila[]): string {
  const hoy = hoyVE()
  const lineas: string[] = []

  const cayeron = res.filter(r => !r.ok && r.antes !== false)
  const siguen = res.filter(r => !r.ok && r.antes === false)
  const volvieron = res.filter(r => r.ok && r.antes === false)
  if (cayeron.length) lineas.push('🔴 <b>Se cayó</b>\n' + cayeron.map(r => `• ${esc(r.nombre)} (${r.http ?? 'sin respuesta'})`).join('\n'))
  if (siguen.length) lineas.push('⚠️ <b>Sigue caído</b>\n' + siguen.map(r => `• ${esc(r.nombre)} (${r.http ?? 'sin respuesta'})`).join('\n'))
  if (volvieron.length) lineas.push('🟢 <b>Volvió a funcionar</b>\n' + volvieron.map(r => `• ${esc(r.nombre)}`).join('\n'))

  const filas = cobros.map(c => ({ c, cobro: cobroDe({ vencimiento: c.vencimiento }, hoy) }))
  const accion = (c: CobroFila, tail: string) => {
    const tel = (c.telefono ?? '').replace(/\D/g, '')
    const monto = c.mensualidad || MENSUALIDAD_BASE
    const msg = `Hola ${c.contacto || c.nombre}, te escribo para recordarte que la mensualidad de ${c.nombre} ($${monto}) ${tail}. ¿Me confirmas tu pago para mantener tu servicio activo? ¡Gracias!`
    return tel ? ` — <a href="https://wa.me/${tel}?text=${encodeURIComponent(msg)}">recordar por WhatsApp</a>` : ''
  }
  const vencidos = filas.filter(x => x.cobro.tipo === 'vencido')
  const hoyVence = filas.filter(x => x.cobro.tipo === 'por_vencer' && x.cobro.dias === 0)
  const pronto = filas.filter(x => x.cobro.tipo === 'por_vencer' && x.cobro.dias > 0 && x.cobro.dias <= 3)
  if (hoyVence.length) lineas.push('💵 <b>Vence HOY</b>\n' + hoyVence.map(x => `• ${esc(x.c.nombre)} ($${x.c.mensualidad || MENSUALIDAD_BASE})${accion(x.c, 'vence hoy')}`).join('\n'))
  if (pronto.length) lineas.push('🟠 <b>Vence en pocos días</b>\n' + pronto.map(x => `• ${esc(x.c.nombre)} — en ${(x.cobro as { dias: number }).dias} día(s), ${fechaLarga(x.c.vencimiento!)}${accion(x.c, `vence el ${fechaLarga(x.c.vencimiento!)}`)}`).join('\n'))
  if (vencidos.length) lineas.push('🔴 <b>Mensualidad vencida</b>\n' + vencidos.map(x => `• ${esc(x.c.nombre)} — hace ${(x.cobro as { dias: number }).dias} día(s)${servicioAbierto({ servicio: x.c.servicio as 'auto' | 'activo' | 'suspendido', vencimiento: x.c.vencimiento, dias_gracia: x.c.dias_gracia ?? 0 }, hoy) ? '' : ' · servicio cortado'}${accion(x.c, `venció el ${fechaLarga(x.c.vencimiento!)}`)}`).join('\n'))

  return lineas.length ? `<b>Mous Hub · resumen del día</b>\n\n${lineas.join('\n\n')}` : ''
}
