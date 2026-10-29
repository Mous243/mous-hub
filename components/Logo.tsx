/* eslint-disable @next/next/no-img-element */
// Logo de Mous (dorado). `marca` = tamaño del isotipo en píxeles.
export function Isotipo({ alto = 28, className = '' }: { alto?: number; className?: string }) {
  return <img src="/mous-logo-dorado.png" alt="Mous" height={alto} style={{ height: alto, width: 'auto' }} className={className} />
}

// Isotipo grande y muy tenue para fondos de portada y estados vacíos.
export function MarcaDeAgua({ className = '' }: { className?: string }) {
  return <img src="/mous-logo-dorado.png" alt="" aria-hidden className={`pointer-events-none select-none ${className}`} />
}

// Logo + nombre del producto.
export function Wordmark({ compacto = false }: { compacto?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-xl border border-gold/30 bg-gold-tint">
        <Isotipo alto={compacto ? 16 : 18} />
      </span>
      <div className="leading-none">
        <p className="text-[17px] font-bold tracking-tight text-ink">Mous Hub</p>
        {!compacto && <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-gold">Centro de control</p>}
      </div>
    </div>
  )
}

// Sello de autoría discreto.
export function Sello({ className = '' }: { className?: string }) {
  return (
    <p className={`flex items-center gap-1.5 text-[11px] tracking-wide text-mute/80 ${className}`}>
      <Isotipo alto={10} className="opacity-70" /> Creado por Mous
    </p>
  )
}
