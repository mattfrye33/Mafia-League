-- ============================================================================
-- Test Game mode
--
-- The existing `status` check constraint already allows a literal 'test'
-- value, but that doesn't actually fit the requirement: a test game must go
-- through the exact same draft -> active -> completed lifecycle as a real
-- game (same setup, same future Night/Day engine), so 'test' can't also
-- BE the status. Instead, is_test is a flag orthogonal to status — a test
-- game is a completely normal game that happens to be excluded from
-- official numbering and (once Phase 4 builds stats) from every stat
-- aggregation. The unused 'test' value is left in the status check
-- constraint for backward compatibility; it's simply never used.
-- ============================================================================

alter table public.games
  add column if not exists is_test boolean not null default false;

-- Official numbering must stay sequential and ignore test games entirely —
-- so test games can no longer just take a number from the column default
-- (0002_phase2_games.sql) and get it blanked out after the fact, since that
-- would still burn a sequence value and create gaps. A BEFORE INSERT
-- trigger decides instead: test games never get a number, official games
-- get the next one only when they don't already have one.
alter table public.games
  alter column league_number drop default;

create or replace function public.games_assign_league_number()
returns trigger
language plpgsql
as $$
begin
  if new.is_test then
    new.league_number := null;
  elsif new.league_number is null then
    new.league_number := nextval('public.games_league_number_seq');
  end if;
  return new;
end;
$$;

create trigger games_assign_league_number
  before insert on public.games
  for each row execute function public.games_assign_league_number();

-- Split the old blanket "for all" policy so DELETE can be restricted to
-- test games only — a Narrator/Admin should be able to delete test games
-- freely, but an accidental or malicious delete of an official game (and
-- its history) should not be possible even via a direct API call.
drop policy if exists games_write_narrator_or_admin on public.games;

create policy games_insert_narrator_or_admin
  on public.games for insert
  to authenticated
  with check (public.is_narrator_or_admin());

create policy games_update_narrator_or_admin
  on public.games for update
  to authenticated
  using (public.is_narrator_or_admin())
  with check (public.is_narrator_or_admin());

create policy games_delete_test_only
  on public.games for delete
  to authenticated
  using (public.is_narrator_or_admin() and is_test);
