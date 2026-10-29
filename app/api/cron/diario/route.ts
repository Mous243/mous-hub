import { NextResponse } from 'next/server'
import { armarResumen, chequearYGuardar, rpc, telegram, type CobroFila } from '@/lib/chequeo'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Tarea diaria (Vercel Cron, ver vercel.json): revisa los sitios, guarda el estado y manda el resumen por Telegram.
// Vercel envía "Authorization: Bearer <CRON_SECRET>"; cualquier otra petición se rechaza.
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'no autorizado' }, { status: 401 })
  }
  try {
    const res = await chequearYGuardar()
    const cobros = await rpc<CobroFila[]>('hub_cobros')
    const resumen = armarResumen(res, cobros)
    const envio = resumen ? await telegram(resumen) : { enviado: false, motivo: 'Nada que avisar' }
    return NextResponse.json({ revisados: res.length, caidos: res.filter(r => !r.ok).length, aviso: envio })
  } catch (e) {
    await telegram(`⚠️ <b>Mous Hub</b>: falló la revisión diaria.\n${e instanceof Error ? e.message : String(e)}`).catch(() => {})
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
