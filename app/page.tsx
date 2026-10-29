'use client'
import { useCallback, useEffect, useState } from 'react'
import Agenda from '@/components/Agenda'
import Drawer from '@/components/Drawer'
import Icono from '@/components/Iconos'
import { MarcaDeAgua } from '@/components/Logo'
import Proyectos from '@/components/Proyectos'
import Shell, { type Vista } from '@/components/Shell'
import { cobroDe, MENSUALIDAD_BASE, sumarMes } from '@/lib/suscripcion'
import { supabase, type ClienteAgencia, type Enlace, type Estado } from '@/lib/supabase'

const ESTADOS: { id: Estado; label: string; pill: string; dot: string }[] = [
  { id: 'prospecto', label: 'Prospecto', pill: 'bg-mute/15 text-mute', dot: 'bg-mute' },
  { id: 'en_desarrollo', label: 'En desarrollo', pill: 'bg-warn/15 text-warn', dot: 'bg-warn' },
  { id: 'activo', label: 'Activo', pill: 'bg-ok/15 text-ok', dot: 'bg-ok' },
  { id: 'pausado', label: 'Pausado', pill: 'bg-bad/15 text-bad', dot: 'bg-bad' },
]
const SERVICIOS = ['web', 'app', 'bot', 'delivery']
const REDES = ['instagram', 'meta', 'whatsapp']
const PAGOS = ['pago móvil', 'transferencia', 'zelle', 'binance pay', 'pasarela']

type Form = Omit<ClienteAgencia, 'id' | 'created_at'>
const vacio: Form = { nombre: '', contacto: '', telefono: '', administradora: '', servicios: [], redes: [], metodos_pago: [], estado: 'prospecto', mensualidad: MENSUALIDAD_BASE, dominio: '', fecha_inicio: '', notas: '', enlaces: [], slug: '', fecha_entrega: '', vencimiento: '' }

function Chips({ opciones, valor, onChange }: { opciones: string[]; valor: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map(o => {
        const on = valor.includes(o)
        return (
          <button key={o} type="button" onClick={() => onChange(on ? valor.filter(x => x !== o) : [...valor, o])}
            className={`cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors ${on ? 'border-gold bg-gold text-on-gold font-semibold' : 'border-line bg-elevated text-mute hover:border-gold/50'}`}>
            {o}
          </button>
        )
      })}
    </div>
  )
}

