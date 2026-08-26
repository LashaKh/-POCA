alter table public.ingestion_batches enable row level security;
alter table public.ingestion_files enable row level security;
alter table public.assisted_suggestions enable row level security;

revoke all on public.ingestion_batches, public.ingestion_files, public.assisted_suggestions
from public, anon, authenticated;

grant select, insert, update on public.ingestion_batches to authenticated;
grant select, insert, update on public.ingestion_files to authenticated;
grant select, insert, update, delete on public.assisted_suggestions to authenticated;

create policy ingestion_batches_staff_read
on public.ingestion_batches for select to authenticated
using (public.is_active_staff());
create policy ingestion_batches_staff_insert
on public.ingestion_batches for insert to authenticated
with check (public.is_active_staff() and created_by = auth.uid());
create policy ingestion_batches_staff_update
on public.ingestion_batches for update to authenticated
using (public.is_active_staff())
with check (public.is_active_staff());

create policy ingestion_files_staff_read
on public.ingestion_files for select to authenticated
using (public.is_active_staff());
create policy ingestion_files_staff_insert
on public.ingestion_files for insert to authenticated
with check (
  public.is_active_staff()
  and uploaded_by = auth.uid()
  and exists (
    select 1 from public.ingestion_batches batch
    where batch.id = batch_id and batch.status not in ('published', 'cancelled')
  )
);
create policy ingestion_files_staff_update
on public.ingestion_files for update to authenticated
using (public.is_active_staff())
with check (public.is_active_staff());

create policy assisted_suggestions_staff_all
on public.assisted_suggestions for all to authenticated
using (public.is_active_staff())
with check (public.is_active_staff());

drop policy if exists catalog_storage_staff_all on storage.objects;

create policy product_originals_staff_read
on storage.objects for select to authenticated
using (
  bucket_id = 'product-originals'
  and public.is_active_staff()
  and exists (
    select 1 from public.ingestion_files file
    where file.storage_bucket = bucket_id and file.storage_path = name
  )
);

create policy product_originals_registered_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-originals'
  and owner_id = auth.uid()::text
  and public.is_active_staff()
  and exists (
    select 1 from public.ingestion_files file
    join public.ingestion_batches batch on batch.id = file.batch_id
    where file.storage_bucket = bucket_id
      and file.storage_path = name
      and file.uploaded_by = auth.uid()
      and file.status in ('registered', 'uploading')
      and batch.status not in ('published', 'cancelled')
  )
);

create policy product_originals_owned_update
on storage.objects for update to authenticated
using (
  bucket_id = 'product-originals'
  and owner_id = auth.uid()::text
  and public.is_active_staff()
)
with check (
  bucket_id = 'product-originals'
  and owner_id = auth.uid()::text
  and public.is_active_staff()
  and exists (
    select 1 from public.ingestion_files file
    where file.storage_bucket = bucket_id
      and file.storage_path = name
      and file.uploaded_by = auth.uid()
      and file.status in ('registered', 'uploading')
  )
);

create policy product_originals_orphan_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-originals'
  and owner_id = auth.uid()::text
  and public.is_active_staff()
  and exists (
    select 1 from public.ingestion_files file
    where file.storage_bucket = bucket_id
      and file.storage_path = name
      and file.uploaded_by = auth.uid()
      and file.media_asset_id is null
      and file.status in ('registered', 'uploading', 'failed', 'cancelled')
  )
);

create policy product_renditions_staff_read
on storage.objects for select to authenticated
using (bucket_id = 'product-renditions' and public.is_active_staff());

grant all on public.ingestion_batches, public.ingestion_files, public.assisted_suggestions
to service_role;
