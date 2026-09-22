-- Row Level Security policies for Supabase-hosted deployments.
-- The API uses the service role (bypasses RLS); these policies protect
-- direct anon/authenticated access via PostgREST as a second layer.

alter table users enable row level security;
alter table scores enable row level security;
alter table subscriptions enable row level security;
alter table charity_selections enable row level security;
alter table draw_entries enable row level security;
alter table winners enable row level security;
alter table winner_proofs enable row level security;

-- Users can read/update only their own profile
create policy "users_self_read" on users
  for select using (auth.uid()::text = id);
create policy "users_self_update" on users
  for update using (auth.uid()::text = id)
  with check (auth.uid()::text = id and role = 'USER');

-- Scores: owner-only CRUD
create policy "scores_owner_all" on scores
  for all using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- Subscriptions: owner read-only
create policy "subs_owner_read" on subscriptions
  for select using (auth.uid()::text = user_id);

-- Charity selection: owner read/write, percentage >= 10 enforced by API + check
create policy "charity_sel_owner" on charity_selections
  for all using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id and percentage >= 10);

alter table charity_selections add constraint charity_pct_min check (percentage >= 10);

-- Draw entries & winners: owner read
create policy "entries_owner_read" on draw_entries
  for select using (auth.uid()::text = user_id);
create policy "winners_owner_read" on winners
  for select using (auth.uid()::text = user_id);
create policy "proofs_owner_read" on winner_proofs
  for select using (
    exists (select 1 from winners w where w.id = winner_id and w.user_id = auth.uid()::text)
  );

-- Charities + draws are public read
alter table charities enable row level security;
alter table draws enable row level security;
alter table prize_pools enable row level security;
create policy "charities_public_read" on charities for select using (is_active = true);
create policy "draws_public_read" on draws for select using (status in ('PUBLISHED','SETTLED'));
create policy "pools_public_read" on prize_pools for select using (true);

-- Storage: winner-proofs bucket — owner write, admin read (handled via API with service key)
insert into storage.buckets (id, name, public) values ('winner-proofs', 'winner-proofs', false)
on conflict (id) do nothing;
