'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Isotipo, MarcaDeAgua } from '@/components/Logo'
import Icono from '@/components/Iconos'
import { supabase } from '@/lib/supabase'

type Estado = { nombre?: string; en_linea?: boolean | null; chequeado_en?: string | null; uptime_30d?: number | null; dias?: { d: string; ok: boolean }[]; no_encontrado?: boolean }

const fecha = (iso: string) => new Date(iso).toLocaleString('es-VE', { timeZone: 'America/Caracas', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

// Página pública (sin login) con el estado del sistema de un cliente. Solo aparece si el proyecto tiene activada la opción en el Hub.
export default function PaginaEstado() {
  const { slug } = useParams<{ slug: string }>()
  const [e, setE] = useState<Estado | null>(null)

  useEffect(() => {
    supabase.rpc('estado_publico', { p_slug: slug }).then(({ data }) => setE((data as Estado) ?? { no_encontrado: true }))
  }, [slug])

  const operativo = e?.en_linea === true
  const sinDatos = e && !e.no_encontrado && e.en_linea == null
  const color = operativo ? 'text-ok' : sinDatos ? 'text-mute' : 'text-bad'

  return (
    <div className="relative min-h-screen overflow-hidden bg-page px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_0%,color-mix(in_srgb,var(--gold)_14%,transparent),transparent_70%)]" />
      <MarcaDeAgua className="absolute -bottom-20 -right-20 w-[460px] opacity-[0.05]" />
      <main className="relative mx-auto max-w-2xl space-y-5">
        <header className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl border border-gold/30 bg-gold-tint"><Isotipo alto={18} /></span>
          <div className="leading-none"><p className="text-sm font-bold text-ink">Estado del sistema</p><p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-gold">Mous</p></div>
        </header>

        {!e && <div className="flex justify-center py-20"><Isotipo alto={40} className="anim-pulse" /></div>}
        {e?.no_encontrado && <div className="card p-10 text-center text-sm text-mute">Esta página de estado no está disponible.</div>}

        {e && !e.no_encontrado && (<>
          <section className="card anim-rise p-6">
            <p className="overline">{e.nombre}</p>
            <div className={`mt-3 flex items-center gap-3 ${color}`}>
              <Icono n={operativo ? 'check' : 'alert'} className="size-8" />
              <h1 className="text-2xl font-bold tracking-tight text-ink">{operativo ? 'Todo funciona con normalidad' : sinDatos ? 'Aún sin datos de revisión' : 'Estamos revisando un problema'}</h1>
            </div>
            {e.chequeado_en && <p className="mt-2 text-sm text-mute">Última revisión: {fecha(e.chequeado_en)} (hora de Venezuela)</p>}
          </section>

          <section className="card anim-rise p-6">
            <div className="flex items-end justify-between">
              <div><p className="overline">Disponibilidad · últimos 30 días</p><p className="mt-1 text-3xl font-bold tracking-tight text-ink">{e.uptime_30d != null ? `${e.uptime_30d}%` : '—'}</p></div>
              <p className="text-xs text-mute">Se revisa todos los días</p>
            </div>
            <div className="mt-4 flex h-9 items-end gap-[3px]" aria-label="Historial de los últimos días">
              {(e.dias ?? []).map(d => <span key={d.d} title={`${d.d}: ${d.ok ? 'sin problemas' : 'hubo una incidencia'}`} className={`h-full flex-1 rounded-sm ${d.ok ? 'bg-ok' : 'bg-bad'}`} />)}
              {(e.dias ?? []).length === 0 && <p className="text-sm text-mute">El historial aparecerá después de las primeras revisiones.</p>}
            </div>
          </section>
        </>)}

        <footer className="pt-2 text-center">
          <a href="https://mous-dev.vercel.app" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[11px] tracking-wide text-mute/80 hover:text-ink">
            <Isotipo alto={10} className="opacity-70" /> Creado por Mous
          </a>
        </footer>
      </main>
    </div>
  )
}
