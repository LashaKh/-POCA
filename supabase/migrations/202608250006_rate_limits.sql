create table public.rate_limit_windows (
  scope text not null check (char_length(scope) between 1 and 100),
  subject_hash text not null check (char_length(subject_hash) between 32 and 128),
  window_started_at timestamptz not null,
  window_seconds integer not null check (window_seconds between 1 and 86400),
  request_count integer not null default 0 check (request_count >= 0),
  request_limit integer not null check (request_limit between 1 and 10000),
  expires_at timestamptz not null,
  primary key (scope, subject_hash, window_started_at),
  constraint rate_limit_expiry check (expires_at > window_started_at)
);

alter table public.rate_limit_windows enable row level security;
alter table public.rate_limit_windows force row level security;
revoke all on public.rate_limit_windows from public, anon, authenticated;
grant all on public.rate_limit_windows to service_role;

create or replace function public.consume_rate_limit(
  p_operation_scope text,
  p_subject_hash text,
  p_request_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  now_at timestamptz := clock_timestamp();
  window_start timestamptz;
  current_count integer;
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if char_length(p_operation_scope) not between 1 and 100
    or char_length(p_subject_hash) not between 32 and 128
    or p_request_limit not between 1 and 10000
    or p_window_seconds not between 1 and 86400 then
    raise exception 'INVALID_RATE_LIMIT' using errcode = '22023';
  end if;

  window_start := to_timestamp(
    floor(extract(epoch from now_at) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limit_windows (
    scope,
    subject_hash,
    window_started_at,
    window_seconds,
    request_count,
    request_limit,
    expires_at
  ) values (
    p_operation_scope,
    p_subject_hash,
    window_start,
    p_window_seconds,
    1,
    p_request_limit,
    window_start + make_interval(secs => p_window_seconds * 2)
  )
  on conflict (scope, subject_hash, window_started_at)
  do update set
    request_count = rate_limit_windows.request_count + 1,
    request_limit = excluded.request_limit,
    expires_at = excluded.expires_at
  returning rate_limit_windows.request_count into current_count;

  return query select
    current_count <= p_request_limit,
    greatest(p_request_limit - current_count, 0),
    case
      when current_count <= p_request_limit then 0
      else greatest(ceil(extract(epoch from window_start + make_interval(secs => p_window_seconds) - now_at))::integer, 1)
    end;
end;
$$;

revoke all on function public.consume_rate_limit(text, text, integer, integer)
from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer)
to service_role;

comment on table public.rate_limit_windows is
  'Server-only bounded abuse-control counters keyed by hashed subject, never raw IP or email.';
