-- SupplyChain Sentinel — schema
-- Run this in the Supabase SQL editor (or `psql`) before seeding.

-- ---------------------------------------------------------------- catalog

create table if not exists parts (
  id                text primary key,
  name              text not null,
  category          text not null,
  current_stock     integer not null check (current_stock >= 0),
  reorder_threshold integer not null check (reorder_threshold >= 0),
  unit_cost         numeric(10, 2) not null check (unit_cost > 0),
  criticality       text not null default 'standard'
                      check (criticality in ('standard', 'high', 'critical')),
  created_at        timestamptz not null default now()
);

create table if not exists suppliers (
  id                text primary key,
  name              text not null,
  region            text,
  reliability_score integer not null check (reliability_score between 0 and 100),
  defect_rate_pct   numeric(4, 2) not null check (defect_rate_pct >= 0),
  created_at        timestamptz not null default now()
);

-- Which suppliers can fulfil which part, and on what terms. A part with
-- exactly one row here is single-sourced — the risk the agent flags.
create table if not exists part_suppliers (
  part_id        text not null references parts (id) on delete cascade,
  supplier_id    text not null references suppliers (id) on delete cascade,
  price          numeric(10, 2) not null check (price > 0),
  lead_time_days integer not null check (lead_time_days > 0),
  primary key (part_id, supplier_id)
);

create table if not exists usage_history (
  part_id     text not null references parts (id) on delete cascade,
  usage_date  date not null,
  units_used  integer not null check (units_used >= 0),
  primary key (part_id, usage_date)
);

create index if not exists usage_history_part_date_idx
  on usage_history (part_id, usage_date desc);

-- ------------------------------------------------------------ audit trail

-- One row per pipeline execution. `steps` holds the full reasoning output of
-- all four agents so the dashboard can replay any past decision verbatim.
create table if not exists pipeline_runs (
  id                 uuid primary key default gen_random_uuid(),
  part_id            text not null references parts (id),
  status             text not null check (status in ('auto-approved', 'escalated')),
  predicted_quantity integer,
  order_value        numeric(12, 2),
  anomaly_detected   boolean not null default false,
  failed_guardrails  text[] not null default '{}',
  selected_supplier  text references suppliers (id),
  logistics_status   text,
  steps              jsonb not null,
  summary            jsonb not null,
  created_at         timestamptz not null default now()
);

create index if not exists pipeline_runs_created_idx
  on pipeline_runs (created_at desc);

create table if not exists purchase_orders (
  id           text primary key,
  run_id       uuid references pipeline_runs (id) on delete set null,
  part_id      text not null references parts (id),
  supplier_id  text not null references suppliers (id),
  quantity     integer not null check (quantity > 0),
  unit_price   numeric(10, 2) not null,
  total_cost   numeric(12, 2) not null,
  status       text not null default 'pending-approval'
                 check (status in ('issued', 'pending-approval', 'approved', 'rejected')),
  approved_by  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists purchase_orders_status_idx
  on purchase_orders (status, created_at desc);

-- ------------------------------------------------------------------- rls

-- The dashboard reads with the publishable key; the backend writes with the
-- secret key (which bypasses RLS entirely). So: public read, no public write.
alter table parts            enable row level security;
alter table suppliers        enable row level security;
alter table part_suppliers   enable row level security;
alter table usage_history    enable row level security;
alter table pipeline_runs    enable row level security;
alter table purchase_orders  enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'parts', 'suppliers', 'part_suppliers',
    'usage_history', 'pipeline_runs', 'purchase_orders'
  ] loop
    execute format(
      'drop policy if exists %I on %I', 'public_read_' || t, t
    );
    execute format(
      'create policy %I on %I for select using (true)', 'public_read_' || t, t
    );
  end loop;
end $$;
