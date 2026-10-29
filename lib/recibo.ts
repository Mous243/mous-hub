// Recibo de pago en PDF con la marca Mous. Se genera en el navegador (jsPDF); no sube nada a ningún servidor.
import { fechaLarga } from '@/lib/suscripcion'
import { CONTACTO, OWNER_NAME } from '@/lib/config'

export type DatosRecibo = {
  numero: string; cliente: string; contacto?: string | null; monto: number; fechaPago: string
  desde?: string | null; hasta?: string | null; concepto?: string
}

const ORO: [number, number, number] = [200, 161, 39]
const NEGRO: [number, number, number] = [10, 10, 12]
const GRIS: [number, number, number] = [110, 110, 120]
const LINEA: [number, number, number] = [226, 223, 212]

async function logo(): Promise<string> {
  const blob = await (await fetch('/mous-logo-dorado-sm.png')).blob()
  return await new Promise(res => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(blob) })
}

export async function reciboPDF(d: DatosRecibo) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const img = await logo()

  // Franja superior oscura con el logo
  doc.setFillColor(...NEGRO); doc.rect(0, 0, W, 42, 'F')
  doc.addImage(img, 'PNG', 18, 12, 24.3, 15)
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.text('MOUS', 48, 21)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...ORO); doc.text('SOFTWARE A LA MEDIDA', 48, 27)
  doc.setFillColor(...ORO); doc.rect(0, 42, W, 1.2, 'F')

  // Título y número
  doc.setTextColor(...NEGRO); doc.setFont('helvetica', 'bold'); doc.setFontSize(24); doc.text('Recibo de pago', 18, 62)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...GRIS)
  doc.text(`N.º ${d.numero}`, W - 18, 56, { align: 'right' })
  doc.text(`Fecha: ${fechaLarga(d.fechaPago)}`, W - 18, 62, { align: 'right' })

  // Datos del cliente
  let y = 80
  doc.setDrawColor(...LINEA); doc.line(18, y - 8, W - 18, y - 8)
  doc.setFontSize(8); doc.setTextColor(...GRIS); doc.setFont('helvetica', 'bold'); doc.text('RECIBIDO DE', 18, y)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...NEGRO); doc.text(d.cliente, 18, y + 8)
  if (d.contacto) { doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...GRIS); doc.text(`Atención: ${d.contacto}`, 18, y + 14) }

  // Detalle
  y = 112
  doc.setFillColor(247, 246, 241); doc.rect(18, y, W - 36, 10, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...GRIS)
  doc.text('CONCEPTO', 22, y + 6.5); doc.text('PERÍODO CUBIERTO', 112, y + 6.5); doc.text('MONTO', W - 22, y + 6.5, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(...NEGRO)
  doc.text(d.concepto ?? 'Mensualidad: servicio web y app', 22, y + 20)
  doc.text(d.desde && d.hasta ? `${fechaLarga(d.desde)} al ${fechaLarga(d.hasta)}` : d.hasta ? `Hasta ${fechaLarga(d.hasta)}` : '—', 112, y + 20)
  doc.text(`$${d.monto.toFixed(2)}`, W - 22, y + 20, { align: 'right' })
  doc.setDrawColor(...LINEA); doc.line(18, y + 27, W - 18, y + 27)

  // Total
  doc.setFillColor(...NEGRO); doc.roundedRect(W - 88, y + 36, 70, 22, 3, 3, 'F')
  doc.setTextColor(...ORO); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text('TOTAL PAGADO', W - 80, y + 44)
  doc.setTextColor(255, 255, 255); doc.setFontSize(20); doc.text(`$${d.monto.toFixed(2)}`, W - 80, y + 53)

  // Nota
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...GRIS)
  doc.text('Gracias por tu confianza. Este recibo confirma el pago de tu servicio', 18, y + 46)
  doc.text(d.hasta ? `hasta el ${fechaLarga(d.hasta)}.` : 'del período indicado.', 18, y + 52)

  // Pie
  doc.setDrawColor(...ORO); doc.setLineWidth(0.6); doc.line(18, 270, W - 18, 270)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...NEGRO); doc.text(OWNER_NAME || 'Mous Hub', 18, 277)
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRIS); doc.text([CONTACTO.web, CONTACTO.instagram && 'Instagram ' + CONTACTO.instagram].filter(Boolean).join('  ·  '), 18, 282)
  doc.addImage(img, 'PNG', W - 18 - 9.7, 273, 9.7, 6)
  doc.setFontSize(7); doc.text('Creado por Mous', W - 18, 284, { align: 'right' })

  doc.save(`Recibo ${d.numero} - ${d.cliente.replace(/[\\/:*?"<>|]/g, '')}.pdf`)
}
