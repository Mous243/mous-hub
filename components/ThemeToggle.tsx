'use client'
import { useEffect, useState } from 'react'
import Icono from '@/components/Iconos'

const KEY = 'crm_maestro_tema'

export default function ThemeToggle({ etiqueta = false }: { etiqueta?: boolean }) {
  const [oscuro, setOscuro] = useState(true)

  useEffect(() => {
    setOscuro(document.documentElement.classList.contains('dark'))
  }, [])

  const alternar = () => {
    const nuevo = !oscuro
    setOscuro(nuevo)
    document.documentElement.classList.toggle('dark', nuevo)
    try { localStorage.setItem(KEY, nuevo ? 'oscuro' : 'claro') } catch {}
  }

  return (
    <button onClick={alternar} aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} title={oscuro ? 'Modo claro' : 'Modo oscuro'}
      className="btn btn-ghost btn-sm !px-2.5">
      <Icono n={oscuro ? 'sun' : 'moon'} className="size-4" />
      {etiqueta && <span>{oscuro ? 'Modo claro' : 'Modo oscuro'}</span>}
    </button>
  )
}
