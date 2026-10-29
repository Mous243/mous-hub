// Generador de presentaciones (.pptx) de la marca Mous: una por proyecto y un portafolio con todos los vigentes.
// Se ejecuta en el navegador (pptxgenjs); no sube nada a ningún servidor.
import type { Proyecto } from '@/lib/supabase'

const C = { fondo: '0A0A0A', panel: '161616', borde: '2A2A2A', oro: 'C8A127', texto: 'F5F5F5', suave: '9CA3AF' }
const FUENTE = 'Calibri'
import { CONTACTO, OWNER_NAME } from '@/lib/config'
const ESTADO: Record<string, string> = { activo: 'En producción', desarrollo: 'En desarrollo', pausado: 'Pausado', archivado: 'Archivado', idea: 'En planificación' }
const PLURAL: Record<string, string> = { web: 'Aplicaciones web', app: 'Aplicaciones', escritorio: 'Programas de escritorio', bot: 'Bots y automatizaciones', landing: 'Páginas web', catalogo: 'Catálogos digitales', trading: 'Herramientas de trading', herramienta: 'Herramientas' }
const TIPO: Record<string, string> = { web: 'Aplicación web', app: 'Aplicación', escritorio: 'Programa de escritorio', bot: 'Bot / automatización', landing: 'Página web', catalogo: 'Catálogo digital', trading: 'Herramienta de trading', herramienta: 'Herramienta' }

async function logoDataUri(): Promise<string> {
  const blob = await (await fetch('/mous-logo-dorado-sm.png')).blob()
  return await new Promise(res => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(blob) })
}
const RATIO = 1000 / 618

/** Captura de pantalla del proyecto (public/capturas/<slug>.png), o null si no existe. */
async function imagenCaptura(slug: string): Promise<string | null> {
  try {
    const r = await fetch(`/capturas/${slug}.png`)
    if (!r.ok || !(r.headers.get('content-type') ?? '').includes('image')) return null
    const blob = await r.blob()
    return await new Promise(res => { const f = new FileReader(); f.onload = () => res(String(f.result)); f.readAsDataURL(blob) })
  } catch { return null }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pres = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Slide = any

function base(pres: Pres, logo: string, titulo?: string): Slide {
  const s: Slide = pres.addSlide()
  s.background = { color: C.fondo }
  s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.12, h: 7.5, fill: { color: C.oro }, line: { color: C.oro, width: 0 } })
  s.addImage({ data: logo, x: 0.55, y: 6.88, w: 0.42 * RATIO * 0.7, h: 0.42 * 0.7 })
  s.addText('Creado por Mous', { x: 1.15, y: 6.85, w: 3, h: 0.35, fontSize: 10, color: C.suave, fontFace: FUENTE, valign: 'middle' })
  if (titulo) {
    s.addText(titulo, { x: 0.7, y: 0.45, w: 11.9, h: 0.8, fontSize: 34, bold: true, color: C.texto, fontFace: FUENTE, margin: 0 })
    s.addShape(pres.ShapeType.rect, { x: 0.7, y: 1.3, w: 1.1, h: 0.06, fill: { color: C.oro }, line: { color: C.oro, width: 0 } })
  }
  return s
}

function chips(pres: Pres, s: Slide, items: string[], x: number, y: number, maxW = 11.9) {
  let cx = x, cy = y
  for (const t of items) {
    const w = Math.min(0.28 + t.length * 0.105, 4)
    if (cx + w > x + maxW) { cx = x; cy += 0.55 }
    s.addShape(pres.ShapeType.roundRect, { x: cx, y: cy, w, h: 0.42, fill: { color: C.panel }, line: { color: C.oro, width: 1 }, rectRadius: 0.2 })
    s.addText(t, { x: cx, y: cy, w, h: 0.42, fontSize: 13, color: C.texto, fontFace: FUENTE, align: 'center', valign: 'middle', margin: 0 })
    cx += w + 0.15
  }
}

