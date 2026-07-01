create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(12,2) not null,
  description text,
  size text not null,
  image_url text,
  stock integer not null default 0,
  category text not null,
  status text not null default 'tersedia',
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "Allow public read access" on public.products
for select using (true);

create policy "Allow authenticated write access" on public.products
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
