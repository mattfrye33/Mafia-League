-- ============================================================================
-- Mafia League — Phase 2 additions
-- Purely additive: one new column, one sequence for auto-numbered games.
-- Does not touch any existing table, policy, function, or trigger from
-- 0001_init.sql. Safe to run on top of the existing Phase 1 schema.
-- ============================================================================

-- Godfather Recruits Allowed is configured at game setup but isn't a role
-- slot assigned to a player, so it has nowhere to live on game_players —
-- it belongs on the game itself.
alter table public.games
  add column if not exists godfather_recruits_allowed int not null default 0;

-- "GAME #N" needs a stable, auto-incrementing number as soon as a game is
-- created (draft or active), not only once it's completed — matches the
-- master prompt's "GAME #31 LIVE 00:36:17" example for an in-progress game.
-- The Games archive (Phase 4) can still filter to completed games only when
-- listing official results.
create sequence if not exists public.games_league_number_seq;

alter table public.games
  alter column league_number set default nextval('public.games_league_number_seq');

alter sequence public.games_league_number_seq owned by public.games.league_number;
