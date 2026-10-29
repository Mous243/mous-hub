-- Enlaces del cliente (web, panel, base de datos, Vercel, redes…): [{"nombre":"Web","url":"https://..."}]
alter table clientes_agencia add column enlaces jsonb not null default '[]'::jsonb;
