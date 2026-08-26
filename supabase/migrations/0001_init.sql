-- ============================================================================
-- Mafia League — Phase 1 schema
-- Run this once in the Supabase SQL editor (or via `supabase db push`).
-- Designed to also cover Phase 2/3 game-engine tables so no destructive
-- migrations are needed later — only Phase 1 tables get RLS exercised by UI
-- right now, but the game tables are real, not placeholders.
--
-- Statement order matters: `language sql` functions are parsed against the
-- schema at CREATE time (unlike plpgsql, which defers checking), and RLS
-- policies are type-checked at creation too. Every table, function, and
-- policy below is ordered so anything it references already exists.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Shared helper with no table dependencies — safe to create first.
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- profiles
-- (Created before the permission-check functions below, since those
-- functions query this table and `language sql` functions are validated
-- against the schema immediately.)
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  nickname text not null,
  year text not null default 'other'
    check (year in ('freshman', 'sophomore', 'junior', 'senior', 'graduate', 'other')),
  avatar_url text,
  permission_level text not null default 'player'
    check (permission_level in ('player', 'narrator', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Permanent league player profiles, one per auth user.';

-- ----------------------------------------------------------------------------
-- Permission helpers — now valid since public.profiles exists.
-- SECURITY DEFINER so RLS on `profiles` never has to consult itself
-- recursively when other tables' policies need to know the caller's role.
-- ----------------------------------------------------------------------------
create or replace function public.get_my_permission_level()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select permission_level from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select permission_level from public.profiles where id = auth.uid()) = 'admin', false);
$$;

create or replace function public.is_narrator_or_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select permission_level from public.profiles where id = auth.uid()) in ('narrator', 'admin'), false);
$$;

-- ----------------------------------------------------------------------------
-- profiles triggers, RLS, and policies
-- ----------------------------------------------------------------------------
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Prevent a player from granting themselves narrator/admin or reactivating
-- themselves — only an existing admin may change these two columns.
create or replace function public.profiles_guard_privileged_columns()
returns trigger
language plpgsql
as $$
begin
  if (new.permission_level is distinct from old.permission_level
      or new.active is distinct from old.active)
     and not public.is_admin() then
    raise exception 'Only an admin may change permission_level or active status';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_privileged_columns
  before update on public.profiles
  for each row execute function public.profiles_guard_privileged_columns();

alter table public.profiles enable row level security;

-- Every league member can see every other member's profile (private league directory).
create policy profiles_select_authenticated
  on public.profiles for select
  to authenticated
  using (true);

-- A user may only ever create their own profile row (used by /api/join-league
-- after the access code has been verified server-side).
create policy profiles_insert_self
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Self-updates and admin updates both flow through this policy; the trigger
-- above stops self-updates from touching permission_level/active.
create policy profiles_update_self_or_admin
  on public.profiles for update
  to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- ----------------------------------------------------------------------------
-- league_settings (singleton row)
-- ----------------------------------------------------------------------------
create table public.league_settings (
  id int primary key default 1 check (id = 1),
  league_name text not null default 'Mafia League',
  access_code text not null,
  current_season text not null default 'Season 1',
  updated_at timestamptz not null default now()
);

comment on table public.league_settings is 'Singleton row. access_code is never exposed to clients directly — verified server-side only.';

create trigger league_settings_set_updated_at
  before update on public.league_settings
  for each row execute function public.set_updated_at();

alter table public.league_settings enable row level security;

-- Only admins may read the raw row (it contains the access code).
create policy league_settings_select_admin
  on public.league_settings for select
  to authenticated
  using (public.is_admin());

create policy league_settings_update_admin
  on public.league_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Safe, code-free subset for the rest of the app (Home page, nav, etc).
-- SECURITY DEFINER so it bypasses the admin-only RLS above by design.
create or replace function public.get_league_public_info()
returns table (league_name text, current_season text)
language sql
security definer
stable
set search_path = public
as $$
  select league_name, current_season from public.league_settings where id = 1;
