"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { managerCommandClient } from "@/features/auth/admin-command";
import { getViewerOrder } from "@/features/orders/queries";
import { sha256 } from "@/features/orders/guest-proof";
import { createPaymentProvider } from "@/lib/providers/registry";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import {
  consumePolicyRateLimit,
  rateLimitCommandError,
} from "@/lib/security/rate-limit";
import {
  commandFailure,
  commandSuccess,
  type CommandResult,
} from "@/lib/validation/command-result";

import {
  returnDecisionSchema,
  returnInformationSchema,
  returnInspectionSchema,
  returnReceiptSchema,
  returnRefundSchema,
  returnRequestSchema,
  returnRestockSchema,
} from "./schema";

export type ReturnCommandState =
  | CommandResult<{ id: string; reference?: string; changed: true }>
  | undefined;

function invalid(correlationId: string): ReturnCommandState {
  return commandFailure(
    {
      code: "INVALID_INPUT",
      messageKey: "returns.errors.invalid",
      retryable: false,
    },
    correlationId,
  );
}

function failed(correlationId: string, retryable = false): ReturnCommandState {
  return commandFailure(
    {
      code: retryable ? "PROVIDER_UNAVAILABLE" : "INTERNAL_ERROR",
      messageKey: retryable
        ? "returns.errors.provider"
        : "returns.errors.failed",
      retryable,
    },
    correlationId,
  );
}

function refreshReturn(locale: string, returnRequestId: string) {
  revalidatePath(`/${locale}/admin/returns`);
  revalidatePath(`/${locale}/admin/returns/${returnRequestId}`);
  revalidatePath(`/${locale}/admin`);
  revalidatePath(`/${locale}/account/returns/${returnRequestId}`);
}

export async function submitReturnRequestAction(
  _previous: ReturnCommandState,
  formData: FormData,
): Promise<ReturnCommandState> {
  const correlationId = randomUUID();
  const parsed = returnRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(correlationId);
  const viewer = await getViewerOrder(
    parsed.data.orderReference,
    parsed.data.locale,
  );
  if (!viewer) return invalid(correlationId);
  const line = parsed.data.lineId
    ? viewer.lines.find((candidate) => candidate.id === parsed.data.lineId)
    : undefined;
  if (parsed.data.requestKind === "return" && !line) {
    return invalid(correlationId);
  }
  const rateLimit = await consumePolicyRateLimit({
    policy: "returnSubmit",
    subjectHash: sha256(
      viewer.order.customer_profile_id ??
        viewer.order.guest_session_id ??
        viewer.order.id,
    ),
  });
  if (!rateLimit.allowed) {
    return commandFailure(
      rateLimitCommandError(rateLimit, "returns.errors.failed"),
      correlationId,
    );
  }
  const service = createServiceSupabaseClient();
  const result = await service.rpc("submit_return_request", {
    p_order_id: viewer.order.id,
    p_request_kind: parsed.data.requestKind,
    p_reason_code: parsed.data.reasonCode,
    p_buyer_note: parsed.data.buyerNote,
    p_line_items: line
      ? [{ lineId: line.id, quantity: parsed.data.quantity }]
      : [],
    p_idempotency_key_hash: sha256(parsed.data.idempotencyToken),
    p_guest_proof_hash: viewer.order.guest_proof_hash ?? undefined,
  });
  if (result.error) return invalid(correlationId);
  return commandSuccess(
    { id: result.data.id, reference: result.data.reference, changed: true },
    correlationId,
  );
}

export async function requestReturnInformationAction(formData: FormData) {
  const correlationId = randomUUID();
  const parsed = returnInformationSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) return invalid(correlationId);
  const client = await managerCommandClient("returns.request-information");
  const result = await client.rpc("request_return_information", {
    p_return_request_id: parsed.data.returnRequestId,
    p_expected_version: parsed.data.expectedVersion,
    p_message: parsed.data.message,
    p_idempotency_key: `return-info:${parsed.data.idempotencyToken}`,
  });
  if (result.error) return failed(correlationId, result.error.code === "40001");
  refreshReturn(parsed.data.locale, parsed.data.returnRequestId);
  return commandSuccess({ id: result.data.id, changed: true }, correlationId);
}

export async function decideReturnRequestAction(formData: FormData) {
  const correlationId = randomUUID();
  const parsed = returnDecisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(correlationId);
  const client = await managerCommandClient("returns.decision");
  const result = await client.rpc("decide_return_request", {
    p_return_request_id: parsed.data.returnRequestId,
    p_expected_version: parsed.data.expectedVersion,
    p_approve: parsed.data.decision === "approve",
    p_reason: parsed.data.reason,
    p_idempotency_key: `return-decision:${parsed.data.idempotencyToken}`,
  });
  if (result.error) return failed(correlationId, result.error.code === "40001");
  refreshReturn(parsed.data.locale, parsed.data.returnRequestId);
  return commandSuccess({ id: result.data.id, changed: true }, correlationId);
}

export async function recordReturnReceiptAction(formData: FormData) {
  const correlationId = randomUUID();
  const parsed = returnReceiptSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(correlationId);
  const client = await managerCommandClient("returns.receipt");
  const result = await client.rpc("record_return_receipt", {
    p_return_request_id: parsed.data.returnRequestId,
    p_expected_version: parsed.data.expectedVersion,
    p_note: parsed.data.note,
    p_idempotency_key: `return-receipt:${parsed.data.idempotencyToken}`,
  });
  if (result.error) return failed(correlationId, result.error.code === "40001");
  refreshReturn(parsed.data.locale, parsed.data.returnRequestId);
  return commandSuccess({ id: result.data.id, changed: true }, correlationId);
}

