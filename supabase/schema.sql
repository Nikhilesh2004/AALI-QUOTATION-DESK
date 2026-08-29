-- ============================================================================
-- AALI QUOTATION DESK -- schema
-- ----------------------------------------------------------------------------
-- Run once in the Supabase project's SQL Editor (as `postgres`), then run
-- `npm run create-users` to create the logins.
--
-- Design choices, and why:
--   - Quotation numbers are issued by ONE server-side function, never by the
--     browser. Two people hitting Save at the same moment cannot be handed the
--     same number, and a number is never reused after a delete.
--   - The next number is derived from the highest number already stored for
--     that financial year, not from a counter the app keeps in sync by hand.
--     Backfill an old quotation with seq 42 and the next one issued is 43 --
--     no reset, no manual bookkeeping.
--   - Line items live in a jsonb column rather than a child table. A quotation
--     is printed as a frozen document; its lines are never queried across
--     quotations, so a child table would buy joins we would never use.
--   - Business identity (name, GSTIN, the Aali Group subsidiary line) is ONE
--     shared row, not a per-user copy. Every quotation the company issues must
--     carry identical letterhead, whoever typed it.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Profiles / roles
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null check (role in ('staff', 'super_admin')),
  created_at timestamptz default now()
);

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    -- Always 'staff', never a role read out of the new user's own metadata:
    -- that field is supplied by whoever creates the account, so honouring it
    -- would let anyone self-register as super_admin if signups were ever
    -- enabled. Elevating someone is a deliberate act done with the service
    -- key (scripts/create-users.mjs) or by an existing super admin.
    'staff'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create or replace function is_super_admin()
returns boolean language sql security definer stable
set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'super_admin');
$$;

-- ---------------------------------------------------------------------------
-- 2. Business identity (one shared row -- the letterhead)
-- ---------------------------------------------------------------------------
create table if not exists business_settings (
  id smallint primary key default 1 check (id = 1),
  name text not null default 'AALI CONSSULTANCY',
  tagline text not null default 'Technology & Software Consulting',
  parent_line text not null default 'A subsidiary of Aali Group',
  address text default '',
  gstin text default '',
  pan text default '',
  phone text default '',
  email text default '',
  website text default '',
  logo_url text default '',
  quote_prefix text not null default 'AC',
  default_terms text not null default '',
  default_bank text not null default '',
  sign_name text default '',
  sign_role text default '',
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id)
);

insert into business_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Quotations
-- ---------------------------------------------------------------------------
create table if not exists quotations (
  id uuid primary key default gen_random_uuid(),

  -- Issued number. Immutable once assigned; the unique index is what actually
  -- guarantees no duplicates survive a race the function somehow lost.
  quote_no text not null unique,
  fy text not null,                      -- '2026-27'
  seq integer not null,                  -- 7  -> AC/2026-27/007

  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'declined', 'expired')),

  quote_date date not null default current_date,
  valid_until date,
  subject text default '',
  prepared_by text default '',
  currency text not null default 'INR' check (currency in ('INR', 'USD')),

  client_name text not null default '',
  client_contact text default '',
  client_address text default '',
  client_gstin text default '',
  client_email text default '',
  client_phone text default '',

  items jsonb not null default '[]'::jsonb,

  discount_type text not null default 'none' check (discount_type in ('none', 'percent', 'flat')),
  discount_value numeric(14,2) not null default 0,
  tax_mode text not null default 'intra' check (tax_mode in ('intra', 'inter', 'export', 'none')),
  tax_rate numeric(5,2) not null default 18,
  round_off boolean not null default true,
  show_tds boolean not null default false,

  -- Stored, not recomputed on read: the register must show the figure that was
  -- actually printed, even if tax rules change later.
  subtotal numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  taxable numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,

  terms text default '',
  bank text default '',
  sign_name text default '',
  sign_role text default '',
  notes text default '',

  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists quotations_fy_seq_idx on quotations (fy, seq);
create index if not exists quotations_created_by_idx on quotations (created_by);
create index if not exists quotations_date_idx on quotations (quote_date desc);
create index if not exists quotations_client_idx on quotations (client_name);

create or replace function touch_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists quotations_touch on quotations;
create trigger quotations_touch before update on quotations
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Number issuing
-- ---------------------------------------------------------------------------
-- Indian financial year label for a date: 15 Aug 2026 -> '2026-27'.
create or replace function fy_label(d date)
returns text language sql immutable
set search_path = ''
as $$
  select case
    when extract(month from d) >= 4
      then extract(year from d)::int || '-' || right((extract(year from d)::int + 1)::text, 2)
    else (extract(year from d)::int - 1) || '-' || right(extract(year from d)::text, 2)
  end;
