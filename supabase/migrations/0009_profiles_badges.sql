-- ============================================================================
-- Player profile improvements: bio field, badge system, featured badges,
-- and a security-scoped read path for deriving career stats from
-- game_actions (which stays narrator/admin-only for everything else).
-- ============================================================================

alter table public.profiles
  add column if not exists bio text check (bio is null or char_length(bio) <= 200);

-- ----------------------------------------------------------------------------
-- badges: definitions, same pattern as `roles` — schema supports adding more
-- later without code changes to the schema itself (evaluation logic for a
-- brand new badge still needs code, but the table/RLS/display layer doesn't).
-- ----------------------------------------------------------------------------
create table public.badges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  category text not null default 'general',
  sort_order int not null default 0,
  active boolean not null default true
);

alter table public.badges enable row level security;

create policy badges_select_authenticated
  on public.badges for select
  to authenticated
  using (true);

create policy badges_write_admin
  on public.badges for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.badges (slug, name, description, category, sort_order) values
  ('first_game', 'First Game', 'Completed your first official game.', 'milestone', 1),
  ('first_win', 'First Win', 'Won your first official game.', 'milestone', 2),
  ('veteran', 'Veteran', 'Played 10 official games.', 'milestone', 3),
  ('mafia_regular', 'Mafia Regular', 'Played 10 games Mafia-aligned.', 'alignment', 4),
  ('civilian_regular', 'Civilian Regular', 'Played 10 games Civilian-aligned.', 'alignment', 5),
  ('godfather_victory', 'Godfather Victory', 'Won an official game as Godfather.', 'role', 6),
  ('mastermind', 'Mastermind', 'Won multiple official games as Godfather.', 'role', 7),
  ('recruiter', 'Recruiter', 'Completed a successful recruit.', 'role', 8),
  ('snipe', 'Snipe', 'Completed a successful snipe.', 'role', 9),
  ('sharpshooter', 'Sharpshooter', 'Completed multiple successful snipes.', 'role', 10),
  ('medic_save', 'Medic Save', 'Completed a successful Medic save.', 'role', 11),
  ('guardian', 'Guardian', 'Completed multiple successful Medic saves.', 'role', 12),
  ('priest', 'Priest', 'Successfully used the Priest ability.', 'role', 13),
  ('kamikaze', 'Kamikaze', 'Recorded a Kamikaze kill.', 'role', 14);

-- ----------------------------------------------------------------------------
-- profile_featured_badges: up to 3 player-chosen badges to feature. "At most
-- 3" and "must already be earned" are enforced at the app layer (earned
-- status is derived, not a stored table a CHECK constraint could reference).
-- ----------------------------------------------------------------------------
create table public.profile_featured_badges (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  position int not null check (position between 1 and 3),
  created_at timestamptz not null default now(),
  primary key (profile_id, badge_id),
  unique (profile_id, position)
);

alter table public.profile_featured_badges enable row level security;

create policy profile_featured_badges_select_authenticated
  on public.profile_featured_badges for select
  to authenticated
  using (true);

create policy profile_featured_badges_write_self
  on public.profile_featured_badges for all
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- ----------------------------------------------------------------------------
-- get_player_stat_actions: game_actions stays narrator/admin-only for
-- everything else (it's an internal log, not meant to be a public event
-- feed), but computing badges/career stats for a public profile needs a
-- narrow read of it. This SECURITY DEFINER function only ever returns rows
-- for games the target player participated in, and within those games only
-- rows where they're the actor/target (or resolve_night, which carries no
-- player-identifying info beyond ids already needed for Medic-save
-- cross-referencing) — never another player's Cop checks, recruit targets,
-- etc. from the same game.
-- ----------------------------------------------------------------------------
create or replace function public.get_player_stat_actions(target_player_id uuid)
returns table (
  game_id uuid,
  round int,
  action_type text,
  actor_game_player_id uuid,
  target_game_player_id uuid,
  payload jsonb
)
language sql
security definer
stable
set search_path = public
as $$
  select ga.game_id, ga.round, ga.action_type, ga.actor_game_player_id, ga.target_game_player_id, ga.payload
  from public.game_actions ga
  join public.games g on g.id = ga.game_id
  where g.status = 'completed'
    and g.is_test = false
    and ga.undone = false
    and ga.game_id in (select gp.game_id from public.game_players gp where gp.player_id = target_player_id)
    and (
      ga.action_type = 'resolve_night'
      or ga.actor_game_player_id in (select gp.id from public.game_players gp where gp.player_id = target_player_id)
      or ga.target_game_player_id in (select gp.id from public.game_players gp where gp.player_id = target_player_id)
    );
$$;

grant execute on function public.get_player_stat_actions(uuid) to authenticated;
