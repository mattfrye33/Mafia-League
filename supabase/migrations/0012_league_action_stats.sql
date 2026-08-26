-- ============================================================================
-- Widen get_official_actions_for_stats() (0010) to also cover Cop
-- Investigate / Cross Check actions, needed for the new All-Time League
-- Action Stats (Cop Investigations, Cop Cross Checks, Mafia Found by Cops).
-- Still never includes anything beyond what a stat actually derives from —
-- e.g. no raw investigate/cross-check TARGET is exposed by anything reading
-- this, only counts and the pre-recorded MAFIA/NOT MAFIA result already
-- shown to the Narrator live.
-- ============================================================================

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
    and ga.action_type in (
      'recruit', 'snipe_confirmed', 'priest_use', 'kamikaze_kill', 'medic_protect',
      'resolve_night', 'silence', 'cop_investigate', 'cop_cross_check'
    );
$$;
