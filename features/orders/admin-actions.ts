"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { createPaymentProvider } from "@/lib/providers/registry";
import { managerCommandClient } from "@/features/auth/admin-command";
import {
  commandFailure,
  commandSuccess,
  type CommandResult,
} from "@/lib/validation/command-result";

import {
  deliverySchema,
  orderNoteSchema,
  refundSchema,
  retryNotificationSchema,
  shipmentSchema,
  transferReviewSchema,
  transitionOrderSchema,
} from "./schema";

type OperationResult = CommandResult<{ id: string }>;

function invalid(correlationId: string): OperationResult {
  return commandFailure(
    {
      code: "INVALID_INPUT",
      messageKey: "admin.orders.invalid",
      retryable: false,
    },
    correlationId,
  );
}

function failed(correlationId: string, retryable = false): OperationResult {
  return commandFailure(
    {
      code: retryable ? "PROVIDER_UNAVAILABLE" : "INTERNAL_ERROR",
      messageKey: retryable
        ? "admin.orders.providerUnavailable"
        : "admin.orders.failed",
      retryable,
    },
    correlationId,
  );
}

function refreshOrder(locale: string, orderId: string) {
  revalidatePath(`/${locale}/admin/orders/${orderId}`);
  revalidatePath(`/${locale}/admin/orders`);
  revalidatePath(`/${locale}/admin`);
}

export async function transitionOrderAction(
  formData: FormData,
): Promise<OperationResult> {
  const correlationId = randomUUID();
  const locale = String(formData.get("locale") ?? "en");
  const parsed = transitionOrderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(correlationId);
  const client = await managerCommandClient("orders.transition");
  const { data, error } = await client.rpc("transition_order", {
    p_order_id: parsed.data.orderId,
    p_expected_version: parsed.data.expectedVersion,
    p_target_status: parsed.data.targetStatus,
    p_reason: parsed.data.reason,
    p_idempotency_key: parsed.data.idempotencyKey,
  });
  if (error) return failed(correlationId, error.code === "40001");
  refreshOrder(locale, parsed.data.orderId);
  return commandSuccess({ id: data.id }, correlationId);
}

export async function reviewTransferAction(
  formData: FormData,
): Promise<OperationResult> {
  const correlationId = randomUUID();
  const locale = String(formData.get("locale") ?? "en");
  const parsed = transferReviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(correlationId);
  const client = await managerCommandClient("orders.transfer-review");
  const { data, error } = await client.rpc("review_bank_transfer", {
    p_order_id: parsed.data.orderId,
    p_decision: parsed.data.decision,
    p_transfer_reference: parsed.data.transferReference,
    p_amount_minor: parsed.data.amountMinor,
    p_currency: parsed.data.currency,
    p_evidence_path: parsed.data.evidencePath,
    p_reconciliation_id: parsed.data.reconciliationId,
  });
  if (error) return failed(correlationId);
  refreshOrder(locale, parsed.data.orderId);
  return commandSuccess({ id: data.id }, correlationId);
}

export async function createShipmentAction(
  formData: FormData,
): Promise<OperationResult> {
  const correlationId = randomUUID();
  const locale = String(formData.get("locale") ?? "en");
  const parsed = shipmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(correlationId);
  const client = await managerCommandClient("orders.shipment-create");
  const { data, error } = await client.rpc("create_shipment", {
    p_order_id: parsed.data.orderId,
    p_expected_version: parsed.data.expectedVersion,
    p_carrier: parsed.data.carrier,
    p_service_level: parsed.data.serviceLevel,
    p_tracking_reference: parsed.data.trackingReference,
    p_tracking_url: parsed.data.trackingUrl ?? "",
    p_idempotency_key: parsed.data.idempotencyKey,
  });
  if (error) return failed(correlationId, error.code === "40001");
  refreshOrder(locale, parsed.data.orderId);
  return commandSuccess({ id: data.id }, correlationId);
}

