import { NextResponse } from 'next/server'
import { chequearYGuardar, clienteAnon, HUB_EMAIL } from '@/lib/chequeo'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// "Revisar ahora" desde el Hub: solo con la sesión del dueño. No manda avisos de Telegram (eso lo hace la tarea diaria).
export async function POST(req: Request) {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data } = token ? await clienteAnon().auth.getUser(token) : { data: { user: null } }
  if (data.user?.email !== HUB_EMAIL) return NextResponse.json({ error: 'no autorizado' }, { status: 401 })
  try {
    const res = await chequearYGuardar()
    return NextResponse.json({ revisados: res.length, caidos: res.filter(r => !r.ok).map(r => r.nombre) })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