export default function Home() {
  const [clientes, setClientes] = useState<ClienteAgencia[]>([])
  const [filtro, setFiltro] = useState<Estado | 'todos'>('todos')
  const [form, setForm] = useState<Form | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [vista, setVista] = useState<Vista>('proyectos')

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.from('clientes_agencia').select('*').order('created_at', { ascending: false })
    if (error) { alert('Error al cargar: ' + error.message); return }
    setClientes((data || []) as ClienteAgencia[])
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const guardar = async () => {
    if (!form || !form.nombre.trim()) { alert('El nombre es obligatorio'); return }
    setGuardando(true)
    const entrega = form.fecha_entrega || null
    // Al poner la fecha de entrega por primera vez se entiende que ese día se hizo el primer pago: cubre hasta el mismo día del mes siguiente.
    const primerPago = !!entrega && !form.vencimiento
    const vencimiento = form.vencimiento || (entrega ? sumarMes(entrega) : null)
    const payload = { ...form, mensualidad: form.mensualidad ?? null, fecha_inicio: form.fecha_inicio || null, slug: form.slug?.trim().toLowerCase() || null, fecha_entrega: entrega, vencimiento }
    const r = editId
      ? await supabase.from('clientes_agencia').update(payload).eq('id', editId).select('id').single()
      : await supabase.from('clientes_agencia').insert(payload).select('id').single()
    if (r.error) { setGuardando(false); alert('Error al guardar: ' + (r.error.message.includes('slug') ? 'Ese identificador ya lo usa otro cliente' : r.error.message)); return }
    if (primerPago && entrega) {
      const p = await supabase.from('pagos_suscripcion').insert({ cliente_id: r.data.id, monto: form.mensualidad ?? MENSUALIDAD_BASE, fecha_pago: entrega, periodo_desde: entrega, periodo_hasta: vencimiento })
      if (p.error) alert('El cliente se guardó, pero no se pudo registrar su primer pago: ' + p.error.message)
    }
    setGuardando(false)
    setForm(null); setEditId(null); cargar()
  }

  const eliminar = async (id: number) => {
    if (!confirm('¿Eliminar este cliente?')) return
    const { error } = await supabase.from('clientes_agencia').delete().eq('id', id)
    if (error) { alert('Error al eliminar: ' + error.message); return }
    cargar()
  }

  const editar = (c: ClienteAgencia) => {
    setForm({ ...vacio, nombre: c.nombre, contacto: c.contacto || '', telefono: c.telefono || '', administradora: c.administradora || '', servicios: c.servicios, redes: c.redes, metodos_pago: c.metodos_pago, estado: c.estado, mensualidad: c.mensualidad ?? undefined, dominio: c.dominio || '', fecha_inicio: c.fecha_inicio || '', notas: c.notas || '', enlaces: c.enlaces ?? [], slug: c.slug || '', fecha_entrega: c.fecha_entrega || '', vencimiento: c.vencimiento || '' })
    setEditId(c.id)
  }

  const q = busqueda.trim().toLowerCase()
  const lista = clientes.filter(c => (filtro === 'todos' || c.estado === filtro) && (!q || [c.nombre, c.contacto, c.telefono, c.dominio, ...(c.enlaces ?? []).flatMap(e => [e.nombre, e.url])].some(v => v?.toLowerCase().includes(q))))
  const hoyCobros = clientes.map(c => cobroDe(c))
  const nVencidos = hoyCobros.filter(x => x.tipo === 'vencido').length
  const nPorVencer = hoyCobros.filter(x => x.tipo === 'por_vencer').length
  useEffect(() => { document.title = nVencidos > 0 ? `(${nVencidos}) Cobros vencidos · Mous Hub` : 'Mous Hub' }, [nVencidos])
  const ingresoMensual = clientes.filter(c => c.estado === 'activo').reduce((s, c) => s + (c.mensualidad || 0), 0)

  return (
    <Shell vista={vista} onVista={setVista} alertas={nVencidos}>
      <div className="space-y-6">
        {vista !== 'agenda' && (nVencidos > 0 || nPorVencer > 0) && (
          <button onClick={() => setVista('agenda')} className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-4 text-left text-sm font-semibold ${nVencidos > 0 ? 'border-bad/40 bg-bad/10 text-bad' : 'border-warn/40 bg-warn/10 text-warn'}`}>
            <Icono n="alert" className="size-5 shrink-0" />
            <span className="flex-1">
              {nVencidos > 0 ? `${nVencidos} cliente${nVencidos === 1 ? '' : 's'} con la mensualidad vencida` : ''}{nVencidos > 0 && nPorVencer > 0 ? ' · ' : ''}{nPorVencer > 0 ? `${nPorVencer} vence${nPorVencer === 1 ? '' : 'n'} en los próximos 7 días` : ''}
            </span>
            <span className="underline">Ver agenda</span>
          </button>
        )}

        {vista === 'proyectos' && <Proyectos />}
        {vista === 'agenda' && <Agenda clientes={clientes} recargar={cargar} />}

        {vista === 'clientes' && <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="overline">Agencia</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">Clientes</h1>
              <p className="mt-1 max-w-xl text-sm text-mute">Estado, servicios e ingresos de cada cliente de la agencia.</p>
            </div>
            <button onClick={() => { setForm(vacio); setEditId(null) }} className="btn btn-primary"><Icono n="plus" className="size-4" /> Nuevo cliente</button>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {ESTADOS.map(e => (
              <div key={e.id} className="card p-5">
                <p className="flex items-center gap-2 text-[13px] font-medium text-mute"><span className={`size-2 rounded-full ${e.dot}`} />{e.label}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-ink">{clientes.filter(c => c.estado === e.id).length}</p>
              </div>
            ))}
            <div className="relative col-span-2 overflow-hidden rounded-2xl border border-gold/40 bg-gold-tint p-5 md:col-span-1">
              <MarcaDeAgua className="absolute -bottom-3 -right-3 w-20 opacity-20" />
              <p className="relative text-[13px] font-medium text-gold-strong">Ingreso mensual</p>
              <p className="relative mt-2 text-3xl font-bold tracking-tight text-ink">${ingresoMensual.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative md:w-80">
              <Icono n="search" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-mute" />
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar cliente…" className="field !pl-10" />
            </div>
            <div className="flex flex-wrap gap-2 md:ml-auto">
              {(['todos', ...ESTADOS.map(e => e.id)] as const).map(f => (
                <button key={f} onClick={() => setFiltro(f)}
                  className={`cursor-pointer rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${filtro === f ? 'border-gold bg-gold text-on-gold font-semibold' : 'border-line bg-surface text-mute hover:border-gold/50'}`}>
                  {f === 'todos' ? 'Todos' : ESTADOS.find(e => e.id === f)!.label}
                </button>
              ))}
            </div>
          </div>

          {lista.length === 0 && (
            <div className="relative overflow-hidden rounded-2xl border border-dashed border-line-strong bg-surface p-12 text-center text-sm text-mute">
              <MarcaDeAgua className="mx-auto mb-3 w-14 opacity-60" />
              {clientes.length === 0 ? 'Aún no hay clientes. Pulsa “Nuevo cliente” para agregar el primero.' : 'Ningún cliente coincide con esta vista.'}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 min-[1700px]:grid-cols-4">
            {lista.map(c => {
              const est = ESTADOS.find(e => e.id === c.estado)!
              return (
                <div key={c.id} className="card card-hover anim-rise flex flex-col gap-4 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-gold/30 bg-gold-tint text-lg font-bold text-gold-strong">{c.nombre.charAt(0).toUpperCase()}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{c.nombre}</p>
                      <p className="truncate text-[13px] text-mute">{[c.contacto, c.telefono].filter(Boolean).join(' · ') || 'Sin contacto'}</p>
                    </div>
                    <span className={`pill ${est.pill}`}><span className={`size-1.5 rounded-full ${est.dot}`} />{est.label}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.servicios.map(s => <span key={s} className="pill bg-gold-tint text-gold-strong">{s}</span>)}
                    {c.redes.map(s => <span key={s} className="pill bg-info/15 text-info">{s}</span>)}
                    {c.metodos_pago.map(s => <span key={s} className="pill bg-ok/15 text-ok">{s}</span>)}
                  </div>
                  {(c.enlaces ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {(c.enlaces ?? []).map(e => (
                        <a key={e.nombre + e.url} href={e.url} target="_blank" rel="noreferrer" className="chip gap-1 hover:border-gold/60 hover:text-ink">
                          <Icono n="external" className="size-3" />{e.nombre}
                        </a>
                      ))}
                    </div>
                  )}
                  {c.notas && <p className="line-clamp-2 text-[13px] text-mute">{c.notas}</p>}
                  <div className="mt-auto flex items-center gap-3 border-t border-line pt-3 text-[13px]">
                    <p className="flex-1 truncate font-medium text-ink">
                      {c.mensualidad ? `$${c.mensualidad}/mes` : 'Sin mensualidad'}{c.dominio ? ` · ${c.dominio}` : ''}
                    </p>
                    <button onClick={() => editar(c)} className="cursor-pointer font-semibold text-gold-strong hover:underline">Editar</button>
                    <button onClick={() => eliminar(c.id)} className="cursor-pointer font-semibold text-bad hover:underline">Eliminar</button>
                  </div>
                </div>
              )
            })}
          </div>
        </>}
      </div>

      {form && (
        <Drawer titulo={editId ? 'Editar cliente' : 'Nuevo cliente'} subtitulo="Datos, servicios y cobro mensual" onClose={() => { setForm(null); setEditId(null) }}
          pie={<>
            <button onClick={() => { setForm(null); setEditId(null) }} className="btn btn-ghost flex-1">Cancelar</button>
            <button onClick={guardar} disabled={guardando} className="btn btn-primary flex-1">{guardando ? 'Guardando…' : 'Guardar'}</button>
          </>}>
          <div><label className="label">Nombre del negocio *</label><input className="field" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Contacto</label><input className="field" value={form.contacto || ''} onChange={e => setForm({ ...form, contacto: e.target.value })} /></div>
            <div><label className="label">Teléfono</label><input className="field" value={form.telefono || ''} onChange={e => setForm({ ...form, telefono: e.target.value })} /></div>
          </div>
          <div><label className="label">Administradora (verifica pagos)</label><input className="field" value={form.administradora || ''} onChange={e => setForm({ ...form, administradora: e.target.value })} /></div>
          <div><label className="label">Estado</label>
            <select className="field" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value as Estado })}>
              {ESTADOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
          </div>
          <div><label className="label">Servicios</label><Chips opciones={SERVICIOS} valor={form.servicios} onChange={v => setForm({ ...form, servicios: v })} /></div>
          <div><label className="label">Redes</label><Chips opciones={REDES} valor={form.redes} onChange={v => setForm({ ...form, redes: v })} /></div>
          <div><label className="label">Métodos de pago</label><Chips opciones={PAGOS} valor={form.metodos_pago} onChange={v => setForm({ ...form, metodos_pago: v })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Mensualidad ($)</label><input className="field" type="number" value={form.mensualidad ?? ''} onChange={e => setForm({ ...form, mensualidad: e.target.value === '' ? undefined : Number(e.target.value) })} /></div>
            <div><label className="label">Fecha de inicio</label><input className="field" type="date" value={form.fecha_inicio || ''} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} /></div>
          </div>
          <div><label className="label">Dominio</label><input className="field" value={form.dominio || ''} onChange={e => setForm({ ...form, dominio: e.target.value })} /></div>
          <div className="space-y-3 rounded-xl border border-gold/30 bg-gold-tint/50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink"><Icono n="calendar" className="size-4 text-gold" /> Cobro mensual y servicio</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Fecha de entrega (primer pago)</label><input className="field" type="date" value={form.fecha_entrega || ''} onChange={e => setForm({ ...form, fecha_entrega: e.target.value })} /></div>
              <div><label className="label">Pagado hasta</label><input className="field" type="date" value={form.vencimiento || ''} onChange={e => setForm({ ...form, vencimiento: e.target.value })} /></div>
            </div>
            <div><label className="label">Identificador de la app</label><input className="field" placeholder="ej: shajuanma" value={form.slug || ''} onChange={e => setForm({ ...form, slug: e.target.value })} /></div>
            <p className="text-xs text-mute">El identificador es el que usa la web/app del cliente para saber si su servicio está abierto. Al poner la fecha de entrega, el vencimiento se calcula solo (mismo día del mes siguiente).</p>
          </div>
          <div>
            <label className="label">Enlaces (web, panel, base de datos, redes…)</label>
            {(form.enlaces ?? []).map((e: Enlace, i: number) => (
              <div key={i} className="mb-2 flex gap-2">
                <input className="field !w-32" placeholder="Nombre" value={e.nombre} onChange={ev => setForm({ ...form, enlaces: (form.enlaces ?? []).map((x, j) => (j === i ? { ...x, nombre: ev.target.value } : x)) })} />
                <input className="field" placeholder="https://…" value={e.url} onChange={ev => setForm({ ...form, enlaces: (form.enlaces ?? []).map((x, j) => (j === i ? { ...x, url: ev.target.value } : x)) })} />
                <button type="button" aria-label="Quitar enlace" onClick={() => setForm({ ...form, enlaces: (form.enlaces ?? []).filter((_, j) => j !== i) })} className="btn btn-danger btn-sm !px-2.5"><Icono n="x" className="size-4" /></button>
              </div>
            ))}
            <button type="button" onClick={() => setForm({ ...form, enlaces: [...(form.enlaces ?? []), { nombre: '', url: '' }] })} className="cursor-pointer text-sm font-semibold text-gold-strong hover:underline">+ Agregar enlace</button>
          </div>
          <div><label className="label">Notas</label><textarea className="field" rows={3} value={form.notas || ''} onChange={e => setForm({ ...form, notas: e.target.value })} /></div>
        </Drawer>
      )}
    </Shell>
  )
}
