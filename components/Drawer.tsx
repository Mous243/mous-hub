'use client'
import { useEffect } from 'react'
import Icono from '@/components/Iconos'
import { Isotipo } from '@/components/Logo'

// Panel lateral deslizable (en el teléfono ocupa toda la pantalla). Se cierra con Esc o tocando fuera.
export default function Drawer({ titulo, subtitulo, onClose, children, pie }: { titulo: string; subtitulo?: string; onClose: () => void; children: React.ReactNode; pie?: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <aside role="dialog" aria-label={titulo} className="anim-rise relative flex h-full w-full max-w-xl flex-col border-l border-line bg-surface shadow-2xl">
        <header className="flex items-center gap-3 border-b border-line px-6 py-4">
          <span className="flex size-9 items-center justify-center rounded-lg border border-gold/30 bg-gold-tint"><Isotipo alto={14} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-ink">{titulo}</h2>
            {subtitulo && <p className="truncate text-xs text-mute">{subtitulo}</p>}
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="btn btn-ghost btn-sm !px-2"><Icono n="x" className="size-4" /></button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">{children}</div>
        {pie && <footer className="flex items-center gap-2 border-t border-line bg-elevated/60 px-6 py-4">{pie}</footer>}
      </aside>
    </div>
  )
}
