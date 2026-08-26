-- ============================================================================
-- Fix: infinite recursion (42P17) between games_select and game_players_select
--
-- Root cause: games_select subqueries game_players directly, and
-- game_players_select subqueries games directly. Evaluating either policy
-- triggers the other, which triggers the first again, forever.
--
-- Fix: replace the direct cross-table subqueries with SECURITY DEFINER
-- functions. A SECURITY DEFINER function runs as its owner (the table
-- owner, which bypasses RLS by default), so the query inside it never
-- re-enters the other table's RLS policy — there is no cycle to recurse
-- through. This is the same pattern already used for is_admin() /
-- is_narrator_or_admin() reading `profiles` without recursing into
-- `profiles`'s own policies.
--
-- RLS stays enabled throughout. No table is exposed more broadly than
-- before — these functions encode exactly the same checks the old inline
-- subqueries did.
-- ============================================================================

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

-- Rebuild games_select using the new function instead of subquerying
-- game_players directly.
drop policy if exists games_select on public.games;

create policy games_select
  on public.games for select
  to authenticated
  using (
    status = 'completed'
    or public.is_narrator_or_admin()
    or public.is_game_participant(id)
  );

-- Rebuild game_players_select using the new function instead of subquerying
-- games directly.
drop policy if exists game_players_select on public.game_players;

create policy game_players_select
  on public.game_players for select
  to authenticated
  using (
    public.is_narrator_or_admin()
    or player_id = auth.uid()
    or public.game_is_completed(game_id)
  );
