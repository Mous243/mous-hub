'use client'
import { useState } from 'react'
import { supabase, type ClienteAgencia, type PagoSuscripcion } from '@/lib/supabase'
import { reciboPDF } from '@/lib/recibo'
import { cobroDe, fechaLarga, hoyVE, MENSUALIDAD_BASE, servicioAbierto, sumarMes, type Cobro } from '@/lib/suscripcion'

const orden = (c: Cobro) => (c.tipo === 'vencido' ? -1000 - c.dias : c.tipo === 'por_vencer' ? c.dias : c.tipo === 'al_dia' ? 100 + c.dias : 9999)

function textoCobro(c: Cobro) {
  if (c.tipo === 'vencido') return `Venció hace ${c.dias} día${c.dias === 1 ? '' : 's'}`
  if (c.tipo === 'por_vencer') return c.dias === 0 ? 'Vence HOY' : `Vence en ${c.dias} día${c.dias === 1 ? '' : 's'}`
  if (c.tipo === 'al_dia') return `Al día · faltan ${c.dias} días`
  return 'Sin fecha de cobro'
}
const colorCobro = (c: Cobro) =>
  c.tipo === 'vencido' ? 'bg-bad/15 text-bad'
  : c.tipo === 'por_vencer' ? 'bg-warn/15 text-warn'
  : c.tipo === 'al_dia' ? 'bg-ok/15 text-ok'
  : 'bg-mute/15 text-mute'

