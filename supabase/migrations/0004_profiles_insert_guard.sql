-- ============================================================================
-- Harden profiles against self-escalation at INSERT time.
--
-- profiles_guard_privileged_columns previously only fired BEFORE UPDATE.
-- The INSERT policy (profiles_insert_self) only checks `auth.uid() = id` —
-- nothing stops a request made directly against the Supabase REST API
-- (bypassing /api/join-league) from inserting a profile with
-- permission_level already set to 'narrator' or 'admin'. The app itself
-- never does this (it relies on the column defaults), but the database
-- should enforce it regardless of which client is talking to it.
-- ============================================================================

create or replace function public.profiles_guard_privileged_columns()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if (new.permission_level is distinct from 'player' or new.active is distinct from true)
       and not public.is_admin() then
      raise exception 'New profiles must start as player/active';
    end if;
    return new;
  end if;

  if (new.permission_level is distinct from old.permission_level
      or new.active is distinct from old.active)
     and not public.is_admin() then
    raise exception 'Only an admin may change permission_level or active status';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_privileged_columns_insert
  before insert on public.profiles
  for each row execute function public.profiles_guard_privileged_columns();
