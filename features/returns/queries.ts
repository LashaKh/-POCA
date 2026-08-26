import "server-only";

import { getViewerOrder } from "@/features/orders/queries";
import type { AppLocale } from "@/i18n/routing";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

import { parseReturnEligibility } from "./eligibility";
import { returnQueueSchema } from "./schema";

const returnDetailSelection = `
  *,
  return_items(*,order_lines(id,localized_name,quantity,total_minor,product_id)),
  return_events(*),
  return_messages(*),
  return_evidence(*),
  return_inspections(*),
  return_decisions(*),
  return_restock_links(*),
  return_refund_links(*),
  orders(id,reference,currency,total_minor,contact_email,status,payment_status)
`;

async function addSignedEvidenceUrls<
  T extends {
    return_evidence: Array<{ storage_path: string; status: string }>;
  },
>(record: T) {
  const service = createServiceSupabaseClient();
  const signed = await Promise.all(
    record.return_evidence.map(async (evidence) => {
      if (evidence.status !== "attached") return { ...evidence };
      const result = await service.storage
        .from("return-evidence")
        .createSignedUrl(evidence.storage_path, 300);
      if (result.error) throw result.error;
      return { ...evidence, signedUrl: result.data.signedUrl };
    }),
  );
  return { ...record, return_evidence: signed };
}

export async function getViewerReturnEligibility(
  reference: string,
  locale: AppLocale,
  kind: "cancellation" | "return",
) {
  const record = await getViewerOrder(reference, locale);
  if (!record) return undefined;
  const service = createServiceSupabaseClient();
  const result = await service.rpc("evaluate_return_eligibility", {
    p_order_id: record.order.id,
    p_request_kind: kind,
  });
  if (result.error) throw result.error;
  return { order: record, eligibility: parseReturnEligibility(result.data) };
}

export async function getViewerReturnsForOrder(
  reference: string,
  locale: AppLocale,
) {
  const record = await getViewerOrder(reference, locale);
  if (!record) return undefined;
  const service = createServiceSupabaseClient();
  const requests = await service
    .from("return_requests")
    .select(
      "id,reference,request_kind,status,reason_code,created_at,updated_at",
    )
    .eq("order_id", record.order.id)
    .order("created_at", { ascending: false });
  if (requests.error) throw requests.error;
  return { order: record, requests: requests.data };
}

export async function getCustomerReturn(returnRequestId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(returnRequestId)) return undefined;
  const client = await createServerSupabaseClient();
  const result = await client
    .from("return_requests")
    .select(returnDetailSelection)
    .eq("id", returnRequestId)
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data ? addSignedEvidenceUrls(result.data) : undefined;
}

export async function getGuestReturn(
  returnRequestId: string,
  orderReference: string,
  locale: AppLocale,
) {
  const order = await getViewerOrder(orderReference, locale);
  if (!order) return undefined;
  const service = createServiceSupabaseClient();
  const result = await service
    .from("return_requests")
    .select(returnDetailSelection)
    .eq("id", returnRequestId)
    .eq("order_id", order.order.id)
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data ? addSignedEvidenceUrls(result.data) : undefined;
}

export async function getAdminReturnQueue(raw: unknown) {
  const filters = returnQueueSchema.parse(raw);
  const client = await createServerSupabaseClient();
  let query = client
    .from("staff_return_queue")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  if (filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.kind !== "all") query = query.eq("request_kind", filters.kind);
  if (filters.query) {
    const queryValue = filters.query.replaceAll(/[,%()]/g, "");
    query = query.or(
      `reference.ilike.%${queryValue}%,order_reference.ilike.%${queryValue}%`,
    );
  }
  const start = (filters.page - 1) * 25;
  const result = await query.range(start, start + 24);
  if (result.error) throw result.error;
  return {
    rows: result.data,
    count: result.count ?? 0,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil((result.count ?? 0) / 25)),
    filters,
  };
}

export async function getAdminReturnDetail(returnRequestId: string) {
  const client = await createServerSupabaseClient();
  const result = await client
    .from("return_requests")
    .select(returnDetailSelection)
    .eq("id", returnRequestId)
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data ? addSignedEvidenceUrls(result.data) : undefined;
}

export async function getActiveReturnPolicy() {
  const client = await createServerSupabaseClient();
  const result = await client
    .from("return_policies")
    .select("*")
    .eq("active", true)
    .single();
  if (result.error) throw result.error;
  return result.data;
}