export default function Agenda({ clientes, recargar }: { clientes: ClienteAgencia[]; recargar: () => Promise<void> }) {
  const [ocupado, setOcupado] = useState<number | null>(null)
  const [historial, setHistorial] = useState<{ id: number; pagos: PagoSuscripcion[] } | null>(null)
  const hoy = hoyVE()

  // Entran los clientes que ya tienen fecha de cobro y los que están activos o en desarrollo (para recordar que falta ponerla).
  const lista = clientes
    .filter(c => c.vencimiento || c.estado === 'activo' || c.estado === 'en_desarrollo')
    .map(c => ({ c, cobro: cobroDe(c, hoy) }))
    .sort((a, b) => orden(a.cobro) - orden(b.cobro))
  const vencidos = lista.filter(x => x.cobro.tipo === 'vencido')
  const porVencer = lista.filter(x => x.cobro.tipo === 'por_vencer')

  async function cambiarServicio(c: ClienteAgencia, servicio: 'auto' | 'activo' | 'suspendido') {
    if (servicio === 'suspendido' && !confirm(`¿Suspender el servicio de ${c.nombre}? Su web y su app dejarán de abrir de inmediato (en menos de 1 minuto).`)) return
    setOcupado(c.id)
    const { error } = await supabase.from('clientes_agencia').update({ servicio }).eq('id', c.id)
    setOcupado(null)
    if (error) return alert('No se pudo guardar: ' + error.message)
    await recargar()
  }

  async function registrarPago(c: ClienteAgencia) {
    const sugerido = c.mensualidad || MENSUALIDAD_BASE
    const monto = Number((prompt(`Pago de ${c.nombre}: ¿cuántos $ recibiste?`, String(sugerido)) ?? '').replace(',', '.'))
    if (!Number.isFinite(monto) || monto <= 0) return
    const base = c.vencimiento ?? c.fecha_entrega ?? hoy
    const ancla = c.fecha_entrega ? Number(c.fecha_entrega.slice(8, 10)) : undefined
    const nuevo = sumarMes(base, ancla)
    if (!confirm(`Se registran $${monto.toFixed(2)} y ${c.nombre} queda pagado hasta el ${fechaLarga(nuevo)}.${c.servicio === 'suspendido' ? '\n\nSu servicio estaba suspendido: vuelve a quedar en automático (abierto mientras esté al día).' : ''}`)) return
    setOcupado(c.id)
    const p = await supabase.from('pagos_suscripcion').insert({ cliente_id: c.id, monto, fecha_pago: hoy, periodo_desde: c.vencimiento ?? base, periodo_hasta: nuevo }).select('*').single()
    if (p.error) { setOcupado(null); return alert('No se pudo registrar el pago: ' + p.error.message) }
    const u = await supabase.from('clientes_agencia').update({ vencimiento: nuevo, ...(c.servicio === 'suspendido' ? { servicio: 'auto' } : {}) }).eq('id', c.id)
    setOcupado(null)
    if (u.error) return alert('El pago se guardó pero no se pudo mover el vencimiento: ' + u.error.message)
    if (cobroDe({ vencimiento: nuevo }, hoy).tipo === 'vencido') alert('Ojo: con este pago sigue vencido (debía más de un mes). Registra otro mes si también lo pagó.')
    await recargar()
    if (historial?.id === c.id) verHistorial(c)
    if (confirm('Pago registrado. ¿Quieres descargar el recibo en PDF?')) await descargarRecibo(c, p.data as PagoSuscripcion)
  }

  async function descargarRecibo(c: ClienteAgencia, p: PagoSuscripcion) {
    try {
      await reciboPDF({ numero: `MH-${String(p.id).padStart(5, '0')}`, cliente: c.nombre, contacto: c.contacto, monto: Number(p.monto), fechaPago: p.fecha_pago, desde: p.periodo_desde, hasta: p.periodo_hasta })
    } catch (e) { alert('No se pudo generar el recibo: ' + (e instanceof Error ? e.message : e)) }
  }

  async function verHistorial(c: ClienteAgencia) {
    if (historial?.id === c.id) return setHistorial(null)
    const { data, error } = await supabase.from('pagos_suscripcion').select('*').eq('cliente_id', c.id).order('fecha_pago', { ascending: false }).order('id', { ascending: false })
    if (error) return alert('No se pudo cargar: ' + error.message)
    setHistorial({ id: c.id, pagos: (data ?? []) as PagoSuscripcion[] })
  }

  function recordarPorWhatsApp(c: ClienteAgencia, cobro: Cobro) {
    const tel = (c.telefono ?? '').replace(/\D/g, '')
    const monto = c.mensualidad || MENSUALIDAD_BASE
    const cuando = cobro.tipo === 'vencido' ? `venció el ${fechaLarga(c.vencimiento!)}` : cobro.tipo === 'por_vencer' ? (cobro.dias === 0 ? 'vence hoy' : `vence el ${fechaLarga(c.vencimiento!)}`) : ''
    const texto = `Hola ${c.contacto || c.nombre}, te escribo para recordarte que la mensualidad de ${c.nombre} ($${monto}) ${cuando}. ¿Me confirmas tu pago para mantener tu servicio activo? ¡Gracias!`
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(texto)}`, '_blank')
  }

  const caja = 'card p-5'
  const boton = 'btn btn-ghost btn-sm'
  const total = (xs: typeof lista) => xs.reduce((s, x) => s + (x.c.mensualidad || MENSUALIDAD_BASE), 0)

  return (
    <div className="space-y-4">
      <div>
        <p className="overline">Agencia</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">Agenda de cobros</h1>
        <p className="mt-1 max-w-2xl text-sm text-mute">Cada cliente paga ${MENSUALIDAD_BASE} al mes desde la fecha de entrega, hasta ese mismo día del mes siguiente. Al día siguiente de vencer, si no pagó, su web y su app dejan de abrir solas.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className={caja}><p className="flex items-center gap-2 text-[13px] font-medium text-mute"><span className="size-2 rounded-full bg-bad" />Vencidos</p><p className="mt-1 text-3xl font-bold tracking-tight text-bad">{vencidos.length}</p><p className="text-xs text-mute">${total(vencidos)} por cobrar</p></div>
        <div className={caja}><p className="flex items-center gap-2 text-[13px] font-medium text-mute"><span className="size-2 rounded-full bg-warn" />Vencen en 7 días</p><p className="mt-1 text-3xl font-bold tracking-tight text-warn">{porVencer.length}</p><p className="text-xs text-mute">${total(porVencer)} por cobrar</p></div>
        <div className={caja}><p className="flex items-center gap-2 text-[13px] font-medium text-mute"><span className="size-2 rounded-full bg-ok" />Al día</p><p className="mt-1 text-3xl font-bold tracking-tight text-ok">{lista.filter(x => x.cobro.tipo === 'al_dia').length}</p></div>
      </div>

      {lista.length === 0 && <div className="card border-dashed p-10 text-center text-sm text-mute">Aún no hay clientes con cobro mensual. Edita un cliente y pon su “fecha de entrega”.</div>}

      {lista.map(({ c, cobro }) => {
        const abierto = servicioAbierto(c, hoy)
        const sv = c.servicio ?? 'auto'
        return (
          <div key={c.id} className={`${caja} space-y-3`}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{c.nombre}</p>
                <p className="text-[13px] text-mute">{c.vencimiento ? `Pagado hasta el ${fechaLarga(c.vencimiento)}` : 'Sin fecha de entrega: edita el cliente para empezar a cobrar'} · ${c.mensualidad || MENSUALIDAD_BASE}/mes</p>
              </div>
              <span className={`pill ${colorCobro(cobro)}`}>{textoCobro(cobro)}</span>
              <span className={`pill ${abierto ? 'bg-ok/15 text-ok' : 'bg-bad text-white'}`}>
                {abierto ? 'Servicio abierto' : sv === 'suspendido' ? 'Suspendido a mano' : 'Cortado por falta de pago'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button disabled={ocupado === c.id} onClick={() => registrarPago(c)} className="btn btn-primary btn-sm">Registrar pago</button>
              {sv !== 'suspendido' && <button disabled={ocupado === c.id} onClick={() => cambiarServicio(c, 'suspendido')} className="btn btn-danger btn-sm">Suspender servicio</button>}
              {sv === 'suspendido' && <button disabled={ocupado === c.id} onClick={() => cambiarServicio(c, 'auto')} className={boton}>Reactivar (automático)</button>}
              {sv === 'auto' && !abierto && <button disabled={ocupado === c.id} onClick={() => cambiarServicio(c, 'activo')} className={boton}>Activar de cortesía</button>}
              {sv === 'activo' && <button disabled={ocupado === c.id} onClick={() => cambiarServicio(c, 'auto')} className={boton}>Quitar cortesía</button>}
              {(cobro.tipo === 'vencido' || cobro.tipo === 'por_vencer') && c.telefono && <button onClick={() => recordarPorWhatsApp(c, cobro)} className={boton}>Recordar por WhatsApp</button>}
              <button onClick={() => verHistorial(c)} className={boton}>Historial de pagos</button>
            </div>
            {sv === 'activo' && <p className="text-xs text-mute">En cortesía: el servicio queda abierto aunque esté vencido, hasta que lo quites.</p>}
            {historial?.id === c.id && (
              <div className="space-y-1.5 rounded-xl border border-line bg-elevated p-4 text-[13px]">
                {historial.pagos.length === 0 && <p className="text-mute">Todavía no hay pagos registrados.</p>}
                {historial.pagos.map(p => (
                  <div key={p.id} className="flex justify-between">
                    <span className="flex-1">{fechaLarga(p.fecha_pago)}{p.periodo_hasta ? ` · cubre hasta ${fechaLarga(p.periodo_hasta)}` : ''}</span><b>${Number(p.monto).toFixed(2)}</b><button onClick={() => descargarRecibo(c, p)} className="ml-3 cursor-pointer font-semibold text-gold-strong hover:underline">Recibo PDF</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
