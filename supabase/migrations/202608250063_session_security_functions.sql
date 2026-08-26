create or replace function public.revoke_current_session(p_reason text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_session_id uuid;
begin
  if auth.uid() is null or not public.has_auth_assurance('aal1')
    or char_length(btrim(p_reason)) not between 2 and 240 then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  current_session_id := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  update public.app_sessions set
    revoked_at = statement_timestamp(),
    revoked_reason = btrim(p_reason),
    revoked_by = auth.uid()
  where profile_id = auth.uid() and auth_session_id = current_session_id
    and revoked_at is null;
  return found;
end;
$$;

revoke all on function public.revoke_current_session(text) from public, anon;
grant execute on function public.revoke_current_session(text) to authenticated, service_role;