$$;

-- Peek at what the next number would be, without consuming it. Used to show
-- "Next: AC/2026-27/008" in the UI before anything is saved.
create or replace function peek_quotation_number(d date default current_date)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select quote_prefix from business_settings where id = 1), 'AC')
      || '/' || fy_label(d) || '/'
      || lpad((coalesce((select max(seq) from quotations where fy = fy_label(d)), 0) + 1)::text, 3, '0');
$$;

-- Issue the next number for real. Serialised: concurrent callers queue on the
-- advisory lock, so two saves in the same instant get 008 and 009, never 008
-- twice. Derived from max(seq), so a backfilled historical row shifts the
-- sequence forward automatically.
create or replace function next_quotation_number(d date default current_date)
returns table (quote_no text, fy text, seq integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fy text := fy_label(d);
  v_seq integer;
  v_prefix text;
begin
  perform pg_advisory_xact_lock(hashtext('aali_quotation_seq_' || v_fy));

  select coalesce(max(q.seq), 0) + 1 into v_seq from quotations q where q.fy = v_fy;
  select coalesce(b.quote_prefix, 'AC') into v_prefix from business_settings b where b.id = 1;

  return query select v_prefix || '/' || v_fy || '/' || lpad(v_seq::text, 3, '0'), v_fy, v_seq;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Row level security
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table business_settings enable row level security;
alter table quotations enable row level security;

drop policy if exists profiles_self_read on profiles;
create policy profiles_self_read on profiles
  for select using (id = auth.uid() or is_super_admin());

drop policy if exists profiles_admin_write on profiles;
create policy profiles_admin_write on profiles
  for update using (is_super_admin()) with check (is_super_admin());

-- Letterhead: everyone signed in reads it (every quotation renders it),
-- only a super admin may change the company's identity.
drop policy if exists business_read on business_settings;
create policy business_read on business_settings
  for select using (auth.uid() is not null);

drop policy if exists business_admin_write on business_settings;
create policy business_admin_write on business_settings
  for update using (is_super_admin()) with check (is_super_admin());

-- Staff see and manage their own quotations; a super admin sees the whole
-- register -- which is the point of the role.
drop policy if exists quotations_read on quotations;
create policy quotations_read on quotations
  for select using (created_by = auth.uid() or is_super_admin());

drop policy if exists quotations_insert on quotations;
create policy quotations_insert on quotations
  for insert with check (created_by = auth.uid());

drop policy if exists quotations_update on quotations;
create policy quotations_update on quotations
  for update using (created_by = auth.uid() or is_super_admin())
  with check (created_by = auth.uid() or is_super_admin());

drop policy if exists quotations_delete on quotations;
create policy quotations_delete on quotations
  for delete using (created_by = auth.uid() or is_super_admin());

-- Function grants. Postgres grants EXECUTE to PUBLIC by default, which puts
-- every one of these on the REST surface as /rest/v1/rpc/<name>. Revoke first,
-- then hand back only what a signed-in colleague genuinely needs.

-- Trigger-only: it runs as the definer from the trigger, so no client role
-- needs EXECUTE on it at all.
revoke execute on function handle_new_user() from public, anon, authenticated;

-- These reveal how many quotations the company has issued -- fine for a
-- signed-in colleague, nobody else's business.
revoke execute on function peek_quotation_number(date) from public, anon;
revoke execute on function next_quotation_number(date) from public, anon;
grant execute on function peek_quotation_number(date) to authenticated;
grant execute on function next_quotation_number(date) to authenticated;

-- Answers only "is the caller an admin". The RLS policies call it, so
-- authenticated must keep EXECUTE; anonymous callers have no rows anyway.
revoke execute on function is_super_admin() from public, anon;
grant execute on function is_super_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Register view -- the "who issued what" list a super admin reads
-- ---------------------------------------------------------------------------
create or replace view quotation_register
with (security_invoker = true) as
  select q.id, q.quote_no, q.fy, q.seq, q.status, q.quote_date, q.valid_until,
         q.client_name, q.subject, q.currency, q.total, q.created_at, q.updated_at,
         q.created_by, p.full_name as created_by_name, p.email as created_by_email
  from quotations q
  left join profiles p on p.id = q.created_by;
