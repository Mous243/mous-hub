import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import LoginGate from '@/components/LoginGate'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  title: 'Mous Hub',
  description: 'Centro de control de proyectos y clientes — Mous',
}
export const viewport: Viewport = { themeColor: '#0a0a0c' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Oscuro por defecto (es la identidad de la marca); solo pasa a claro si se eligió a mano. */}
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('crm_maestro_tema');if(t!=='claro')document.documentElement.classList.add('dark')}catch(e){document.documentElement.classList.add('dark')}" }} />
      </head>
      <body className="bg-page text-ink min-h-screen">
        <LoginGate>{children}</LoginGate>
      </body>
    </html>
  )
}