export async function markReturnInTransitAction(formData: FormData) {
  const correlationId = randomUUID();
  const parsed = returnReceiptSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(correlationId);
  const client = await managerCommandClient("returns.in-transit");
  const result = await client.rpc("mark_return_in_transit", {
    p_return_request_id: parsed.data.returnRequestId,
    p_expected_version: parsed.data.expectedVersion,
    p_note: parsed.data.note,
    p_idempotency_key: `return-transit:${parsed.data.idempotencyToken}`,
  });
  if (result.error) return failed(correlationId, result.error.code === "40001");
  refreshReturn(parsed.data.locale, parsed.data.returnRequestId);
  return commandSuccess({ id: result.data.id, changed: true }, correlationId);
}

export async function inspectReturnAction(formData: FormData) {
  const correlationId = randomUUID();
  const itemIds = formData.getAll("itemId");
  const conditions = formData.getAll("condition");
  const restockDecisions = formData.getAll("restockDecision");
  const refundAmounts = formData.getAll("refundAmountMinor");
  const itemNotes = formData.getAll("itemNote");
  const parsed = returnInspectionSchema.safeParse({
    ...Object.fromEntries(formData),
    items: itemIds.map((itemId, index) => ({
      itemId,
      condition: conditions[index],
      restockDecision: restockDecisions[index],
      refundAmountMinor: refundAmounts[index],
      itemNote: itemNotes[index],
    })),
  });
  if (!parsed.success) return invalid(correlationId);
  const client = await managerCommandClient("returns.inspect");
  const result = await client.rpc("inspect_return_request", {
    p_return_request_id: parsed.data.returnRequestId,
    p_expected_version: parsed.data.expectedVersion,
    p_summary: parsed.data.summary,
    p_package_condition: parsed.data.packageCondition,
    p_items: parsed.data.items.map((item) => ({
      itemId: item.itemId,
      condition: item.condition,
      restockDecision: item.restockDecision,
      refundAmountMinor: item.refundAmountMinor,
      note: item.itemNote,
    })),
    p_idempotency_key: `return-inspect:${parsed.data.idempotencyToken}`,
  });
  if (result.error) return failed(correlationId, result.error.code === "40001");
  refreshReturn(parsed.data.locale, parsed.data.returnRequestId);
  return commandSuccess({ id: result.data.id, changed: true }, correlationId);
}

export async function processReturnRefundAction(formData: FormData) {
  const correlationId = randomUUID();
  const parsed = returnRefundSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(correlationId);
  const client = await managerCommandClient("returns.refund");
  const request = await client
    .from("return_requests")
    .select("order_id,return_items(refund_amount_minor)")
    .eq("id", parsed.data.returnRequestId)
    .single();
  if (request.error) return failed(correlationId);
  const attempt = await client
    .from("payment_attempts")
    .select("method,provider,provider_reference,currency")
    .eq("order_id", request.data.order_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (attempt.error) return failed(correlationId);
  const refundAmountMinor = request.data.return_items.reduce(
    (sum, item) => sum + (item.refund_amount_minor ?? 0),
    0,
  );
  const payment = attempt.data;
  let providerReference = parsed.data.providerReference;
  const idempotencyKey = `return-refund:${parsed.data.idempotencyToken}`;
  if (payment?.method === "hosted_payment") {
    if (!payment.provider_reference) return failed(correlationId);
    try {
      const provider = createPaymentProvider();
      if (provider.name !== payment.provider)
        return failed(correlationId, true);
      const refund = await provider.refundPayment({
        providerReference: payment.provider_reference,
        amountMinor: refundAmountMinor,
        currency: payment.currency,
        idempotencyKey,
      });
      if (refund.state !== "succeeded") return failed(correlationId, true);
      providerReference = refund.refundReference;
    } catch {
      return failed(correlationId, true);
    }
  }
  const result = await client.rpc("process_return_refund", {
    p_return_request_id: parsed.data.returnRequestId,
    p_expected_version: parsed.data.expectedVersion,
    p_reason: parsed.data.reason,
    p_idempotency_key: idempotencyKey,
    p_provider_reference: providerReference,
  });
  if (result.error) return failed(correlationId, result.error.code === "40001");
  refreshReturn(parsed.data.locale, parsed.data.returnRequestId);
  return commandSuccess({ id: result.data.id, changed: true }, correlationId);
}

export async function applyReturnRestockAction(formData: FormData) {
  const correlationId = randomUUID();
  const parsed = returnRestockSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(correlationId);
  const client = await managerCommandClient("returns.restock");
  const result = await client.rpc("apply_return_restock", {
    p_return_request_id: parsed.data.returnRequestId,
    p_idempotency_key: `return-restock:${parsed.data.idempotencyToken}`,
  });
  if (result.error) return failed(correlationId);
  refreshReturn(parsed.data.locale, parsed.data.returnRequestId);
  return commandSuccess(
    { id: parsed.data.returnRequestId, changed: true },
    correlationId,
  );
}
