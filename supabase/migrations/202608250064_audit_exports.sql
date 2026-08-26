create or replace function public.request_audit_export(
  p_scope jsonb,
  p_download_name text
)
returns public.export_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  export_record public.export_jobs;
  correlation uuid := extensions.gen_random_uuid();
begin
  perform app_private.assert_owner(true);
  perform app_private.assert_recent_protected_operation(
    'export-sensitive', 'audit', 'audit'
  );
  if auth.uid() is null or jsonb_typeof(p_scope) <> 'object'
    or char_length(p_download_name) not between 5 and 255
    or p_download_name !~ '^[A-Za-z0-9._-]+\.csv$' then
    raise exception 'INVALID_AUDIT_EXPORT' using errcode = '22023';
  end if;
  insert into public.export_jobs (
    requested_by, export_type, scope, status, expires_at,
    correlation_id, export_format, download_name
  ) values (
    auth.uid(), 'audit', p_scope, 'pending', statement_timestamp() + interval '2 hours',
    correlation, 'csv', p_download_name
  ) returning * into export_record;
  perform app_private.write_audit_event(
    'owner', 'security.audit.export-request', 'export', export_record.id::text,
    'succeeded', 'audit-export', correlation,
    jsonb_build_object('bounded', true, 'expiresInHours', 2)
  );
  return export_record;
end;
$$;

revoke all on function public.request_audit_export(jsonb, text) from public, anon;
grant execute on function public.request_audit_export(jsonb, text) to authenticated, service_role;
