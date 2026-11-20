-- =============================================================================
-- VidraPro · Multi-tenant schema (PostgreSQL 15+ / Supabase)
-- -----------------------------------------------------------------------------
-- Isolation strategy (defense in depth):
--   1. Every business row carries tenant_id (NOT NULL, FK → tenants).
--   2. Row Level Security is ENABLED + FORCED on every tenant table.
--   3. current_tenant_id() resolves the tenant from either:
--        a) `app.tenant_id` GUC set by the Express API per transaction
--           (SELECT set_config('app.tenant_id', $1, true)), or
--        b) the Supabase JWT (auth.uid() → users.auth_user_id) when the
--           frontend talks to Supabase directly (PostgREST / realtime).
--   4. The API connects as role `app_api` (no BYPASSRLS). Only migrations and
--      the billing webhook worker use the service role.
-- =============================================================================

create extension if not exists "pgcrypto";

-- Plain-Postgres compatibility: Supabase already provides auth.uid().
create schema if not exists auth;
do $$
begin
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'auth' and p.proname = 'uid') then
    execute $f$create function auth.uid() returns uuid language sql stable as
      $b$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $b$ $f$;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type subscription_status as enum ('trial', 'active', 'past_due', 'canceled');
create type user_role           as enum ('owner', 'admin', 'seller', 'workshop');
create type material_category   as enum ('aluminum', 'glass', 'accessory');
create type quote_status        as enum ('rascunho', 'enviado', 'aprovado', 'em_producao', 'concluido', 'perdido');
create type line_family         as enum ('ESQUADRIA', 'FACHADA', 'GUARDA_CORPO');
-- Typology, line, finish and glass codes are TEXT validated by the engine
-- (lines are tenant-extensible, models grow without migrations).

