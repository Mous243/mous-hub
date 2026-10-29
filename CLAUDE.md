# Mous Hub — instrucciones para Claude Code (instalación desde cero)

Este repositorio es un centro de control de proyectos y clientes (Next.js 16 + Supabase + Vercel). Quien te abrió quiere **instalarlo en sus propias cuentas** de Supabase y Vercel y llevar el control de SUS proyectos. Responde siempre en español, sin adornos, y avanza tú todo lo posible: pídele a la persona solo lo que solo ella puede hacer (crear cuentas, iniciar sesión, elegir clave).

## Reglas
- Nada de este repositorio contiene secretos. Nunca subas `.env.local`, claves ni `supabase/instalar.generado.sql` a git.
- No gastes nada ni borres nada sin preguntar. Crear un proyecto de Supabase puede tener costo según su plan: avísale y confirma antes.
- Valida cada paso (comando o curl que lo demuestre) antes de decir que está listo.

## Paso 0 · Requisitos (comprueba y, si falta algo, guía)
- Node 20+ (`node -v`), git.
- Cuenta de Supabase y de Vercel (gratis). Pídele que las cree si no las tiene.
- CLI de Vercel: `npm i -g vercel` y `vercel login`. CLI de Supabase (opcional, solo si no tienes el MCP de Supabase): `npx supabase login`.

## Paso 1 · Datos que debes pedirle (una sola vez, agrupa las preguntas)
1. Correo del dueño (será el único con acceso) y la contraseña que quiere usar (mín. 8 caracteres).
2. Su nombre (sale en recibos y presentaciones) y, opcional, web e Instagram de contacto.
3. ¿Quiere avisos por Telegram? (opcional: token de @BotFather y su chat id).

## Paso 2 · Supabase
1. Crea un proyecto nuevo (MCP de Supabase `create_project`, o que lo cree en supabase.com/dashboard) y anota la URL y la clave `anon` (Project Settings → API).
2. Genera el SQL: `node scripts/generar-sql.mjs correo@del.dueño` → crea `supabase/instalar.generado.sql` e imprime `CRON_SECRET=...` (guárdalo para el paso 4).
3. Aplica ese SQL completo al proyecto (MCP `apply_migration`/`execute_sql`, o `supabase db query`, o que lo pegue en el SQL Editor). Es idempotente.
4. Crea el usuario: Authentication → Users → Add user con el correo y la contraseña, marcando «Auto confirm user» (o por MCP/API de admin). **No** habilites el registro público: Authentication → Providers → Email → desactiva «Allow new users to sign up».
5. Comprueba: con ese usuario inicia sesión por REST (`/auth/v1/token?grant_type=password`) y haz `GET /rest/v1/proyectos?select=id` con su token → `200 []`. Con solo la clave anon debe dar `[]` o 401 (nunca datos).

## Paso 3 · Probar en local
`npm install`, copia `.env.example` a `.env.local` y complétalo (URL, anon key, `NEXT_PUBLIC_OWNER_EMAIL`, nombre, contacto, `CRON_SECRET`). `npm run build` debe terminar sin errores; `npm run dev` y entra con el correo y la contraseña.

## Paso 4 · Vercel
1. `vercel link` (proyecto nuevo, nombre sugerido `mous-hub`) en esta carpeta.
2. Variables en Production (`vercel env add NOMBRE production`, valor por stdin): todas las de `.env.example` que tengan valor — en especial `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_OWNER_EMAIL`, `CRON_SECRET`. Usa `printf` sin salto de línea al enviar valores.
3. `vercel --prod`. Comprueba que la URL responde 200 y que `/api/cron/diario` sin clave responde 401.
4. El cron diario ya está en `vercel.json` (12:00 UTC). Nota: en el plan gratis de Vercel (Hobby) los crons corren una vez al día como máximo.

## Paso 5 · Primer uso
- Entrar al Hub, «+ Nuevo proyecto» para registrar el primero. El estado en vivo se revisa con «Revisar ahora» o con el cron diario.
- Para publicar la página de estado de un cliente: ficha del proyecto → interruptor «estado público» → `/estado/<slug>`.
- Opcional (solo Windows): botón «Abrir carpeta». Ejecuta `powershell -File tools/abrir-carpeta/instalar.ps1` y pon `NEXT_PUBLIC_ABRIR_CARPETA=1` (las rutas son relativas al Escritorio).
- Opcional: capturas de pantalla para las presentaciones: archivos `public/capturas/<slug>.png`.

## Personalizar
- Datos del dueño y contacto: `lib/config.ts` (variables de entorno).
- Marca: logos en `public/mous-logo-*.png` y `components/Logo.tsx`; colores en `app/globals.css`. El sello «Creado por Mous» es parte de la plantilla: se puede dejar discreto o cambiarlo en `components/Logo.tsx`, `lib/recibo.ts`, `lib/presentacion.ts` y `app/estado/[slug]/page.tsx`.

## Mantenimiento
- Cambios al esquema: nuevo archivo en `supabase/migrations/` (con `__EMAIL__` donde vaya el correo del dueño) y vuelve a generar/aplicar.
- Respaldo: Supabase → Database → Backups, o `pg_dump`. Los datos viven en SU Supabase; nadie más los ve.
