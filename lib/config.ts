// Datos del dueño de esta instalación. Se cambian aquí o con variables de entorno (Vercel / .env.local).
// NEXT_PUBLIC_OWNER_EMAIL debe ser el MISMO correo con el que se creó el usuario en Supabase y se generó el SQL.
export const OWNER_EMAIL = (process.env.NEXT_PUBLIC_OWNER_EMAIL || '').trim().toLowerCase()

// Pie de los recibos PDF y de las presentaciones.
export const CONTACTO = {
  web: process.env.NEXT_PUBLIC_CONTACT_WEB || '',
  instagram: process.env.NEXT_PUBLIC_CONTACT_INSTAGRAM || '',
  email: process.env.NEXT_PUBLIC_OWNER_EMAIL || '',
}

// El botón «Abrir carpeta» solo funciona en Windows tras ejecutar tools/abrir-carpeta/instalar.ps1.
export const ABRIR_CARPETA = process.env.NEXT_PUBLIC_ABRIR_CARPETA === '1'

// Nombre que aparece en el pie de los recibos PDF.
export const OWNER_NAME = process.env.NEXT_PUBLIC_OWNER_NAME || ''
