'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Isotipo, MarcaDeAgua, Sello } from '@/components/Logo'


// Acceso real con Supabase Auth (correo + contraseña). La sesión se guarda en el navegador y se renueva sola.
export default function LoginGate({ children }: { children: React.ReactNode }) {
  const [sesion, setSesion] = useState<boolean | null>(null)
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const ruta = usePathname()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(!!data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSesion(!!s))
    return () => data.subscription.unsubscribe()
  }, [])

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setCargando(true)
    const id = email.trim().toLowerCase()
    const { error } = await supabase.auth.signInWithPassword({ email: id, password: clave })
    setCargando(false)
    if (error) {
      const m = error.message.toLowerCase()
      setError(m.includes('not confirmed') ? 'Falta confirmar tu correo: abre el mensaje de Supabase que llegó a tu Gmail.' : m.includes('invalid') ? 'Usuario o contraseña incorrectos.' : error.message)
      setClave('')
    }
  }

  // Las páginas públicas de estado (/estado/<cliente>) se ven sin iniciar sesión.
  if (ruta?.startsWith('/estado/')) return <>{children}</>

  if (sesion === null) return (
    <div className="min-h-screen flex items-center justify-center bg-page"><Isotipo alto={44} className="anim-pulse" /></div>
  )
  if (sesion) return <>{children}</>

  return (
    <div className="relative min-h-screen overflow-hidden bg-page flex items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_srgb,var(--gold)_16%,transparent),transparent_70%)]" />
      <MarcaDeAgua className="absolute -right-24 -bottom-24 w-[520px] opacity-[0.05]" />
      <form onSubmit={entrar} className="card anim-rise relative w-full max-w-sm p-8 space-y-5">
        <div className="flex flex-col items-center text-center">
          <span className="flex size-16 items-center justify-center rounded-2xl border border-gold/30 bg-gold-tint"><Isotipo alto={30} /></span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">Mous Hub</h1>
          <p className="mt-1 text-sm text-mute">Centro de control de proyectos</p>
        </div>
        <div>
          <label className="label" htmlFor="u">Correo</label>
          <input id="u" type="text" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="p">Contraseña</label>
          <input id="p" type="password" autoComplete="current-password" required value={clave} onChange={e => setClave(e.target.value)} className="field" />
        </div>
        {error && <p role="alert" className="rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-[13px] text-bad">{error}</p>}
        <button disabled={cargando} className="btn btn-primary w-full !py-3">{cargando ? 'Entrando…' : 'Entrar'}</button>
        <Sello className="justify-center pt-1" />
      </form>
    </div>
  )
}
