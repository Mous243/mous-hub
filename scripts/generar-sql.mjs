// Junta las migraciones en un solo SQL listo para pegar/aplicar, con tu correo y el secreto del cron.
// Uso: node scripts/generar-sql.mjs tu@correo.com [secreto]   → escribe supabase/instalar.generado.sql (ignorado por git)
// Si no das secreto, genera uno nuevo y lo imprime: ese valor va como CRON_SECRET en Vercel.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'

const email = (process.argv[2] || '').trim().toLowerCase()
if (!/^[^@\s']+@[^@\s']+\.[^@\s']+$/.test(email)) { console.error('Uso: node scripts/generar-sql.mjs tu@correo.com [secreto]'); process.exit(1) }
const secreto = process.argv[3] || randomBytes(24).toString('hex')
if (!/^[A-Za-z0-9_-]{16,}$/.test(secreto)) { console.error('El secreto debe tener 16+ caracteres alfanuméricos.'); process.exit(1) }

const dir = new URL('../supabase/migrations/', import.meta.url)
const sql = readdirSync(dir).filter(f => f.endsWith('.sql')).sort()
  .map(f => `-- ===== ${f} =====\n` + readFileSync(new URL(f, dir), 'utf8'))
  .join('\n\n').replaceAll('__EMAIL__', email).replaceAll('__SECRETO__', secreto)
writeFileSync(new URL('../supabase/instalar.generado.sql', import.meta.url), sql)
console.log(`SQL escrito en supabase/instalar.generado.sql (${sql.length} caracteres)\nCRON_SECRET=${secreto}`)
