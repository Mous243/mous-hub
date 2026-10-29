'use client'
import Icono, { type NombreIcono } from '@/components/Iconos'
import { Sello, Wordmark } from '@/components/Logo'
import ThemeToggle from '@/components/ThemeToggle'
import { OWNER_NAME } from '@/lib/config'
import { supabase } from '@/lib/supabase'

export type Vista = 'proyectos' | 'clientes' | 'agenda'
const NAV: { id: Vista; label: string; icono: NombreIcono }[] = [
  { id: 'proyectos', label: 'Proyectos', icono: 'folder' },
  { id: 'clientes', label: 'Clientes', icono: 'users' },
  { id: 'agenda', label: 'Agenda de cobros', icono: 'calendar' },
]

export default function Shell({ vista, onVista, alertas, children }: { vista: Vista; onVista: (v: Vista) => void; alertas: number; children: React.ReactNode }) {
  const salir = () => supabase.auth.signOut()
  return (
    <div className="min-h-screen lg:pl-64">
      {/* Barra lateral (escritorio) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
        <div className="px-5 pb-6 pt-6"><Wordmark /></div>
        <nav className="flex-1 space-y-1 px-3" aria-label="Principal">
          <p className="overline px-3 pb-2">Menú</p>
          {NAV.map(n => {
            const activo = vista === n.id
            return (
              <button key={n.id} onClick={() => onVista(n.id)} aria-current={activo ? 'page' : undefined}
                className={`group relative flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${activo ? 'bg-gold-tint text-gold-strong' : 'text-mute hover:bg-elevated hover:text-ink'}`}>
                {activo && <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-gold" />}
                <Icono n={n.icono} className="size-[18px]" />
                <span className="flex-1 text-left">{n.label}</span>
                {n.id === 'agenda' && alertas > 0 && <span className="rounded-full bg-bad px-1.5 text-[11px] font-bold text-white">{alertas}</span>}
              </button>
            )
          })}
        </nav>
        <div className="space-y-3 border-t border-line p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-gold text-sm font-bold text-on-gold">{(OWNER_NAME || 'M')[0].toUpperCase()}</span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold text-ink">{OWNER_NAME || 'Mous Hub'}</p>
              <p className="truncate text-xs text-mute">Propietario</p>
            </div>
          </div>
          <div className="flex gap-2">
            <ThemeToggle />
            <button onClick={salir} className="btn btn-ghost btn-sm flex-1"><Icono n="logout" className="size-4" /> Salir</button>
          </div>
          <Sello className="justify-center" />
        </div>
      </aside>

      {/* Cabecera móvil */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
        <Wordmark compacto />
        <div className="flex gap-2">
          <ThemeToggle />
          <button onClick={salir} aria-label="Cerrar sesión" className="btn btn-ghost btn-sm !px-2.5"><Icono n="logout" className="size-4" /></button>
        </div>
      </header>

      <main className="w-full px-4 pb-28 pt-6 lg:px-8 lg:pb-12 lg:pt-8 2xl:px-10">{children}</main>

      {/* Navegación inferior (teléfono) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Principal">
        {NAV.map(n => {
          const activo = vista === n.id
          return (
            <button key={n.id} onClick={() => onVista(n.id)} aria-current={activo ? 'page' : undefined}
              className={`relative flex cursor-pointer flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${activo ? 'text-gold-strong' : 'text-mute'}`}>
              <Icono n={n.icono} className="size-5" />
              {n.id === 'agenda' ? 'Cobros' : n.label}
              {n.id === 'agenda' && alertas > 0 && <span className="absolute right-[28%] top-1.5 rounded-full bg-bad px-1.5 text-[10px] font-bold text-white">{alertas}</span>}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
