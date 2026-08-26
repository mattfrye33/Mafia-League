-- ============================================================================
-- Official game history pipeline: numbering repair, and two narrow
-- SECURITY DEFINER read paths so the Games Archive / completed-game summary
-- / Leaderboard can derive public stats from game_actions without ever
-- opening that table up broadly (it stays narrator/admin-only otherwise —
-- same principle as get_player_stat_actions from 0009).
-- ============================================================================

-- One-time correctness sweep: any test game that picked up a league_number
-- before 0005 introduced the is_test-aware numbering trigger keeps it stuck
-- forever otherwise, since that trigger only runs on INSERT.
update public.games set league_number = null where is_test = true and league_number is not null;

-- ----------------------------------------------------------------------------
-- repair_official_game_numbers(): Admin-only. Renumbers every official
-- (non-test) game sequentially by created_at, regardless of status — a
-- deliberate reset tool for while the league is still young. Clears first to
-- avoid transient unique-constraint collisions while reassigning, and resets
-- the sequence so the next newly-created official game continues cleanly
-- from the new max instead of colliding or skipping ahead.
-- ----------------------------------------------------------------------------
create or replace function public.repair_official_game_numbers()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  n int := 0;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can repair official game numbering';
  end if;

  update public.games set league_number = null where is_test = false;

  for r in
    select id from public.games where is_test = false order by created_at asc
  loop
    n := n + 1;
    update public.games set league_number = n where id = r.id;
  end loop;

  update public.games set league_number = null where is_test = true;

  perform setval('public.games_league_number_seq', greatest(n, 1), n > 0);

  return n;
end;
$$;

grant execute on function public.repair_official_game_numbers() to authenticated;

-- ----------------------------------------------------------------------------
-- get_official_game_actions(): the action log for ONE completed, official
-- game. Safe to expose to any authenticated user because the game is
-- already finished and its outcome is meant to become public league
-- history — this powers the completed-game summary's per-player highlights
-- (recruited, snipe, save, Priest use, Kamikaze kill), not a raw event feed.
-- ----------------------------------------------------------------------------
create or replace function public.get_official_game_actions(target_game_id uuid)
returns table (
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
  select ga.round, ga.action_type, ga.actor_game_player_id, ga.target_game_player_id, ga.payload
  from public.game_actions ga
  join public.games g on g.id = ga.game_id
  where g.id = target_game_id
    and g.status = 'completed'
    and g.is_test = false
    and ga.undone = false;
$$;

grant execute on function public.get_official_game_actions(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- get_official_actions_for_stats(): the same idea across EVERY completed
-- official game at once, restricted to only the action types any current
-- stat/badge actually derives from (never Cop check results — those stay
-- narrator/admin-only forever, even post-completion, since no stat needs
-- them). Powers the Leaderboard without an N+1 RPC call per player.
-- ----------------------------------------------------------------------------
create or replace function public.get_official_actions_for_stats()
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
    and ga.action_type in ('recruit', 'snipe_confirmed', 'priest_use', 'kamikaze_kill', 'medic_protect', 'resolve_night', 'silence');
$$;

grant execute on function public.get_official_actions_for_stats() to authenticated;