$$;

grant execute on function public.get_league_public_info() to authenticated, anon;

-- Server-side-only RPC used by /api/join-league. Runs as SECURITY DEFINER so
-- it can read access_code even though the caller has no SELECT grant on the
-- table; only ever invoked from the route handler, never directly trusted
-- from a browser without also checking the result.
create or replace function public.verify_access_code(code text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.league_settings where id = 1 and access_code = code);
$$;

revoke execute on function public.verify_access_code(text) from public, anon;
grant execute on function public.verify_access_code(text) to authenticated;

-- ----------------------------------------------------------------------------
-- roles
-- ----------------------------------------------------------------------------
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  default_alignment text not null check (default_alignment in ('civilian', 'mafia')),
  acts_at_night boolean not null default false,
  ability_type text,
  uses_per_game int,
  can_be_recruited boolean not null default false,
  active boolean not null default true,
  sort_order int not null default 0
);

alter table public.roles enable row level security;

create policy roles_select_authenticated
  on public.roles for select
  to authenticated
  using (true);

create policy roles_write_admin
  on public.roles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.roles (name, slug, description, default_alignment, acts_at_night, ability_type, uses_per_game, can_be_recruited, sort_order) values
  ('Godfather', 'godfather', 'Leads the Mafia. Orders kills, recruits Civilians to the Mafia, and can attempt a daytime snipe.', 'mafia', true, 'kill_recruit_snipe', null, false, 1),
  ('Mafia', 'mafia', 'Standard Mafia member. Participates in the nightly kill.', 'mafia', true, 'kill', null, false, 2),
  ('Cop', 'cop', 'Investigates one player each night to learn their alignment. Requires two checks to confirm a Godfather.', 'civilian', true, 'investigate', null, true, 3),
  ('Medic', 'medic', 'Protects one player each night from the Mafia kill.', 'civilian', true, 'protect', null, true, 4),
  ('Priest', 'priest', 'One-time ability, used during the day, that fully reveals a target''s role and alignment to the group.', 'civilian', false, 'reveal', 1, true, 5),
  ('Kamikaze', 'kamikaze', 'When eliminated, immediately takes one additional living player down with them.', 'civilian', false, 'retaliate_on_death', null, true, 6),
  ('Silencer', 'silencer', 'Silences one player each night; that player cannot speak during the following day.', 'civilian', true, 'silence', null, true, 7),
  ('Civilian', 'civilian', 'No special ability. Wins by helping eliminate the Mafia.', 'civilian', false, null, null, true, 8);

-- ----------------------------------------------------------------------------
-- rules_versions
-- ----------------------------------------------------------------------------
create table public.rules_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  content jsonb not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);

alter table public.rules_versions enable row level security;

create policy rules_versions_select_authenticated
  on public.rules_versions for select
  to authenticated
  using (true);

create policy rules_versions_write_admin
  on public.rules_versions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Ensures only one rules version is ever marked current.
create unique index rules_versions_one_current
  on public.rules_versions ((is_current))
  where is_current;