-- -----------------------------------------------------------------------------
-- Tenants (one row per vidraçaria / serralheria)
-- -----------------------------------------------------------------------------
create table tenants (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null check (length(name) between 2 and 120),
  slug                  text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  document              text,                                   -- CNPJ/CPF
  logo_url              text,                                   -- Supabase Storage public URL
  whatsapp              text check (whatsapp ~ '^[0-9]{10,13}$'), -- E.164 digits only, e.g. 5511999998888
  email                 text,
  address               text,
  default_margin_pct    numeric(6,2) not null default 60  check (default_margin_pct between 0 and 500),
  aluminum_loss_pct     numeric(5,2) not null default 8   check (aluminum_loss_pct between 0 and 50),
  glass_round_mm        int          not null default 50  check (glass_round_mm in (1, 10, 50, 100)),
  glass_min_area_m2     numeric(5,3) not null default 0.25,
  labor_pct             numeric(5,2) not null default 0,
  installation_per_item numeric(10,2) not null default 0,
  quote_validity_days   int not null default 10,
  quote_footer_notes    text default 'Prazo de entrega: 15 dias úteis após aprovação. Pagamento: 50% na aprovação + 50% na instalação.',
  -- Billing (webhook-driven; never trust the client for these fields)
  subscription_status   subscription_status not null default 'trial',
  trial_ends_at         timestamptz not null default (now() + interval '14 days'),
  current_period_end    timestamptz,
  billing_provider      text,                                   -- 'stripe' | 'asaas' | 'pagarme'
  billing_customer_id   text unique,
  billing_subscription_id text unique,
  quote_seq             int not null default 0,                 -- per-tenant quote numbering
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Users (app profile; credentials live in Supabase Auth or password_hash)
-- -----------------------------------------------------------------------------
create table users (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  auth_user_id   uuid unique,                -- Supabase auth.users.id (when using Supabase Auth)
  email          text not null,
  password_hash  text,                       -- scrypt hash (when using the built-in JWT auth)
  name           text not null,
  role           user_role not null default 'seller',
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  unique (tenant_id, email)
);
create unique index users_email_global_uidx on users (lower(email));
create index users_tenant_idx on users (tenant_id);

-- -----------------------------------------------------------------------------
-- Tenant resolution used by every RLS policy
-- -----------------------------------------------------------------------------
create or replace function current_tenant_id() returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce(
    nullif(current_setting('app.tenant_id', true), '')::uuid,
    (select u.tenant_id from users u where u.auth_user_id = auth.uid() and u.active limit 1)
  )
$$;
revoke all on function current_tenant_id() from public;

-- -----------------------------------------------------------------------------
-- Material prices (one row per priced item, per tenant)
--   aluminum : key = finish        (BRANCO…)            unit = 'kg'
--   glass    : key = glass code    (TEMPERADO_INCOLOR_8) unit = 'm2'
--   accessory: key = kit code      (KIT_BOX_2F)          unit = 'un'
-- -----------------------------------------------------------------------------
create table material_prices (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  category    material_category not null,
  key         text not null,
  label       text not null,
  unit        text not null check (unit in ('kg', 'm2', 'un', 'm')),
  price       numeric(12,2) not null check (price >= 0),
  active      boolean not null default true,
  updated_at  timestamptz not null default now(),
  unique (tenant_id, category, key),
  check ( (category = 'aluminum'  and unit = 'kg')
       or (category = 'glass'     and unit = 'm2')
       or (category = 'accessory' and unit in ('un', 'm')) )   -- acessórios por unidade ou por metro
);
create index material_prices_tenant_idx on material_prices (tenant_id, category);

-- -----------------------------------------------------------------------------
-- Custom aluminium lines (tenant copies a built-in line and edits codes,
-- kg/m and deductions). Built-in lines live in the engine, not here.
-- -----------------------------------------------------------------------------
create table product_lines (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  key         text not null check (key ~ '^[A-Z0-9_]{2,40}$'),
  name        text not null check (length(name) between 2 and 80),
  family      line_family not null,
  definition  jsonb not null,                -- { profiles: {role: {code,name,kgPerM}}, params: {group: {key: mm}} }
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (tenant_id, key)
);
create index product_lines_tenant_idx on product_lines (tenant_id);

-- -----------------------------------------------------------------------------
-- Customers (light CRM; quotes may also hold an inline customer snapshot)
-- -----------------------------------------------------------------------------
create table customers (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  phone       text,
  email       text,
  address     text,
  created_at  timestamptz not null default now()
);
create index customers_tenant_idx on customers (tenant_id, name);

-- -----------------------------------------------------------------------------
-- Quotes
-- -----------------------------------------------------------------------------
create table quotes (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  number           int,                                         -- filled by trigger (per tenant)
  customer_id      uuid references customers(id) on delete set null,
  customer_name    text not null,
  customer_phone   text,
  customer_address text,
  status           quote_status not null default 'rascunho',
  kanban_position  double precision not null default 0,         -- ordering inside a column
  margin_pct       numeric(6,2) not null,                       -- snapshot at creation
  discount_pct     numeric(5,2) not null default 0 check (discount_pct between 0 and 100),
  subtotal         numeric(12,2) not null default 0,
  discount_value   numeric(12,2) not null default 0,
  total            numeric(12,2) not null default 0,
  total_cost       numeric(12,2) not null default 0,            -- internal only, never exposed publicly
  notes            text,
  valid_until      date,
  public_token     text not null unique default translate(encode(gen_random_bytes(18), 'base64'), '+/', '-_'),
  sent_at          timestamptz,
  approved_at      timestamptz,
  created_by       uuid references users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (tenant_id, number)
);
create index quotes_tenant_status_idx on quotes (tenant_id, status, kanban_position);
create index quotes_tenant_created_idx on quotes (tenant_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Quote items (engine output is snapshotted so old quotes never change
-- when prices or formulas are updated)
-- -----------------------------------------------------------------------------
create table quote_items (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  quote_id         uuid not null references quotes(id) on delete cascade,
  position         int not null default 0,
  typology         text not null,                           -- engine TypologyId
  line             text not null,                           -- built-in or product_lines.key
  location_label   text,                                    -- "Quarto casal", "Banheiro social"
  width_mm         int not null check (width_mm between 100 and 30000),
  height_mm        int not null check (height_mm between 100 and 30000),
  depth_mm         int check (depth_mm between 100 and 5000),  -- box de canto
  finish           text not null,
  glass_code       text not null,
  quantity         int not null check (quantity between 1 and 500),
  unit_cost        numeric(12,2) not null,
  unit_price       numeric(12,2) not null,
  total_price      numeric(12,2) not null,
  description      text not null,                           -- customer-facing line
  price_breakdown  jsonb not null,                          -- internal cost composition
  cutting_list     jsonb not null,                          -- workshop list (profiles, glass, kits, bars)
  engine_version   text not null,
  created_at       timestamptz not null default now()
);
create index quote_items_quote_idx on quote_items (quote_id, position);
create index quote_items_tenant_idx on quote_items (tenant_id);

-- Guarantee item.tenant_id = quote.tenant_id (blocks cross-tenant item injection)
create or replace function enforce_item_tenant() returns trigger language plpgsql as $$
begin
  if new.tenant_id <> (select tenant_id from quotes where id = new.quote_id) then
    raise exception 'quote_items.tenant_id mismatch';
  end if;
  return new;
end $$;
create trigger quote_items_tenant_guard before insert or update on quote_items
  for each row execute function enforce_item_tenant();

-- -----------------------------------------------------------------------------
-- Status history (kanban audit trail)
-- -----------------------------------------------------------------------------
create table quote_status_history (
  id          bigserial primary key,
  tenant_id   uuid not null references tenants(id) on delete cascade,
  quote_id    uuid not null references quotes(id) on delete cascade,
  from_status quote_status,
  to_status   quote_status not null,
  changed_by  uuid references users(id) on delete set null,
  changed_at  timestamptz not null default now()
);
create index quote_status_history_quote_idx on quote_status_history (quote_id, changed_at);

-- -----------------------------------------------------------------------------
-- Billing webhook log (idempotency; not tenant-scoped by RLS, service role only)
-- -----------------------------------------------------------------------------
create table billing_events (
  id            text primary key,          -- provider event id → idempotency key
  provider      text not null,
  type          text not null,
  tenant_id     uuid references tenants(id) on delete set null,
  payload       jsonb not null,
  processed_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Triggers: per-tenant quote number, updated_at, status history
-- -----------------------------------------------------------------------------
create or replace function assign_quote_number() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update tenants set quote_seq = quote_seq + 1
   where id = new.tenant_id
  returning quote_seq into new.number;   -- row lock serializes concurrent inserts per tenant
  return new;
end $$;
create trigger quotes_number before insert on quotes
  for each row when (new.number is null) execute function assign_quote_number();

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger tenants_touch before update on tenants for each row execute function touch_updated_at();
create trigger quotes_touch  before update on quotes  for each row execute function touch_updated_at();
create trigger prices_touch  before update on material_prices for each row execute function touch_updated_at();
create trigger lines_touch   before update on product_lines   for each row execute function touch_updated_at();

-- BEFORE: stamp milestone timestamps on NEW
create or replace function stamp_quote_status() returns trigger language plpgsql as $$
begin
  if new.status = 'enviado'  and new.sent_at is null     then new.sent_at := now();     end if;
  if new.status = 'aprovado' and new.approved_at is null then new.approved_at := now(); end if;
  return new;
end $$;
create trigger quotes_status_stamp before insert or update of status on quotes
  for each row execute function stamp_quote_status();

-- AFTER: write the audit trail (row exists now, so the FK is satisfied)
create or replace function log_quote_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into quote_status_history (tenant_id, quote_id, from_status, to_status, changed_by)
    values (new.tenant_id, new.id, case when tg_op = 'UPDATE' then old.status end, new.status,
            nullif(current_setting('app.user_id', true), '')::uuid);
  end if;
  return new;
end $$;
create trigger quotes_status_log after insert or update of status on quotes
  for each row execute function log_quote_status();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table tenants              enable row level security;
alter table users                enable row level security;
alter table material_prices      enable row level security;
alter table product_lines        enable row level security;
alter table customers            enable row level security;
alter table quotes               enable row level security;
alter table quote_items          enable row level security;
alter table quote_status_history enable row level security;
alter table billing_events       enable row level security;

alter table tenants              force row level security;
alter table users                force row level security;
alter table material_prices      force row level security;
alter table product_lines        force row level security;
alter table customers            force row level security;
alter table quotes               force row level security;
alter table quote_items          force row level security;
alter table quote_status_history force row level security;

-- Tenant can read itself; billing columns are protected by the column grants below.
create policy tenant_self_select on tenants for select using (id = current_tenant_id());
create policy tenant_self_update on tenants for update using (id = current_tenant_id())
  with check (id = current_tenant_id());

-- Generic tenant isolation for every child table
do $$
declare t text;
begin
  foreach t in array array['users','material_prices','product_lines','customers','quotes','quote_items','quote_status_history']
  loop
    execute format(
      'create policy %I_tenant_isolation on %I for all
         using (tenant_id = current_tenant_id())
         with check (tenant_id = current_tenant_id())', t, t);
  end loop;
end $$;
-- billing_events: no policies → invisible to everyone except BYPASSRLS/service role.

-- -----------------------------------------------------------------------------
-- Roles & grants
-- -----------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'app_api') then
    create role app_api login password 'change-me' nobypassrls;
  end if;
end $$;

grant usage on schema public, auth to app_api;
grant select, insert, update, delete on users, material_prices, product_lines, customers, quotes,
      quote_items, quote_status_history to app_api;
grant usage on all sequences in schema public to app_api;
grant select on tenants to app_api;
-- Tenants can edit their profile but NEVER their subscription columns
grant update (name, document, logo_url, whatsapp, email, address, default_margin_pct,
              aluminum_loss_pct, glass_round_mm, glass_min_area_m2, labor_pct,
              installation_per_item, quote_validity_days, quote_footer_notes)
  on tenants to app_api;
grant execute on function current_tenant_id() to app_api;

-- Supabase: same restrictions for the `authenticated` role (direct client access)
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select on tenants, users, material_prices, product_lines, customers, quotes, quote_items,
          quote_status_history to authenticated;
    grant insert, update, delete on customers, quotes, quote_items, material_prices, product_lines to authenticated;
    grant update (name, document, logo_url, whatsapp, email, address, default_margin_pct,
                  aluminum_loss_pct, glass_round_mm, glass_min_area_m2, labor_pct,
                  installation_per_item, quote_validity_days, quote_footer_notes)
      on tenants to authenticated;
    -- NOTE: column-level REVOKE does not override a table-level GRANT in Postgres.
    -- For direct Supabase clients, expose quotes through a view without total_cost if needed.
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Public, token-based quote view (no login). SECURITY DEFINER, returns only
-- customer-safe columns — never costs, margins, cutting lists or the internal
-- quote NUMBER (the number is for the company panel only).
-- -----------------------------------------------------------------------------
create or replace function public_quote(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'quote', jsonb_build_object(
      'customer_name', q.customer_name, 'status', q.status,
      'subtotal', q.subtotal, 'discount_pct', q.discount_pct, 'discount_value', q.discount_value,
      'total', q.total, 'notes', q.notes, 'valid_until', q.valid_until, 'created_at', q.created_at),
    'tenant', jsonb_build_object(
      'name', t.name, 'logo_url', t.logo_url, 'whatsapp', t.whatsapp, 'email', t.email,
      'address', t.address, 'document', t.document, 'footer', t.quote_footer_notes),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'description', i.description, 'location_label', i.location_label,
               'typology', i.typology, 'width_mm', i.width_mm, 'height_mm', i.height_mm, 'depth_mm', i.depth_mm,
               'quantity', i.quantity, 'unit_price', i.unit_price, 'total_price', i.total_price,
               'finish', i.finish, 'glass_code', i.glass_code, 'line', i.line)
             order by i.position)
        from quote_items i where i.quote_id = q.id), '[]'::jsonb))
  from quotes q join tenants t on t.id = q.tenant_id
  where q.public_token = p_token and q.status <> 'rascunho'
$$;
grant execute on function public_quote(text) to app_api;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant execute on function public_quote(text) to anon;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Default prices are seeded by the API on signup from the engine's
-- DEFAULT_PRICE_LIST (aluminium per finish, glass, ~45 itemised accessories),
-- so the catalogue has a single source of truth.
-- -----------------------------------------------------------------------------
