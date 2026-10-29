create table if not exists clientes_agencia (
  id bigint generated always as identity primary key,
  nombre text not null,
  contacto text,
  telefono text,
  administradora text,
  servicios text[] not null default '{}',   -- web, app, bot, delivery
  redes text[] not null default '{}',       -- instagram, meta, whatsapp
  metodos_pago text[] not null default '{}',
  estado text not null default 'prospecto'
    check (estado in ('prospecto','en_desarrollo','activo','pausado')),
  mensualidad numeric,
  dominio text,
  fecha_inicio date,
  notas text,
  created_at timestamptz not null default now()
);

alter table clientes_agencia enable row level security;
create policy "acceso anon (protegido por PIN en la app)" on clientes_agencia
  for all using (true) with check (true);
