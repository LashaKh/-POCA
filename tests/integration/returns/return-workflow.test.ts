import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";
import {
  createBankTransferOrder,
  createManager,
  localEnvironment,
} from "@/tests/support/order-operations";

const local = (() => {
  try {
    return localEnvironment();
  } catch {
    return undefined;
  }
})();

async function makeDelivered(
  service: ReturnType<typeof createClient<Database>>,
  order: { id: string; productId: string },
  suffix: string,
) {
  const updates = await Promise.all([
    service
      .from("orders")
      .update({ status: "delivered", payment_status: "paid" })
      .eq("id", order.id),
    service
      .from("payment_attempts")
      .update({ status: "paid" })
      .eq("order_id", order.id),
    service
      .from("inventory_items")
      .update({ on_hand_quantity: 0, reserved_quantity: 0 })
      .eq("product_id", order.productId),
    service
      .from("inventory_reservations")
      .update({
        status: "converted",
        converted_at: new Date().toISOString(),
        order_id: order.id,
      })
      .eq("product_id", order.productId),
  ]);
  for (const update of updates) expect(update.error).toBeNull();
  const fulfillment = await service.from("fulfillments").insert({
    order_id: order.id,
    status: "delivered",
    carrier: "Integration Return Carrier",
    service_level: "Tracked",
    tracking_reference: `RETURN-${suffix}`,
    dispatched_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    delivered_at: new Date(Date.now() - 86_400_000).toISOString(),
  });
  expect(fulfillment.error).toBeNull();
}