insert into public.rules_versions (version, is_current, content) values (
  '1.0',
  true,
  '[
    {"section": "Game Overview", "body": "A Narrator guides a group of players through rounds of Night and Day. Each player is secretly assigned a Role with a hidden Alignment (Mafia or Civilian). The game alternates Night phases, where special roles act in secret, and Day phases, where the group discusses and votes. The game ends when a win condition is reached."},
    {"section": "Mafia / Civilian Objectives", "body": "Mafia-aligned players win by reducing the number of living Civilian-aligned players to be equal to or fewer than the living Mafia-aligned players. Civilian-aligned players win by eliminating every Mafia-aligned player."},
    {"section": "Godfather", "body": "Leads the Mafia. Each night the Godfather chooses to Recruit an eligible Civilian-aligned player to the Mafia, or order a Kill on a target. The Godfather may also attempt a Snipe during the day. A Godfather is only confirmed as Mafia to the Cops after two separate successful investigations."},
    {"section": "Mafia", "body": "Standard Mafia members act with the Godfather during the nightly kill and share the Mafia win condition."},
    {"section": "Cop", "body": "Each night, a Cop investigates one living player and learns MAFIA or NOT MAFIA. Investigating the Godfather always returns NOT MAFIA until a second, separate investigation of the Godfather has been completed, after which it correctly returns MAFIA."},
    {"section": "Medic", "body": "Each night, the Medic protects one living player from the Mafia''s kill. If the Mafia''s target matches the Medic''s protected player, the kill fails. The Medic may self-save a limited number of times per game."},
    {"section": "Priest", "body": "The Priest has one use for the entire game, activated during the day. The Priest names a target, whose full Role and Alignment are revealed to the entire group."},
    {"section": "Kamikaze", "body": "When the Kamikaze dies, by any death reason, they immediately take one additional living player down with them."},
    {"section": "Silencer", "body": "Each night, the Silencer chooses one living player. That player may not speak during the following Day phase. The silence is lifted automatically at the next Night phase."},
    {"section": "Recruitment", "body": "The Godfather may recruit an eligible Civilian-aligned player to the Mafia. Recruitment changes the player''s Alignment to Mafia but not their base Role — for example a recruited Cop becomes a \"Dirty Cop\": still mechanically a Cop, but now Mafia-aligned."},
    {"section": "Dirty Roles", "body": "A \"Dirty\" role (Dirty Cop, Dirty Medic, Dirty Priest, Dirty Silencer, Dirty Kamikaze, etc.) is any player whose base Role was Civilian-aligned but who has since been recruited to the Mafia. They keep their Role''s abilities but count as Mafia for win conditions."},
    {"section": "Voting", "body": "Daytime voting happens verbally in person. The Narrator records only the outcome: who was voted out."},
    {"section": "Sniping", "body": "During the day, the Godfather may attempt a Snipe on a target in person (a wink, confirmed or denied by the target pointing them out). The Narrator records whether the snipe was confirmed or denied."},
    {"section": "Death", "body": "Players may die by vote, Mafia kill, snipe, Kamikaze retaliation, or Narrator-recorded manual death. A Kamikaze death always triggers the Kamikaze''s retaliation ability."},
    {"section": "Win Conditions", "body": "Mafia wins when living Mafia-aligned players are greater than or equal to living Civilian-aligned players. Civilians win when zero Mafia-aligned players remain living. The Narrator confirms the win before the game officially ends."}
  ]'::jsonb
);

-- ----------------------------------------------------------------------------
-- games (Phase 2/3 — created now so the schema never needs breaking changes)
-- Note: the games_select policy (which reads from game_players) is created
-- further below, after game_players exists — a policy's USING clause is
-- type-checked at creation time, same as the sql-language functions above.
-- ----------------------------------------------------------------------------
create table public.games (
  id uuid primary key default gen_random_uuid(),
  league_number int unique,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'completed', 'cancelled', 'test')),
  narrator_id uuid not null references public.profiles (id),
  rules_version_id uuid references public.rules_versions (id),
  current_round int not null default 0,
  winner_alignment text check (winner_alignment in ('mafia', 'civilian')),
  started_at timestamptz,
  ended_at timestamptz,
  total_paused_seconds int not null default 0,
  official_duration_seconds int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.games is 'official_duration_seconds is the source of truth for Mafia Hours and is only set once, at completion.';

create trigger games_set_updated_at
  before update on public.games
  for each row execute function public.set_updated_at();

alter table public.games enable row level security;

create policy games_write_narrator_or_admin
  on public.games for all
  to authenticated
  using (public.is_narrator_or_admin())
  with check (public.is_narrator_or_admin());

