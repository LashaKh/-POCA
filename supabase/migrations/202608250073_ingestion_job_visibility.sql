grant select (id, job_type, subject_id, status) on public.media_jobs to authenticated;

create policy media_jobs_staff_read
on public.media_jobs for select to authenticated
using (public.is_active_staff());

comment on policy media_jobs_staff_read on public.media_jobs is
  'Active staff may read the bounded job identity/status fields granted for ingestion recovery UI.';