function portada(pres: Pres, logo: string, titulo: string, sub: string, pie: string) {
  const s: Slide = pres.addSlide()
  s.background = { color: C.fondo }
  s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.12, h: 7.5, fill: { color: C.oro }, line: { color: C.oro, width: 0 } })
  s.addImage({ data: logo, x: 0.9, y: 0.9, w: 1.3 * RATIO * 0.62, h: 1.3 * 0.62 })
  s.addText(titulo, { x: 0.9, y: 2.5, w: 11.5, h: 1.6, fontSize: titulo.length > 28 ? 44 : 56, bold: true, color: C.texto, fontFace: FUENTE, margin: 0, valign: 'top' })
  s.addShape(pres.ShapeType.rect, { x: 0.9, y: 4.25, w: 1.6, h: 0.07, fill: { color: C.oro }, line: { color: C.oro, width: 0 } })
  s.addText(sub, { x: 0.9, y: 4.5, w: 11.5, h: 0.6, fontSize: 22, color: C.oro, fontFace: FUENTE, margin: 0 })
  s.addText(pie, { x: 0.9, y: 6.7, w: 11.5, h: 0.4, fontSize: 13, color: C.suave, fontFace: FUENTE, margin: 0 })
}

function cierre(pres: Pres, logo: string, titulo: string) {
  const s: Slide = pres.addSlide()
  s.background = { color: C.fondo }
  s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.12, h: 7.5, fill: { color: C.oro }, line: { color: C.oro, width: 0 } })
  s.addImage({ data: logo, x: 0.9, y: 1.2, w: 1.1 * RATIO * 0.62, h: 1.1 * 0.62 })
  s.addText(titulo, { x: 0.9, y: 2.4, w: 11.5, h: 1.1, fontSize: 48, bold: true, color: C.texto, fontFace: FUENTE, margin: 0 })
  s.addShape(pres.ShapeType.rect, { x: 0.9, y: 3.65, w: 1.6, h: 0.07, fill: { color: C.oro }, line: { color: C.oro, width: 0 } })
  s.addText([
    { text: OWNER_NAME || 'Mous Hub', options: { bold: true, color: C.oro, fontSize: 22, breakLine: true } },
    { text: CONTACTO.web, options: { color: C.texto, fontSize: 18, breakLine: true } },
    { text: `${CONTACTO.instagram ? "Instagram " + CONTACTO.instagram : ""}`, options: { color: C.texto, fontSize: 18, breakLine: true } },
    { text: CONTACTO.email, options: { color: C.texto, fontSize: 18 } },
  ], { x: 0.9, y: 4.0, w: 11.5, h: 2, fontFace: FUENTE, margin: 0, paraSpaceAfter: 6, valign: 'top' })
}

const pasosDe = (p: Proyecto) => (p.notas || '').split('\n').map(l => l.trim()).filter(l => /^paso\s*:/i.test(l)).map(l => l.replace(/^paso\s*:\s*/i, ''))
const quitar = (t?: string | null) => (t || '').split('\n').filter(l => !/^paso\s*:/i.test(l.trim())).join(' ').trim()

