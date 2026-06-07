create table if not exists public.landing_leads (
  id uuid primary key default gen_random_uuid(),
  contact_type text not null check (contact_type in ('email','whatsapp')),
  contact_value text not null,
  source text,
  created_at timestamptz not null default now()
);
grant insert on public.landing_leads to anon, authenticated;
grant all on public.landing_leads to service_role;
alter table public.landing_leads enable row level security;
create policy "Anyone can submit a lead"
on public.landing_leads for insert to anon, authenticated
with check (contact_value is not null and char_length(contact_value) between 4 and 200);