-- ----------------------------------------------------------------------------
-- game_players
-- ----------------------------------------------------------------------------
create table public.game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  player_id uuid not null references public.profiles (id),
  base_role_id uuid not null references public.roles (id),
  original_alignment text not null check (original_alignment in ('civilian', 'mafia')),
  current_alignment text not null check (current_alignment in ('civilian', 'mafia')),
  alive boolean not null default true,
  death_reason text check (death_reason in ('vote', 'mafia_kill', 'snipe', 'kamikaze', 'manual', 'other')),
  died_round int,
  recruited boolean not null default false,
  recruited_by_player_id uuid references public.profiles (id),
  role_ability_used boolean not null default false,
  silenced_until_round int,
  godfather_check_count int not null default 0,
  self_save_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (game_id, player_id)
);

alter table public.game_players enable row level security;

-- games_select and game_players_select each need to check a condition on
-- the OTHER table. A plain `exists (select ... from <other table>)` would
-- make the two policies query each other recursively (Postgres error 42P17)
-- the moment either table is selected from. SECURITY DEFINER functions
-- avoid this: they run as their owner (the table owner, which bypasses RLS
-- by default), so the query inside never re-enters the other table's
-- policy — there's no cycle. Same pattern as is_admin() above.
create or replace function public.is_game_participant(p_game_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.game_players gp
    where gp.game_id = p_game_id and gp.player_id = auth.uid()
  );
$$;

create or replace function public.game_is_completed(p_game_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.games g
    where g.id = p_game_id and g.status = 'completed'
  );
$$;

grant execute on function public.is_game_participant(uuid) to authenticated;
grant execute on function public.game_is_completed(uuid) to authenticated;

create policy game_players_select
  on public.game_players for select
  to authenticated
  using (
    public.is_narrator_or_admin()
    or player_id = auth.uid()
    or public.game_is_completed(game_id)
  );

create policy game_players_write_narrator_or_admin
  on public.game_players for all
  to authenticated
  using (public.is_narrator_or_admin())
  with check (public.is_narrator_or_admin());

-- Now that game_players exists, add the games policy that reads from it.
create policy games_select
  on public.games for select
  to authenticated
  using (
    status = 'completed'
    or public.is_narrator_or_admin()
    or public.is_game_participant(id)
  );

-- ----------------------------------------------------------------------------
-- game_actions (internal structured event log — never rendered as a feed)
-- ----------------------------------------------------------------------------
create table public.game_actions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  round int not null default 0,
  phase text,
  action_type text not null,
  actor_player_id uuid references public.profiles (id),
  target_player_id uuid references public.profiles (id),
  payload jsonb not null default '{}'::jsonb,
  undone boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);

alter table public.game_actions enable row level security;

create policy game_actions_narrator_or_admin_only
  on public.game_actions for all
  to authenticated
  using (public.is_narrator_or_admin())
  with check (public.is_narrator_or_admin());

-- ----------------------------------------------------------------------------
-- game_pauses
-- ----------------------------------------------------------------------------
create table public.game_pauses (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  paused_at timestamptz not null default now(),
  resumed_at timestamptz
);

alter table public.game_pauses enable row level security;

create policy game_pauses_narrator_or_admin_only
  on public.game_pauses for all
  to authenticated
  using (public.is_narrator_or_admin())
  with check (public.is_narrator_or_admin());

-- ----------------------------------------------------------------------------
-- league_settings seed row — CHANGE THE ACCESS CODE AFTER RUNNING THIS.
-- ----------------------------------------------------------------------------
insert into public.league_settings (id, league_name, access_code, current_season)
values (1, 'Mafia League', 'CHANGE-ME', 'Season 1');

-- ----------------------------------------------------------------------------
-- Storage: avatars bucket
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy avatars_public_read
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy avatars_owner_write
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_owner_update
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_owner_delete
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