export async function recordDeliveryAction(
  formData: FormData,
): Promise<OperationResult> {
  const correlationId = randomUUID();
  const locale = String(formData.get("locale") ?? "en");
  const orderId = String(formData.get("orderId") ?? "");
  const parsed = deliverySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(correlationId);
  const client = await managerCommandClient("orders.delivery-record");
  const { data, error } = await client.rpc("record_delivery_event", {
    p_fulfillment_id: parsed.data.fulfillmentId,
    p_event_key: parsed.data.eventKey,
    p_safe_location: parsed.data.safeLocation,
  });
  if (error) return failed(correlationId);
  refreshOrder(locale, orderId);
  return commandSuccess({ id: data.id }, correlationId);
}

export async function issueRefundAction(
  formData: FormData,
): Promise<OperationResult> {
  const correlationId = randomUUID();
  const locale = String(formData.get("locale") ?? "en");
  const parsed = refundSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(correlationId);
  const client = await managerCommandClient("orders.refund");
  const { data: attempt, error: paymentError } = await client
    .from("payment_attempts")
    .select("method,provider,provider_reference,currency")
    .eq("order_id", parsed.data.orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (paymentError || !attempt) return failed(correlationId);
  let providerReference = parsed.data.providerReference;
  if (attempt.method === "hosted_payment") {
    if (!attempt.provider_reference) return failed(correlationId);
    try {
      const provider = createPaymentProvider();
      if (provider.name !== attempt.provider)
        return failed(correlationId, true);
      const refund = await provider.refundPayment({
        providerReference: attempt.provider_reference,
        amountMinor: parsed.data.amountMinor,
        currency: attempt.currency,
        idempotencyKey: parsed.data.idempotencyKey,
      });
      if (refund.state !== "succeeded") return failed(correlationId, true);
      providerReference = refund.refundReference;
    } catch {
      return failed(correlationId, true);
    }
  }
  if (providerReference.length < 2) return invalid(correlationId);
  const { data, error } = await client.rpc("issue_refund", {
    p_order_id: parsed.data.orderId,
    p_amount_minor: parsed.data.amountMinor,
    p_reason: parsed.data.reason,
    p_idempotency_key: parsed.data.idempotencyKey,
    p_provider_reference: providerReference,
  });
  if (error) return failed(correlationId);
  refreshOrder(locale, parsed.data.orderId);
  return commandSuccess({ id: data.id }, correlationId);
}

export async function addOrderNoteAction(
  formData: FormData,
): Promise<OperationResult> {
  const correlationId = randomUUID();
  const locale = String(formData.get("locale") ?? "en");
  const parsed = orderNoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(correlationId);
  const client = await managerCommandClient("orders.note-add");
  const { data, error } = await client.rpc("add_order_note", {
    p_order_id: parsed.data.orderId,
    p_note: parsed.data.note,
  });
  if (error) return failed(correlationId);
  refreshOrder(locale, parsed.data.orderId);
  return commandSuccess({ id: data.id }, correlationId);
}

export async function retryNotificationAction(
  formData: FormData,
): Promise<OperationResult> {
  const correlationId = randomUUID();
  const parsed = retryNotificationSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) return invalid(correlationId);
  const client = await managerCommandClient("orders.notification-retry");
  const { data, error } = await client.rpc("retry_notification", {
    p_notification_id: parsed.data.notificationId,
  });
  if (error) return failed(correlationId);
  return commandSuccess({ id: data.id }, correlationId);
}

export async function transitionOrderFormAction(formData: FormData) {
  await transitionOrderAction(formData);
}

export async function reviewTransferFormAction(formData: FormData) {
  await reviewTransferAction(formData);
}

export async function createShipmentFormAction(formData: FormData) {
  await createShipmentAction(formData);
}

export async function recordDeliveryFormAction(formData: FormData) {
  await recordDeliveryAction(formData);
}

export async function issueRefundFormAction(formData: FormData) {
  await issueRefundAction(formData);
}

export async function addOrderNoteFormAction(formData: FormData) {
  await addOrderNoteAction(formData);
}

export async function retryNotificationFormAction(formData: FormData) {
  await retryNotificationAction(formData);
}
