import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sin-configurar'

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Estado = 'prospecto' | 'en_desarrollo' | 'activo' | 'pausado'

export type Enlace = { nombre: string; url: string }

export type ClienteAgencia = {
  id: number
  nombre: string
  contacto?: string
  telefono?: string
  administradora?: string
  servicios: string[]
  redes: string[]
  metodos_pago: string[]
  estado: Estado
  mensualidad?: number
  dominio?: string
  fecha_inicio?: string
  notas?: string
  enlaces?: Enlace[]
  slug?: string | null
  fecha_entrega?: string | null
  vencimiento?: string | null
  dias_gracia?: number
  servicio?: 'auto' | 'activo' | 'suspendido'
  created_at?: string
}

export type PagoSuscripcion = { id: number; cliente_id: number; monto: number; fecha_pago: string; periodo_desde: string | null; periodo_hasta: string | null; nota: string | null }

export type EstadoProyecto = 'activo' | 'desarrollo' | 'pausado' | 'archivado' | 'idea'
export type TipoProyecto = 'web' | 'app' | 'escritorio' | 'bot' | 'landing' | 'catalogo' | 'trading' | 'herramienta'

export type Proyecto = {
  id: number
  slug: string
  nombre: string
  tipo: TipoProyecto
  estado: EstadoProyecto
  origen: 'propio' | 'cliente'
  cliente?: string | null
  descripcion?: string | null
  funciones: string[]
  stack: string[]
  carpeta?: string | null
  url_vivo?: string | null
  zip?: string | null
  version?: string | null
  ultima_actividad?: string | null
  respaldo: 'git' | 'zip' | 'ambos' | 'ninguno'
  marca: 'pendiente' | 'aplicada' | 'no_aplica'
  pendientes?: string | null
  notas?: string | null
  enlaces?: Enlace[]
  en_linea?: boolean | null
  latencia_ms?: number | null
  http_estado?: number | null
  chequeado_en?: string | null
  estado_publico?: boolean
  updated_at?: string
}
