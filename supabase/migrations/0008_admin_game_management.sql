-- ============================================================================
-- Admin game management: allow deleting cancelled/invalid official games
-- (any Narrator/Admin) and any other official game (Admin only), without
-- weakening the existing test-game-only delete rule for Narrators.
--
-- games_delete_test_only (0005) only ever allowed deleting is_test rows.
-- That's replaced by two policies (Postgres OR's multiple permissive
-- policies together):
--   1. Narrator/Admin can delete a game if it's a test game OR an official
--      game that's still just draft/cancelled (never real, or explicitly
--      invalidated) — safe for any Narrator to clean up.
--   2. Admin can delete ANY game, including official active/paused/completed
--      ones. The app additionally requires a strong UI confirmation before
--      calling this for a completed game, but the real guarantee is here:
--      a plain Narrator can never satisfy is_admin(), so they structurally
--      cannot delete real game history no matter what the UI does.
-- ============================================================================

drop policy if exists games_delete_test_only on public.games;

create policy games_delete_test_or_invalid_narrator_or_admin
  on public.games for delete
  to authenticated
  using (
    public.is_narrator_or_admin()
    and (is_test or status in ('draft', 'cancelled'))
  );

create policy games_delete_admin_any
  on public.games for delete
  to authenticated
  using (public.is_admin());