describe.skipIf(!local)("local return workflow", () => {
  it("keeps guest/account evidence private and applies staff refund/restock effects once", async () => {
    const service = createClient<Database>(
      local!.API_URL,
      local!.SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const marker = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
    const managerIdentity = await createManager(service, `Return-${marker}`);
    const manager = createClient<Database>(
      local!.API_URL,
      local!.PUBLISHABLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    expect(
      (
        await manager.auth.signInWithPassword({
          email: managerIdentity.email,
          password: managerIdentity.password,
        })
      ).error,
    ).toBeNull();

    const guestOrder = await createBankTransferOrder(
      service,
      `Guest return ${marker}`,
    );
    await makeDelivered(service, guestOrder, `${marker}-GUEST`);
    const guestLine = await service
      .from("order_lines")
      .select("id")
      .eq("order_id", guestOrder.id)
      .single();
    expect(guestLine.error).toBeNull();

    const deniedGuest = await service.rpc("submit_return_request", {
      p_order_id: guestOrder.id,
      p_request_kind: "return",
      p_reason_code: "damaged",
      p_buyer_note: "Wrong proof cannot own this request.",
      p_line_items: [{ lineId: guestLine.data!.id, quantity: 1 }],
      p_idempotency_key_hash: "1".repeat(64),
      p_guest_proof_hash: "9".repeat(64),
    });
    expect(deniedGuest.error?.code).toBe("42501");

    const submitted = await service.rpc("submit_return_request", {
      p_order_id: guestOrder.id,
      p_request_kind: "return",
      p_reason_code: "damaged",
      p_buyer_note: "The edge arrived damaged.",
      p_line_items: [{ lineId: guestLine.data!.id, quantity: 1 }],
      p_idempotency_key_hash: "2".repeat(64),
      p_guest_proof_hash: guestOrder.guestProofHash,
    });
    expect(submitted.error).toBeNull();
    expect(submitted.data!.reference).toMatch(/^RET-[A-Z0-9]{12}$/);

    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x01]);
    const evidencePath = `${submitted.data!.id}/integration-${marker}.jpg`;
    expect(
      (
        await service.storage
          .from("return-evidence")
          .upload(evidencePath, jpeg, {
            contentType: "image/jpeg",
            upsert: false,
          })
      ).error,
    ).toBeNull();
    const attached = await service.rpc("attach_return_evidence", {
      p_return_request_id: submitted.data!.id,
      p_storage_path: evidencePath,
      p_original_filename: "damage.jpg",
      p_content_type: "image/jpeg",
      p_byte_size: jpeg.byteLength,
      p_checksum: "3".repeat(64),
      p_guest_proof_hash: guestOrder.guestProofHash,
    });
    expect(attached.error).toBeNull();
    const invalidType = await service.rpc("attach_return_evidence", {
      p_return_request_id: submitted.data!.id,
      p_storage_path: `${submitted.data!.id}/unsafe.pdf`,
      p_original_filename: "unsafe.pdf",
      p_content_type: "application/pdf",
      p_byte_size: 100,
      p_checksum: "4".repeat(64),
      p_guest_proof_hash: guestOrder.guestProofHash,
    });
    expect(invalidType.error?.code).toBe("22023");
    const signed = await service.storage
      .from("return-evidence")
      .createSignedUrl(evidencePath, 60);
    expect(signed.error).toBeNull();

    const otherCreated = await service.auth.admin.createUser({
      email: `other-return-${marker}@epoca.test`,
      password: `Other-${marker}-Secure-2026!`,
      email_confirm: true,
    });
    expect(otherCreated.error).toBeNull();
    if (!otherCreated.data.user) throw new Error("OTHER_USER_NOT_CREATED");
    const other = createClient<Database>(
      local!.API_URL,
      local!.PUBLISHABLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    expect(
      (
        await other.auth.signInWithPassword({
          email: otherCreated.data.user.email!,
          password: `Other-${marker}-Secure-2026!`,
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await other.rpc("initialize_customer_profile", {
          p_display_name: "Other return customer",
          p_locale: "en",
          p_currency: "GEL",
        })
      ).error,
    ).toBeNull();
    const crossUser = await other
      .from("return_requests")
      .select("id")
      .eq("id", submitted.data!.id);
    expect(crossUser.error).toBeNull();
    expect(crossUser.data).toEqual([]);
    const directObject = await other.storage
      .from("return-evidence")
      .download(evidencePath);
    expect(directObject.error).not.toBeNull();

    const information = await manager.rpc("request_return_information", {
      p_return_request_id: submitted.data!.id,
      p_expected_version: submitted.data!.version,
      p_message: "Please confirm the packaging condition.",
      p_idempotency_key: `return-info-${marker}`,
    });
    expect(information.error).toBeNull();
    const approved = await manager.rpc("decide_return_request", {
      p_return_request_id: submitted.data!.id,
      p_expected_version: information.data!.version,
      p_approve: true,
      p_reason: "Damage is covered by the recorded policy.",
      p_idempotency_key: `return-approve-${marker}`,
    });
    expect(approved.error).toBeNull();
    const received = await manager.rpc("record_return_receipt", {
      p_return_request_id: submitted.data!.id,
      p_expected_version: approved.data!.version,
      p_note: "Package received intact.",
      p_idempotency_key: `return-receive-${marker}`,
    });
    expect(received.error).toBeNull();
    const returnItem = await manager
      .from("return_items")
      .select("id")
      .eq("return_request_id", submitted.data!.id)
      .single();
    const inspected = await manager.rpc("inspect_return_request", {
      p_return_request_id: submitted.data!.id,
      p_expected_version: received.data!.version,
      p_summary: "Edge damage confirmed and repairable.",
      p_package_condition: "Intact",
      p_items: [
        {
          itemId: returnItem.data!.id,
          condition: "damaged",
          restockDecision: "restock",
          refundAmountMinor: 50_000,
          note: "Partial refund approved.",
        },
      ],
      p_idempotency_key: `return-inspect-${marker}`,
    });
    expect(inspected.error).toBeNull();
    const refunded = await manager.rpc("process_return_refund", {
      p_return_request_id: submitted.data!.id,
      p_expected_version: inspected.data!.version,
      p_reason: "Inspected return refund",
      p_idempotency_key: `return-refund-${marker}`,
      p_provider_reference: `REFUND-${marker}`,
    });
    expect(refunded.error).toBeNull();
    expect(
      (
        await manager.rpc("process_return_refund", {
          p_return_request_id: submitted.data!.id,
          p_expected_version: refunded.data!.version,
          p_reason: "Inspected return refund",
          p_idempotency_key: `return-refund-${marker}`,
          p_provider_reference: `REFUND-${marker}`,
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await manager.rpc("apply_return_restock", {
          p_return_request_id: submitted.data!.id,
          p_idempotency_key: `return-restock-${marker}`,
        })
      ).data,
    ).toBe(1);
    expect(
      (
        await manager.rpc("apply_return_restock", {
          p_return_request_id: submitted.data!.id,
          p_idempotency_key: `return-restock-${marker}`,
        })
      ).data,
    ).toBe(0);
    const effects = await service
      .from("return_requests")
      .select("status,return_refund_links(id),return_restock_links(id)")
      .eq("id", submitted.data!.id)
      .single();
    expect(effects.data).toMatchObject({ status: "refunded" });
    expect(effects.data!.return_refund_links).toHaveLength(1);
    expect(effects.data!.return_restock_links).toHaveLength(1);

    const claimed = await service.rpc("claim_notification_outbox", {
      p_worker_id: `return-worker-${marker}`,
      p_claim_limit: 1,
      p_lease_seconds: 120,
    });
    expect(claimed.error).toBeNull();
    const claimedNotifications = claimed.data ?? [];
    if (claimedNotifications.length) {
      expect(
        (
          await service.rpc("complete_notification_attempt", {
            p_notification_id: claimedNotifications[0].id,
            p_worker_id: `return-worker-${marker}`,
            p_provider: "fixture",
            p_outcome: "failed",
            p_provider_reference: undefined,
            p_safe_error_code: "SIMULATED_FAILURE",
          })
        ).error,
      ).toBeNull();
    }
    expect(
      (
        await service
          .from("return_requests")
          .select("status")
          .eq("id", submitted.data!.id)
          .single()
      ).data?.status,
    ).toBe("refunded");

    const accountCreated = await service.auth.admin.createUser({
      email: `account-return-${marker}@epoca.test`,
      password: `Account-${marker}-Secure-2026!`,
      email_confirm: true,
    });
    expect(accountCreated.error).toBeNull();
    if (!accountCreated.data.user) throw new Error("ACCOUNT_USER_NOT_CREATED");
    const account = createClient<Database>(
      local!.API_URL,
      local!.PUBLISHABLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    expect(
      (
        await account.auth.signInWithPassword({
          email: accountCreated.data.user.email!,
          password: `Account-${marker}-Secure-2026!`,
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await account.rpc("initialize_customer_profile", {
          p_display_name: "Account return customer",
          p_locale: "en",
          p_currency: "GEL",
        })
      ).error,
    ).toBeNull();
    const accountOrder = await createBankTransferOrder(
      service,
      `Account return ${marker}`,
    );
    const merged = await service.rpc("merge_customer_guest_data", {
      p_secret_hash: accountOrder.secretHash,
      p_new_secret_hash: marker.padEnd(64, "6"),
      p_customer_profile_id: accountCreated.data.user.id,
      p_idempotency_key_hash: marker.padEnd(64, "7"),
    });
    expect(merged.error).toBeNull();
    expect(merged.data).toMatchObject({ ordersClaimed: 1 });
    await makeDelivered(service, accountOrder, `${marker}-ACCOUNT`);
    const accountLine = await account
      .from("order_lines")
      .select("id")
      .eq("order_id", accountOrder.id)
      .single();
    const accountReturn = await account.rpc("submit_return_request", {
      p_order_id: accountOrder.id,
      p_request_kind: "return",
      p_reason_code: "not_as_described",
      p_buyer_note: "Account-owned return request.",
      p_line_items: [{ lineId: accountLine.data!.id, quantity: 1 }],
      p_idempotency_key_hash: "5".repeat(64),
      p_guest_proof_hash: undefined,
    });
    expect(accountReturn.error).toBeNull();
    expect(
      (
        await account
          .from("return_requests")
          .select("id")
          .eq("id", accountReturn.data!.id)
      ).data,
    ).toHaveLength(1);
  }, 30_000);
});
