-- ============================================================================
-- Test Players
--
-- profiles.id is a foreign key straight into auth.users(id), so a login-less
-- fake player can never be a `profiles` row — it needs its own table. To let
-- a single game_players "seat" point at either a real profile or a test
-- player (so the future Phase 3 engine treats both identically), player_id
-- becomes nullable and a new test_player_id column is added alongside it,
-- with a CHECK constraint guaranteeing exactly one is ever set.
-- ============================================================================

create table public.test_players (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  nickname text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

comment on table public.test_players is 'Login-less fake participants for Test Games only. Never linked to auth.users.';

alter table public.test_players enable row level security;

-- Narrators need to see test players to select them when building a Test
-- Game, but only Admins can create/delete them, per the explicit "Admin
-- section for Test Players" requirement.
create policy test_players_select_narrator_or_admin
  on public.test_players for select
  to authenticated
  using (public.is_narrator_or_admin());

create policy test_players_write_admin
  on public.test_players for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- game_players: allow a seat to reference a test player instead of a profile
-- ----------------------------------------------------------------------------
alter table public.game_players
  alter column player_id drop not null,
  add column test_player_id uuid references public.test_players (id) on delete cascade;

alter table public.game_players
  add constraint game_players_exactly_one_participant
  check (
    (player_id is not null and test_player_id is null)
    or (player_id is null and test_player_id is not null)
  );

-- NULLs don't collide in a unique constraint, so this only actively enforces
-- uniqueness among the non-null test_player_id rows — exactly like the
-- existing (game_id, player_id) unique constraint does for real players.
alter table public.game_players
  add constraint game_players_game_test_player_unique unique (game_id, test_player_id);

-- Hard guarantee (not just an app-level check) that a test player can never
-- end up in an Official Game, even via a direct API call or future Phase 3
-- code that inserts game_players rows through a different path.
create or replace function public.game_players_guard_test_player_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  game_is_test boolean;
begin
  select is_test into game_is_test from public.games where id = new.game_id;

  if new.test_player_id is not null and not coalesce(game_is_test, false) then
    raise exception 'Test players can only be added to Test Games';
  end if;

  return new;
end;
$$;

create trigger game_players_guard_test_player_scope
  before insert or update on public.game_players
  for each row execute function public.game_players_guard_test_player_scope();
