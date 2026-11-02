-- Donations table for tracking voluntary student contributions to Printify.
-- Used by the leaderboard (Highest Donations category).
create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid references auth.users(id) on delete set null,
  amount_paise integer not null check (amount_paise > 0),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed')),
  gateway text,
  gateway_payment_id text,
  created_at timestamptz not null default now()
);

create index if not exists donations_student_user_idx
  on public.donations(student_user_id, created_at desc)
  where student_user_id is not null;

alter table public.donations enable row level security;

-- Students can read their own donations; no direct insert from client.
create policy "Students can view their own donations"
  on public.donations for select to authenticated
  using (student_user_id = (select auth.uid()));

-- Allow authenticated students to read all donations for leaderboard rankings.
create policy "Anyone authenticated can read paid donations for leaderboard"
  on public.donations for select to authenticated
  using (payment_status = 'paid');

grant select on public.donations to authenticated;
grant all on public.donations to service_role;

comment on table public.donations is
  'Voluntary student donations to support Printify development.';
