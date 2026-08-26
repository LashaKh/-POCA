import "server-only";

import { cookies } from "next/headers";

import { readGuestSecretHash } from "@/features/cart/guest";
import { getBankTransferMethod } from "@/features/payments/bank-transfer";
import type { AppLocale } from "@/i18n/routing";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { isOpaqueToken, orderProofCookieName, sha256 } from "./guest-proof";

export async function getGuestOrder(reference: string, locale: AppLocale) {
  if (!/^EPO-[A-Z0-9]{12}$/.test(reference)) return undefined;
  const client = createServiceSupabaseClient();
  const { data: order, error } = await client
    .from("orders")
    .select("*")
    .eq("reference", reference)
    .maybeSingle();
  if (error) throw error;
  if (!order) return undefined;

  const [secretHash, proof] = await Promise.all([
    readGuestSecretHash(),
    cookies().then(
      (store) => store.get(orderProofCookieName(reference))?.value,
    ),
  ]);
  const ownershipChecks: PromiseLike<boolean>[] = [];
  if (secretHash && order.guest_session_id) {
    ownershipChecks.push(
      client
        .from("guest_sessions")
        .select("id")
        .eq("id", order.guest_session_id)
        .eq("secret_hash", secretHash)
        .is("revoked_at", null)
        .maybeSingle()
        .then(({ data, error: guestError }) => {
          if (guestError) throw guestError;
          return Boolean(data);
        }),
    );
  }
  if (isOpaqueToken(proof)) {
    ownershipChecks.push(
      client
        .rpc("verify_guest_order_proof", {
          p_reference: reference,
          p_proof_hash: sha256(proof),
        })
        .then(({ data, error: proofError }) => {
          if (proofError) throw proofError;
          return data;
        }),
    );
  }
  if (!(await Promise.all(ownershipChecks)).some(Boolean)) return undefined;

  const [linesResult, addressResult, paymentResult, bankTransfer] =
    await Promise.all([
      client
        .from("order_lines")
        .select("*")
        .eq("order_id", order.id)
        .order("id"),
      client
        .from("order_addresses")
        .select("*")
        .eq("order_id", order.id)
        .eq("address_type", "delivery")
        .maybeSingle(),
      client
        .from("payment_attempts")
        .select("*")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      getBankTransferMethod(locale),
    ]);
  if (linesResult.error) throw linesResult.error;
  if (addressResult.error) throw addressResult.error;
  if (paymentResult.error) throw paymentResult.error;
  return {
    order,
    lines: linesResult.data,
    address: addressResult.data,
    payment: paymentResult.data,
    bankTransfer,
  };
}

export async function getViewerOrder(reference: string, locale: AppLocale) {
  if (!/^EPO-[A-Z0-9]{12}$/.test(reference)) return undefined;
  const client = await createServerSupabaseClient();
  const { data: order, error } = await client
    .from("orders")
    .select("*")
    .eq("reference", reference)
    .maybeSingle();
  if (error) throw error;
  if (!order) return getGuestOrder(reference, locale);

  const [linesResult, addressResult, paymentResult, bankTransfer] =
    await Promise.all([
      client
        .from("order_lines")
        .select("*")
        .eq("order_id", order.id)
        .order("id"),
      client
        .from("order_addresses")
        .select("*")
        .eq("order_id", order.id)
        .eq("address_type", "delivery")
        .maybeSingle(),
      client
        .from("payment_attempts")
        .select("*")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      getBankTransferMethod(locale),
    ]);
  if (linesResult.error) throw linesResult.error;
  if (addressResult.error) throw addressResult.error;
  if (paymentResult.error) throw paymentResult.error;
  return {
    order,
    lines: linesResult.data,
    address: addressResult.data,
    payment: paymentResult.data,
    bankTransfer,
  };
}
