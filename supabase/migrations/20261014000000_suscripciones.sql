-- Suscripcion mensual de cada cliente: cobro por mes desde la fecha de entrega, con corte automatico del servicio si no paga.
-- * fecha_entrega: dia en que se entrega el producto y se hace el primer pago (de ahi sale el dia de cobro de cada mes).
-- * vencimiento: hasta que dia (inclusive) esta pagado. Al dia siguiente el servicio se corta solo (salvo cortesia).
-- * servicio: 'auto' (corta solo al vencer), 'activo' (cortesia: siempre activo) o 'suspendido' (cortado a mano).
-- * slug: identificador con el que la app del cliente pregunta su estado (funcion estado_servicio).

alter table clientes_agencia
  add column slug text unique,
  add column fecha_entrega date,
  add column vencimiento date,
  add column dias_gracia int not null default 0 check (dias_gracia >= 0 and dias_gracia <= 30),
  add column servicio text not null default 'auto' check (servicio in ('auto','activo','suspendido'));

create table pagos_suscripcion (
  id bigint generated always as identity primary key,
  cliente_id bigint not null references clientes_agencia(id) on delete cascade,
  monto numeric not null check (monto >= 0),
  fecha_pago date not null default ((now() at time zone 'America/Caracas')::date),
  periodo_desde date,
  periodo_hasta date,
  nota text,
  created_at timestamptz not null default now()
);
alter table pagos_suscripcion enable row level security;
create policy "acceso anon (protegido por PIN en la app)" on pagos_suscripcion for all using (true) with check (true);

-- Lo que consulta la app del cliente (desde SU servidor): ¿tiene el servicio activo hoy? Solo devuelve eso, nada mas.
create or replace function estado_servicio(p_slug text) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((
    select jsonb_build_object('activo',
      case c.servicio
        when 'activo' then true
        when 'suspendido' then false
        else c.vencimiento is null or (now() at time zone 'America/Caracas')::date <= c.vencimiento + c.dias_gracia
      end)
    from clientes_agencia c where c.slug = lower(trim(p_slug))
  ), jsonb_build_object('activo', true))   -- un negocio desconocido no se bloquea
$$;
grant execute on function estado_servicio(text) to anon, authenticated;
