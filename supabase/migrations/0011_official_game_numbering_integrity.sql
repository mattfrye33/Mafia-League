-- ============================================================================
-- Official game numbering integrity.
--
-- Root cause: league_number was only ever kept correct by the BEFORE INSERT
-- trigger's nextval() call (0005) plus repair_official_game_numbers()'s own
-- explicit setval() (0010). Neither covers an Admin setting league_number
-- directly on a single game via the per-game Repair tool (repairGame()) —
-- that path writes the column with a plain UPDATE and never touches the
-- sequence, so the sequence can be left behind the real max. The next
-- normal game creation then calls nextval() from that stale position,
-- which can produce a non-sequential number or (if the sequence had
-- fallen behind far enough) collide with an existing league_number.
-- There was also no hard constraint stopping two rows from ever holding
-- the same league_number.
-- ============================================================================

-- Hard guarantee against duplicate official game numbers, enforced by
-- Postgres itself rather than app-layer logic. A UNIQUE constraint treats
-- every NULL as distinct from every other NULL, so Test Games (always
-- league_number = NULL) are completely unaffected.
alter table public.games
  add constraint games_league_number_unique unique (league_number);

-- Whenever league_number is set to a non-null value by ANY means — the
-- normal BEFORE INSERT trigger's nextval(), the bulk renumbering RPC, or an
-- Admin's manual single-game repair — advance the sequence to at least that
-- value. This is what actually guarantees "next official number = current
-- max + 1" regardless of which path assigned the current max.
create or replace function public.games_sync_league_number_seq()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.league_number is not null and not new.is_test then
    if new.league_number > (select last_value from public.games_league_number_seq) then
      perform setval('public.games_league_number_seq', new.league_number, true);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists games_sync_league_number_seq on public.games;

create trigger games_sync_league_number_seq
  after insert or update of league_number on public.games
  for each row execute function public.games_sync_league_number_seq();

-- One-time correctness sweep: bring the sequence up to the current highest
-- official league_number right now, in case a prior single-game repair (not
-- the bulk renumber tool) already left it behind.
select setval(
  'public.games_league_number_seq',
  greatest(coalesce((select max(league_number) from public.games where is_test = false), 0), 1),
  coalesce((select max(league_number) from public.games where is_test = false), 0) > 0
);
