'use client'
import { ABRIR_CARPETA } from '@/lib/config'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Drawer from '@/components/Drawer'
import Icono, { iconoDeTipo } from '@/components/Iconos'
import { Isotipo, MarcaDeAgua } from '@/components/Logo'
import { presentacionPortafolio, presentacionProyecto } from '@/lib/presentacion'
import { supabase, type EstadoProyecto, type Proyecto, type TipoProyecto } from '@/lib/supabase'

export const ESTADOS_P: { id: EstadoProyecto; label: string; color: string; dot: string }[] = [
  { id: 'activo', label: 'Activo', color: 'bg-ok/15 text-ok', dot: 'bg-ok' },
  { id: 'desarrollo', label: 'En desarrollo', color: 'bg-warn/15 text-warn', dot: 'bg-warn' },
  { id: 'pausado', label: 'Pausado', color: 'bg-bad/15 text-bad', dot: 'bg-bad' },
  { id: 'archivado', label: 'Archivado', color: 'bg-mute/15 text-mute', dot: 'bg-mute' },
  { id: 'idea', label: 'Idea', color: 'bg-info/15 text-info', dot: 'bg-info' },
]
const TIPOS: { id: TipoProyecto; label: string }[] = [
  { id: 'web', label: 'Web' }, { id: 'app', label: 'App' }, { id: 'escritorio', label: 'Programa' }, { id: 'bot', label: 'Bot' },
  { id: 'landing', label: 'Landing' }, { id: 'catalogo', label: 'Catálogo' }, { id: 'trading', label: 'Trading' }, { id: 'herramienta', label: 'Herramienta' },
]
const tipoDe = (id: string) => TIPOS.find(t => t.id === id) ?? TIPOS[0]
const estadoDe = (id: string) => ESTADOS_P.find(e => e.id === id) ?? ESTADOS_P[0]

const dias = (f?: string | null) => (f ? Math.floor((Date.now() - new Date(f + 'T12:00:00').getTime()) / 86400000) : null)
const hace = (f?: string | null) => {
  const d = dias(f)
  if (d === null) return 'sin fecha'
  if (d <= 0) return 'hoy'
  if (d === 1) return 'ayer'
  if (d < 30) return `hace ${d} días`
  if (d < 365) return `hace ${Math.floor(d / 30)} ${Math.floor(d / 30) === 1 ? 'mes' : 'meses'}`
  return `hace ${Math.floor(d / 365)} año(s)`
}

type Form = Omit<Proyecto, 'id' | 'updated_at'>
const vacio: Form = { slug: '', nombre: '', tipo: 'web', estado: 'idea', origen: 'propio', cliente: '', descripcion: '', funciones: [], stack: [], carpeta: '', url_vivo: '', zip: '', version: '', ultima_actividad: '', respaldo: 'ninguno', marca: 'pendiente', pendientes: '', notas: '' }
// Enlace propio de Windows (tools/abrir-carpeta): abre la carpeta del proyecto en el Explorador. Solo funciona en el PC donde está instalado.
const urlCarpeta = (p: { carpeta?: string | null; zip?: string | null }) => { const r = p.carpeta || p.zip; return ABRIR_CARPETA && r ? 'mous-abrir://abrir?r=' + encodeURIComponent(r) : null }
const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const lista = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean)

type Problema = { p: Proyecto; texto: string; nivel: 'alto' | 'medio' | 'bajo' }
const esWeb = (p: Proyecto) => ['web', 'app', 'landing', 'catalogo'].includes(p.tipo)
const vivo = (p: Proyecto) => p.estado === 'activo' || p.estado === 'desarrollo'

function problemas(ps: Proyecto[]): Problema[] {
  const out: Problema[] = []
  for (const p of ps) {
    if (vivo(p) && p.respaldo === 'ninguno') out.push({ p, nivel: 'alto', texto: 'Sin respaldo: no tiene git ni zip' })
    if (!p.carpeta && !p.zip) out.push({ p, nivel: 'alto', texto: 'No se sabe dónde está el código' })
    if (p.url_vivo && p.en_linea === false) out.push({ p, nivel: 'alto', texto: `Sitio caído (${p.http_estado ?? 'sin respuesta'}) · revisado ${hace(p.chequeado_en?.slice(0, 10))}` })
    if (vivo(p) && esWeb(p) && !p.url_vivo) out.push({ p, nivel: 'medio', texto: 'Sin enlace en vivo (¿falta publicarlo?)' })
    if (p.estado === 'activo' && (dias(p.ultima_actividad) ?? 0) > 90) out.push({ p, nivel: 'medio', texto: `Marcado activo pero sin cambios ${hace(p.ultima_actividad)}` })
    if (!p.descripcion?.trim()) out.push({ p, nivel: 'bajo', texto: 'Falta la descripción' })
    if (p.pendientes?.trim() && vivo(p)) out.push({ p, nivel: 'bajo', texto: 'Pendiente: ' + p.pendientes })
  }
  const orden = { alto: 0, medio: 1, bajo: 2 }
  return out.sort((a, b) => orden[a.nivel] - orden[b.nivel] || a.p.nombre.localeCompare(b.p.nombre))
}