export async function presentacionProyecto(p: Proyecto) {
  const { default: PptxGenJS } = await import('pptxgenjs')
  const pres = new PptxGenJS()
  pres.layout = 'LAYOUT_WIDE'; pres.title = p.nombre; pres.author = 'Mous'; pres.company = 'Mous'
  const logo = await logoDataUri()

  portada(pres, logo, p.nombre, [TIPO[p.tipo] || 'Proyecto', p.origen === 'cliente' && p.cliente ? `para ${p.cliente}` : ''].filter(Boolean).join(' · '), 'Presentación del proyecto · Mous')

  // ¿Qué es?
  let s = base(pres, logo, '¿Qué es?')
  const desc = p.descripcion || 'Descripción pendiente.'
  s.addText(desc, { x: 0.7, y: 1.7, w: 11.9, h: 2.8, fontSize: desc.length > 220 ? 20 : 26, color: C.texto, fontFace: FUENTE, valign: 'top', margin: 0, lineSpacingMultiple: 1.15 })
  chips(pres, s, [TIPO[p.tipo] || p.tipo, ESTADO[p.estado], p.version ? `v${p.version}` : '', p.url_vivo ? p.url_vivo.replace(/^https?:\/\//, '') : ''].filter(Boolean), 0.7, 5.3)

  // Así se ve (captura real guardada por tools/capturar)
  const captura = await imagenCaptura(p.slug)
  if (captura) {
    s = base(pres, logo, 'Así se ve')
    const w = 8.1, h = w * 900 / 1440
    s.addShape(pres.ShapeType.roundRect, { x: (13.333 - w) / 2 - 0.08, y: 1.55, w: w + 0.16, h: h + 0.16, fill: { color: C.panel }, line: { color: C.oro, width: 1 }, rectRadius: 0.08 })
    s.addImage({ data: captura, x: (13.333 - w) / 2, y: 1.63, w, h })
    if (p.url_vivo) s.addText(p.url_vivo.replace(/^https?:\/\//, ''), { x: 0.7, y: 6.45, w: 11.9, h: 0.35, fontSize: 12, color: C.suave, fontFace: FUENTE, align: 'center', margin: 0 })
  }

  // ¿Qué hace?
  if (p.funciones.length) {
    s = base(pres, logo, '¿Qué hace?')
    const fs = p.funciones.slice(0, 8)
    fs.forEach((f, i) => {
      const col = i % 2, fila = Math.floor(i / 2)
      const x = 0.7 + col * 6.05, y = 1.75 + fila * 1.2
      s.addShape(pres.ShapeType.roundRect, { x, y, w: 5.85, h: 1.0, fill: { color: C.panel }, line: { color: C.borde, width: 1 }, rectRadius: 0.1 })
      s.addShape(pres.ShapeType.rect, { x, y: y + 0.18, w: 0.07, h: 0.64, fill: { color: C.oro }, line: { color: C.oro, width: 0 } })
      s.addText(f, { x: x + 0.3, y, w: 5.4, h: 1.0, fontSize: 18, color: C.texto, fontFace: FUENTE, valign: 'middle', margin: 0 })
    })
  }

  // ¿Cómo funciona? (solo si hay pasos en las notas: líneas "Paso: …")
  const pasos = pasosDe(p).slice(0, 6)
  if (pasos.length) {
    s = base(pres, logo, '¿Cómo funciona?')
    const alto = Math.min(0.85, 4.8 / pasos.length)
    pasos.forEach((t, i) => {
      const y = 1.75 + i * (alto + 0.12)
      s.addShape(pres.ShapeType.ellipse, { x: 0.7, y, w: 0.6, h: 0.6, fill: { color: C.oro }, line: { color: C.oro, width: 0 } })
      s.addText(String(i + 1), { x: 0.7, y, w: 0.6, h: 0.6, fontSize: 20, bold: true, color: C.fondo, fontFace: FUENTE, align: 'center', valign: 'middle', margin: 0 })
      s.addText(t, { x: 1.55, y: y - 0.05, w: 11, h: 0.7, fontSize: 18, color: C.texto, fontFace: FUENTE, valign: 'middle', margin: 0 })
    })
  }

  // Tecnología
  if (p.stack.length) {
    s = base(pres, logo, 'Cómo está construido')
    s.addText('Tecnologías elegidas para que sea rápido, seguro y fácil de mantener:', { x: 0.7, y: 1.7, w: 11.9, h: 0.6, fontSize: 18, color: C.suave, fontFace: FUENTE, margin: 0 })
    chips(pres, s, p.stack, 0.7, 2.6)
  }

  // Estado y próximos pasos
  s = base(pres, logo, 'Estado y próximos pasos')
  const filas: [string, string][] = [['Estado', ESTADO[p.estado]]]
  if (p.version) filas.push(['Versión', p.version])
  if (p.url_vivo) filas.push(['En vivo', p.url_vivo.replace(/^https?:\/\//, '')])
  if (p.ultima_actividad) filas.push(['Última actualización', new Date(p.ultima_actividad + 'T12:00:00').toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' })])
  filas.forEach(([k, v], i) => {
    s.addText(k, { x: 0.7, y: 1.75 + i * 0.6, w: 3.2, h: 0.5, fontSize: 16, color: C.suave, fontFace: FUENTE, margin: 0 })
    s.addText(v, { x: 3.9, y: 1.75 + i * 0.6, w: 8.7, h: 0.5, fontSize: 18, bold: true, color: C.texto, fontFace: FUENTE, margin: 0 })
  })
  const resto = quitar(p.pendientes)
  if (resto) {
    s.addShape(pres.ShapeType.roundRect, { x: 0.7, y: 4.5, w: 11.9, h: 1.7, fill: { color: C.panel }, line: { color: C.oro, width: 1 }, rectRadius: 0.1 })
    s.addText([{ text: 'Próximos pasos', options: { bold: true, color: C.oro, fontSize: 16, breakLine: true } }, { text: resto, options: { color: C.texto, fontSize: 17 } }], { x: 1.0, y: 4.55, w: 11.3, h: 1.6, fontFace: FUENTE, valign: 'middle', margin: 0 })
  }

  cierre(pres, logo, 'Gracias')
  await pres.writeFile({ fileName: `Mous - ${p.nombre.replace(/[\\/:*?"<>|]/g, '')}.pptx` })
}

export async function presentacionPortafolio(todos: Proyecto[]) {
  const ps = todos.filter(p => p.marca !== 'no_aplica') // sin clones de terceros ni apps internas
  const { default: PptxGenJS } = await import('pptxgenjs')
  const pres = new PptxGenJS()
  pres.layout = 'LAYOUT_WIDE'; pres.title = 'Portafolio Mous'; pres.author = 'Mous'; pres.company = 'Mous'
  const logo = await logoDataUri()
  const vig = ps.filter(p => p.estado === 'activo' || p.estado === 'desarrollo')

  portada(pres, logo, 'Portafolio de proyectos', 'Software a la medida' + (OWNER_NAME ? ' · ' + OWNER_NAME : ''), OWNER_NAME || 'Mous')

  let s = base(pres, logo, 'Lo que he construido')
  const cifras: [string, string][] = [[String(ps.length), 'proyectos creados'], [String(vig.length), 'vigentes hoy'], [String(ps.filter(p => p.url_vivo).length), 'en línea'], [String(new Set(ps.filter(p => p.origen === 'cliente').map(p => p.cliente).filter(Boolean)).size), 'clientes atendidos']]
  cifras.forEach(([n, l], i) => {
    const x = 0.7 + i * 3.05
    s.addShape(pres.ShapeType.roundRect, { x, y: 2.0, w: 2.85, h: 2.4, fill: { color: C.panel }, line: { color: C.borde, width: 1 }, rectRadius: 0.1 })
    s.addText(n, { x, y: 2.25, w: 2.85, h: 1.2, fontSize: 60, bold: true, color: C.oro, fontFace: FUENTE, align: 'center', valign: 'middle', margin: 0 })
    s.addText(l, { x, y: 3.45, w: 2.85, h: 0.6, fontSize: 18, color: C.texto, fontFace: FUENTE, align: 'center', margin: 0 })
  })
  s.addText('Aplicaciones web, sistemas de punto de venta, bots, catálogos digitales y herramientas de trading.', { x: 0.7, y: 5.0, w: 11.9, h: 0.9, fontSize: 20, color: C.suave, fontFace: FUENTE, margin: 0 })

  // Una lámina por tipo, con los vigentes (sin nombres de clientes)
  const orden = ['web', 'app', 'escritorio', 'catalogo', 'landing', 'bot', 'trading', 'herramienta']
  for (const t of orden) {
    const lista = vig.filter(p => p.tipo === t)
    for (let k = 0; k < lista.length; k += 6) {
      s = base(pres, logo, PLURAL[t] + (lista.length > 6 ? ` (${k / 6 + 1})` : ''))
      lista.slice(k, k + 6).forEach((p, i) => {
        const col = i % 2, fila = Math.floor(i / 2)
        const x = 0.7 + col * 6.05, y = 1.7 + fila * 1.65
        s.addShape(pres.ShapeType.roundRect, { x, y, w: 5.85, h: 1.5, fill: { color: C.panel }, line: { color: C.borde, width: 1 }, rectRadius: 0.1 })
        s.addShape(pres.ShapeType.rect, { x, y: y + 0.2, w: 0.07, h: 1.1, fill: { color: C.oro }, line: { color: C.oro, width: 0 } })
        s.addText(p.nombre, { x: x + 0.3, y: y + 0.1, w: 5.4, h: 0.5, fontSize: 18, bold: true, color: C.texto, fontFace: FUENTE, margin: 0, valign: 'middle' })
        const d = (p.descripcion || '').length > 105 ? (p.descripcion || '').slice(0, 102).trimEnd() + '…' : p.descripcion || ''
        s.addText(d, { x: x + 0.3, y: y + 0.62, w: 5.4, h: 0.8, fontSize: 13, color: C.suave, fontFace: FUENTE, margin: 0, valign: 'top' })
      })
    }
  }
  cierre(pres, logo, 'Hablemos de tu proyecto')
  await pres.writeFile({ fileName: 'Mous - Portafolio de proyectos.pptx' })
}
