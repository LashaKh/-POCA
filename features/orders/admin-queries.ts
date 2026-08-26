import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import { orderQueueSchema } from "./schema";

const PAGE_SIZE = 25;

export async function getAdminOrderQueue(raw: unknown) {
  const filters = orderQueueSchema.parse(raw);
  const client = await createServerSupabaseClient();
  let query = client
    .from("staff_order_operations")
    .select("*", { count: "exact" })
    .order("accepted_at", { ascending: false });
  if (filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.paymentStatus !== "all") {
    query = query.eq("payment_status", filters.paymentStatus);
  }
  if (filters.query) {
    query = query.or(
      `reference.ilike.%${filters.query.replaceAll(/[,%()]/g, "")}%,provider_reference.ilike.%${filters.query.replaceAll(/[,%()]/g, "")}%`,
    );
  }
  const start = (filters.page - 1) * PAGE_SIZE;
  const { data, error, count } = await query.range(
    start,
    start + PAGE_SIZE - 1,
  );
  if (error) throw error;
  return {
    rows: data,
    count: count ?? 0,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
    filters,
  };
}

export async function getAdminOrderDetail(orderId: string) {
  const client = await createServerSupabaseClient();
  const orderResult = await client
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (orderResult.error) throw orderResult.error;
  if (!orderResult.data) return undefined;
  const [
    lines,
    addresses,
    orderEvents,
    payments,
    bankReview,
    reconciliations,
    refunds,
    fulfillments,
    notes,
    links,
  ] = await Promise.all([
    client.from("order_lines").select("*").eq("order_id", orderId).order("id"),
    client
      .from("order_addresses")
      .select("*")
      .eq("order_id", orderId)
      .order("address_type"),
    client
      .from("order_events")
      .select("*")
      .eq("order_id", orderId)
      .order("occurred_at"),
    client
      .from("payment_attempts")
      .select("*,payment_events(*)")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false }),
    client
      .from("bank_transfer_reviews")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle(),
    client
      .from("payment_reconciliations")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false }),
    client
      .from("refund_records")
      .select("*")
      .eq("order_id", orderId)
      .order("requested_at", { ascending: false }),
    client
      .from("fulfillments")
      .select("*,shipment_events(*)")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false }),
    client
      .from("order_internal_notes")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false }),
    client
      .from("order_notification_links")
      .select("purpose,notifications(*,notification_attempts(*))")
      .eq("order_id", orderId),
  ]);
  for (const result of [
    lines,
    addresses,
    orderEvents,
    payments,
    bankReview,
    reconciliations,
    refunds,
    fulfillments,
    notes,
    links,
  ]) {
    if (result.error) throw result.error;
  }
  return {
    order: orderResult.data,
    lines: lines.data ?? [],
    addresses: addresses.data ?? [],
    events: orderEvents.data ?? [],
    payments: payments.data ?? [],
    bankReview: bankReview.data,
    reconciliations: reconciliations.data ?? [],
    refunds: refunds.data ?? [],
    fulfillments: fulfillments.data ?? [],
    notes: notes.data ?? [],
    notifications: links.data ?? [],
  };
}