export default function Proyectos() {
  const [ps, setPs] = useState<Proyecto[]>([])
  const [cargado, setCargado] = useState(false)
  const [errorTabla, setErrorTabla] = useState<string | null>(null)
  const [sub, setSub] = useState<'catalogo' | 'salud'>('catalogo')
  const [estado, setEstado] = useState<EstadoProyecto | 'todos'>('todos')
  const [tipo, setTipo] = useState<TipoProyecto | 'todos'>('todos')
  const [origen, setOrigen] = useState<'todos' | 'propio' | 'cliente'>('todos')
  const [orden, setOrden] = useState<'reciente' | 'nombre'>('reciente')
  const [q, setQ] = useState('')
  const [form, setForm] = useState<Form | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [copiado, setCopiado] = useState('')
  const [generando, setGenerando] = useState(false)
  const [revisando, setRevisando] = useState(false)
  const [avisoEstado, setAvisoEstado] = useState('')
  const [enlaceCopiado, setEnlaceCopiado] = useState(false)
  const generar = async (fn: () => Promise<void>) => {
    setGenerando(true)
    try { await fn() } catch (e) { alert('No se pudo generar la presentación: ' + (e instanceof Error ? e.message : e)) }
    setGenerando(false)
  }

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.from('proyectos').select('*')
    if (error) { setErrorTabla(error.message); setCargado(true); return }
    setErrorTabla(null); setPs((data || []) as Proyecto[]); setCargado(true)
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase()
    const r = ps.filter(p => (estado === 'todos' || p.estado === estado) && (tipo === 'todos' || p.tipo === tipo) && (origen === 'todos' || p.origen === origen)
      && (!t || [p.nombre, p.cliente, p.descripcion, p.carpeta, ...p.stack, ...p.funciones].some(v => v?.toLowerCase().includes(t))))
    return r.sort((a, b) => orden === 'nombre' ? a.nombre.localeCompare(b.nombre) : (b.ultima_actividad || '').localeCompare(a.ultima_actividad || ''))
  }, [ps, estado, tipo, origen, orden, q])
  const probs = useMemo(() => problemas(ps), [ps])

  const abrir = (p?: Proyecto) => {
    if (!p) { setForm(vacio); setEditId(null); return }
    const { id, updated_at, ...rest } = p
    void updated_at
    setForm({ ...vacio, ...rest, cliente: rest.cliente || '', descripcion: rest.descripcion || '', carpeta: rest.carpeta || '', url_vivo: rest.url_vivo || '', zip: rest.zip || '', version: rest.version || '', ultima_actividad: rest.ultima_actividad || '', pendientes: rest.pendientes || '', notas: rest.notas || '' })
    setEditId(id)
  }
  const guardar = async () => {
    if (!form || !form.nombre.trim()) { alert('El nombre es obligatorio'); return }
    setGuardando(true)
    const nul = (v?: string | null) => (v && v.trim() ? v.trim() : null)
    const { en_linea, latencia_ms, http_estado, chequeado_en, ...editable } = form
    void en_linea; void latencia_ms; void http_estado; void chequeado_en
    const payload = { ...editable, slug: form.slug.trim() || slugify(form.nombre), cliente: nul(form.cliente), descripcion: nul(form.descripcion), carpeta: nul(form.carpeta), url_vivo: nul(form.url_vivo), zip: nul(form.zip), version: nul(form.version), ultima_actividad: nul(form.ultima_actividad), pendientes: nul(form.pendientes), notas: nul(form.notas) }
    const r = editId ? await supabase.from('proyectos').update(payload).eq('id', editId) : await supabase.from('proyectos').insert(payload)
    setGuardando(false)
    if (r.error) { alert('Error al guardar: ' + (r.error.message.includes('slug') ? 'Ese identificador ya existe' : r.error.message)); return }
    setForm(null); setEditId(null); cargar()
  }
  const revisarAhora = async () => {
    setRevisando(true); setAvisoEstado('')
    try {
      const { data } = await supabase.auth.getSession()
      const r = await fetch('/api/chequear', { method: 'POST', headers: { Authorization: 'Bearer ' + (data.session?.access_token ?? '') } })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Error ' + r.status)
      setAvisoEstado(j.caidos.length ? `${j.revisados} revisados · caídos: ${j.caidos.join(', ')}` : `${j.revisados} sitios revisados: todos en línea`)
      await cargar()
    } catch (e) { setAvisoEstado('No se pudo revisar: ' + (e instanceof Error ? e.message : e)) }
    setRevisando(false)
  }
  const copiarEstado = async (slug: string) => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/estado/${slug}`); setEnlaceCopiado(true); setTimeout(() => setEnlaceCopiado(false), 1500) } catch {}
  }
  const eliminar = async () => {
    if (!editId || !confirm('¿Eliminar este proyecto del inventario? (no borra archivos)')) return
    const { error } = await supabase.from('proyectos').delete().eq('id', editId)
    if (error) { alert('Error: ' + error.message); return }
    setForm(null); setEditId(null); cargar()
  }
  const copiar = async (texto: string) => {
    try { await navigator.clipboard.writeText(texto); setCopiado(texto); setTimeout(() => setCopiado(''), 1500) } catch {}
  }
  const conteo = (e: EstadoProyecto) => ps.filter(p => p.estado === e).length
  const nAltos = probs.filter(x => x.nivel === 'alto').length
  const conMarca = ps.filter(p => p.marca === 'aplicada').length
  const cierre = () => { setForm(null); setEditId(null) }

  if (cargado && errorTabla) return (
    <div className="rounded-2xl border border-warn/40 bg-warn/10 p-6 text-sm text-warn">
      <p className="font-semibold">Falta crear la tabla de proyectos en Supabase.</p>
      <p className="mt-1">Ejecuta <code>supabase/migrations/20261028000000_proyectos.sql</code> en el SQL Editor y vuelve a cargar. ({errorTabla})</p>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Portada */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6 lg:px-8 lg:py-7" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_120%_at_100%_0%,color-mix(in_srgb,var(--gold)_16%,transparent),transparent_65%)]" />
        <MarcaDeAgua className="absolute -right-6 -top-4 w-56 opacity-[0.07] lg:w-72" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="overline text-gold">Portafolio de Mous</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink lg:text-4xl">Proyectos</h1>
            <p className="mt-2 max-w-xl text-sm text-mute">Todo lo que has creado: activo, pausado, archivado o en zip. {ps.length > 0 && <span className="text-ink">{conMarca} de {ps.length} ya llevan tu marca.</span>}</p>
            {avisoEstado && <p role="status" className="mt-2 text-xs font-medium text-gold-strong">{avisoEstado}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-line bg-elevated p-1 text-sm font-semibold">
              {([['catalogo', 'Catálogo'], ['salud', 'Salud']] as const).map(([id, l]) => (
                <button key={id} onClick={() => setSub(id)} className={`relative cursor-pointer rounded-lg px-3.5 py-1.5 transition-colors ${sub === id ? 'bg-gold text-on-gold' : 'text-mute hover:text-ink'}`}>
                  {l}{id === 'salud' && nAltos > 0 && <span className="ml-1.5 rounded-full bg-bad px-1.5 text-[11px] font-bold text-white">{nAltos}</span>}
                </button>
              ))}
            </div>
            <button onClick={revisarAhora} disabled={revisando} title="Comprueba ahora si cada sitio responde" className="btn btn-ghost"><Icono n="clock" className="size-4" />{revisando ? 'Revisando…' : 'Revisar ahora'}</button>
            <button onClick={() => generar(() => presentacionPortafolio(ps))} disabled={generando || ps.length === 0} title="Presentación con todos los proyectos vigentes" className="btn btn-ghost">
              <Icono n="presentation" className="size-4" />{generando ? 'Generando…' : 'Portafolio'}
            </button>
            <button onClick={() => abrir()} className="btn btn-primary"><Icono n="plus" className="size-4" /> Nuevo proyecto</button>
          </div>
        </div>
      </section>

      {/* Cifras */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <div className="relative overflow-hidden rounded-2xl border border-gold/40 bg-gold-tint p-4">
          <MarcaDeAgua className="absolute -bottom-2 -right-2 w-16 opacity-25" />
          <p className="relative text-[13px] font-medium text-gold-strong">Total</p>
          <p className="relative mt-1 text-3xl font-bold tracking-tight text-ink">{ps.length}</p>
        </div>
        {ESTADOS_P.map(e => (
          <button key={e.id} onClick={() => { setSub('catalogo'); setEstado(estado === e.id ? 'todos' : e.id) }}
            className={`card cursor-pointer p-4 text-left transition-colors ${estado === e.id ? '!border-gold ring-1 ring-gold/40' : 'hover:border-gold/40'}`}>
            <p className="flex items-center gap-2 text-[13px] font-medium text-mute"><span className={`size-2 rounded-full ${e.dot}`} />{e.label}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-ink">{conteo(e.id)}</p>
          </button>
        ))}
      </div>

      {sub === 'salud' ? (
        <section className="space-y-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {([['Sin respaldo', ps.filter(p => vivo(p) && p.respaldo === 'ninguno').length, 'shield'], ['Marca pendiente', ps.filter(p => p.marca === 'pendiente').length, 'alert'],
              ['Con enlace en vivo', ps.filter(p => p.url_vivo).length, 'globe'], ['En zip o archivados', ps.filter(p => p.zip || p.estado === 'archivado').length, 'folder']] as const).map(([l, n, ic]) => (
              <div key={l} className="card p-4">
                <p className="flex items-center gap-2 text-[13px] text-mute"><Icono n={ic} className="size-4 text-gold" />{l}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-ink">{n}</p>
              </div>
            ))}
          </div>
          {probs.length === 0 && <div className="card p-10 text-center text-sm text-mute"><MarcaDeAgua className="mx-auto mb-3 w-12 opacity-60" />Todo en orden.</div>}
          {probs.map((x, i) => (
            <button key={i} onClick={() => abrir(x.p)} className="card card-hover flex w-full cursor-pointer items-center gap-3 p-3.5 text-left text-sm">
              <span className={`size-2.5 shrink-0 rounded-full ${x.nivel === 'alto' ? 'bg-bad' : x.nivel === 'medio' ? 'bg-warn' : 'bg-mute'}`} />
              <span className="shrink-0 font-semibold text-ink">{x.p.nombre}</span>
              <span className="truncate text-mute">{x.texto}</span>
            </button>
          ))}
        </section>
      ) : (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative lg:w-96">
              <Icono n="search" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-mute" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre, cliente, tecnología, función…" className="field !pl-10" />
            </div>
            <div className="flex flex-wrap gap-2 lg:ml-auto">
              <select aria-label="Tipo" value={tipo} onChange={e => setTipo(e.target.value as TipoProyecto | 'todos')} className="field !w-auto cursor-pointer">
                <option value="todos">Todos los tipos</option>{TIPOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <select aria-label="Origen" value={origen} onChange={e => setOrigen(e.target.value as 'todos' | 'propio' | 'cliente')} className="field !w-auto cursor-pointer">
                <option value="todos">Propios y de clientes</option><option value="propio">Propios</option><option value="cliente">De clientes</option>
              </select>
              <select aria-label="Orden" value={orden} onChange={e => setOrden(e.target.value as 'reciente' | 'nombre')} className="field !w-auto cursor-pointer">
                <option value="reciente">Más recientes</option><option value="nombre">Nombre A-Z</option>
              </select>
            </div>
          </div>

          {!cargado && <div className="flex justify-center py-16"><Isotipo alto={40} className="anim-pulse" /></div>}
          {cargado && filtrados.length === 0 && <div className="card p-12 text-center text-sm text-mute"><MarcaDeAgua className="mx-auto mb-3 w-12 opacity-60" />{ps.length === 0 ? 'Aún no hay proyectos cargados.' : 'Ningún proyecto coincide con esta vista.'}</div>}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 min-[1700px]:grid-cols-4">
            {filtrados.map(p => {
              const est = estadoDe(p.estado), t = tipoDe(p.tipo)
              return (
                <article key={p.id} className="card card-hover anim-rise flex flex-col gap-3.5 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-elevated text-gold"><Icono n={iconoDeTipo[p.tipo] ?? 'folder'} className="size-5" /></div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-ink">{p.nombre}</h3>
                      <p className="truncate text-[13px] text-mute">{t.label}{p.cliente ? ` · ${p.cliente}` : p.origen === 'propio' ? ' · propio' : ''}{p.version ? ` · v${p.version}` : ''}</p>
                    </div>
                    <span className={`pill ${est.color}`}><span className={`size-1.5 rounded-full ${est.dot}`} />{est.label}</span>
                  </div>
                  {p.descripcion && <p className="line-clamp-3 text-[13px] leading-relaxed text-mute">{p.descripcion}</p>}
                  {p.stack.length > 0 && <div className="flex flex-wrap gap-1.5">{p.stack.slice(0, 5).map(s => <span key={s} className="chip">{s}</span>)}</div>}
                  {p.url_vivo && (
                    <p className={`flex items-center gap-1.5 text-xs font-medium ${p.en_linea === true ? 'text-ok' : p.en_linea === false ? 'text-bad' : 'text-mute'}`} title={p.chequeado_en ? 'Última revisión: ' + new Date(p.chequeado_en).toLocaleString('es-VE') : 'Aún no se ha revisado'}>
                      <span className={`size-2 rounded-full ${p.en_linea === true ? 'bg-ok' : p.en_linea === false ? 'bg-bad' : 'bg-mute'}`} />
                      {p.en_linea === true ? `En línea${p.latencia_ms ? ` · ${p.latencia_ms} ms` : ''}` : p.en_linea === false ? 'Caído' : 'Sin revisar'}
                    </p>
                  )}
                  {p.pendientes && <p className="flex items-start gap-1.5 text-xs text-warn"><Icono n="clock" className="mt-px size-3.5 shrink-0" /><span className="line-clamp-2">{p.pendientes}</span></p>}
                  <div className="mt-auto flex items-center gap-2 border-t border-line pt-3 text-[13px]">
                    <span className={`flex min-w-0 flex-1 items-center gap-1.5 ${p.respaldo === 'ninguno' ? 'text-warn' : 'text-mute'}`} title={p.respaldo === 'ninguno' ? 'Sin respaldo' : 'Respaldo: ' + p.respaldo}>
                      <Icono n={p.respaldo === 'ninguno' ? 'alert' : 'check'} className="size-3.5 shrink-0" />
                      <span className="truncate">{p.respaldo === 'ninguno' ? 'Sin respaldo' : p.respaldo === 'ambos' ? 'Git + zip' : p.respaldo === 'git' ? 'Git' : 'Zip'} · {hace(p.ultima_actividad)}</span>
                    </span>
                    {p.marca === 'aplicada' && <span title="Lleva el sello «Creado por Mous»" className="flex size-6 shrink-0 items-center justify-center rounded-md border border-gold/30 bg-gold-tint"><Isotipo alto={10} /></span>}
                    {urlCarpeta(p) && <a href={urlCarpeta(p)!} title={p.carpeta ? 'Abrir la carpeta en el Explorador de Windows' : 'Mostrar el zip en el Explorador de Windows'} className="hidden items-center gap-1 font-semibold text-ink hover:text-gold-strong lg:flex"><Icono n="folder" className="size-3.5" />Carpeta</a>}
                    {p.url_vivo && <a href={p.url_vivo} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold text-gold-strong hover:underline">Abrir <Icono n="external" className="size-3.5" /></a>}
                    <button onClick={() => abrir(p)} className="cursor-pointer font-semibold text-ink hover:text-gold-strong">Ficha</button>
                  </div>
                </article>
              )
            })}
          </div>
          <p className="text-xs text-mute">{filtrados.length} de {ps.length} proyectos</p>
        </>
      )}

      {form && (
        <Drawer titulo={editId ? form.nombre || 'Ficha del proyecto' : 'Nuevo proyecto'} subtitulo={editId ? 'Ficha del proyecto' : 'Se guarda en tu inventario'} onClose={cierre}
          pie={<>
            {editId && <button onClick={eliminar} className="btn btn-danger">Eliminar</button>}
            {editId && <button onClick={() => generar(() => presentacionProyecto({ ...(ps.find(x => x.id === editId) as Proyecto), ...form } as Proyecto))} disabled={generando} className="btn btn-ghost"><Icono n="presentation" className="size-4" />{generando ? 'Generando…' : 'Presentación'}</button>}
            <span className="flex-1" />
            <button onClick={cierre} className="btn btn-ghost">Cancelar</button>
            <button onClick={guardar} disabled={guardando} className="btn btn-primary">{guardando ? 'Guardando…' : 'Guardar'}</button>
          </>}>
          <div><label className="label">Nombre *</label><input className="field" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div><label className="label">Estado</label><select className="field" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value as EstadoProyecto })}>{ESTADOS_P.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}</select></div>
            <div><label className="label">Tipo</label><select className="field" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value as TipoProyecto })}>{TIPOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
            <div><label className="label">Origen</label><select className="field" value={form.origen} onChange={e => setForm({ ...form, origen: e.target.value as 'propio' | 'cliente' })}><option value="propio">Propio</option><option value="cliente">De cliente</option></select></div>
            <div><label className="label">Versión</label><input className="field" value={form.version || ''} onChange={e => setForm({ ...form, version: e.target.value })} /></div>
          </div>
          <div><label className="label">Cliente o negocio</label><input className="field" value={form.cliente || ''} onChange={e => setForm({ ...form, cliente: e.target.value })} /></div>
          <div><label className="label">¿Qué hace? (sirve para las presentaciones)</label><textarea className="field" rows={3} value={form.descripcion || ''} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></div>
          <div><label className="label">Funciones principales (separadas por coma)</label><input className="field" value={form.funciones.join(', ')} onChange={e => setForm({ ...form, funciones: lista(e.target.value) })} /></div>
          <div><label className="label">Tecnologías (separadas por coma)</label><input className="field" value={form.stack.join(', ')} onChange={e => setForm({ ...form, stack: lista(e.target.value) })} /></div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div><label className="label">Enlace en vivo</label><input className="field" placeholder="https://…" value={form.url_vivo || ''} onChange={e => setForm({ ...form, url_vivo: e.target.value })} /></div>
            <div><label className="label">Última actividad</label><input className="field" type="date" value={form.ultima_actividad || ''} onChange={e => setForm({ ...form, ultima_actividad: e.target.value })} /></div>
            <div><label className="label">Carpeta (desde el Escritorio)</label><input className="field" value={form.carpeta || ''} onChange={e => setForm({ ...form, carpeta: e.target.value })} /></div>
            <div><label className="label">Zip (desde el Escritorio)</label><input className="field" value={form.zip || ''} onChange={e => setForm({ ...form, zip: e.target.value })} /></div>
            <div><label className="label">Respaldo</label><select className="field" value={form.respaldo} onChange={e => setForm({ ...form, respaldo: e.target.value as Proyecto['respaldo'] })}><option value="ninguno">Ninguno</option><option value="git">Git</option><option value="zip">Zip</option><option value="ambos">Git + zip</option></select></div>
            <div><label className="label">Marca Mous</label><select className="field" value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value as Proyecto['marca'] })}><option value="pendiente">Pendiente</option><option value="aplicada">Aplicada</option><option value="no_aplica">No aplica</option></select></div>
          </div>
          {urlCarpeta(form) && <a href={urlCarpeta(form)!} className="btn btn-ghost btn-sm w-fit"><Icono n="folder" className="size-4" />{form.carpeta ? 'Abrir carpeta' : 'Mostrar zip'}</a>}
          {form.carpeta && <button type="button" onClick={() => copiar('C:\\Users\\Lenovo\\Desktop\\' + form.carpeta!.replace(/\//g, '\\'))} className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-gold-strong hover:underline"><Icono n="copy" className="size-4" />{copiado ? 'Ruta copiada' : 'Copiar ruta completa'}</button>}
          {form.url_vivo && form.slug && (
            <div className="rounded-xl border border-line bg-elevated p-4 space-y-2">
              <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-ink">
                <input type="checkbox" className="size-4 accent-[var(--gold)]" checked={!!form.estado_publico} onChange={e => setForm({ ...form, estado_publico: e.target.checked })} />
                Publicar una página de estado para el cliente
              </label>
              <p className="text-xs text-mute">Muestra si su sistema está funcionando y su disponibilidad de 30 días, con tu marca. Guarda la ficha para activarla.</p>
              {form.estado_publico && editId && <button type="button" onClick={() => copiarEstado(form.slug)} className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-gold-strong hover:underline"><Icono n="copy" className="size-4" />{enlaceCopiado ? 'Enlace copiado' : 'Copiar enlace de la página de estado'}</button>}
            </div>
          )}
          <div><label className="label">Pendientes</label><textarea className="field" rows={2} value={form.pendientes || ''} onChange={e => setForm({ ...form, pendientes: e.target.value })} /></div>
          <div><label className="label">Notas</label><textarea className="field" rows={4} placeholder={'Para la presentación, escribe el flujo en líneas que empiecen con "Paso: …" (aparecen en la diapositiva Cómo funciona).'} value={form.notas || ''} onChange={e => setForm({ ...form, notas: e.target.value })} /></div>
        </Drawer>
      )}
    </div>
  )
}
