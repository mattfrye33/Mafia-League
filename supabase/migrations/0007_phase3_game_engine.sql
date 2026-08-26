-- ============================================================================
-- Phase 3 — Narrator Game Engine schema
--
-- Additive/corrective only. game_actions and game_players' recruiter column
-- have never been written to by any shipped feature yet (Phase 1/2 never
-- used game_actions, and recruiting didn't exist yet), so it's safe to
-- restructure them here rather than bolt on parallel columns.
-- ============================================================================

-- games: night-phase state machine + pending (held) night-action targets +
-- a running recruits-used counter (recruits_allowed already existed).
alter table public.games
  add column if not exists phase text not null default 'day'
    check (phase in ('night_godfather', 'night_cop', 'night_medic', 'night_silencer', 'night_resolve', 'day')),
  add column if not exists pending_mafia_kill_game_player_id uuid references public.game_players (id) on delete set null,
  add column if not exists pending_medic_protect_game_player_id uuid references public.game_players (id) on delete set null,
  add column if not exists godfather_recruits_used int not null default 0;

-- game_players: the Godfather who recruited someone might be a test player,
-- so "who recruited whom" must point at a game_players.id (the shared
-- identity for real and test participants alike), not profiles.id directly.
alter table public.game_players
  drop column if exists recruited_by_player_id,
  add column if not exists recruited_by_game_player_id uuid references public.game_players (id) on delete set null;

-- game_actions: same reasoning — an action's actor/target might be a test
-- player, so these must reference game_players.id rather than profiles.id.
alter table public.game_actions
  drop column if exists actor_player_id,
  drop column if exists target_player_id,
  add column if not exists actor_game_player_id uuid references public.game_players (id) on delete set null,
  add column if not exists target_game_player_id uuid references public.game_players (id) on delete set null;
