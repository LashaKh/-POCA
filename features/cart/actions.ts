"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { getEffectiveCurrencyPreference } from "@/features/preferences/currency";
import {
  commandFailure,
  commandSuccess,
  type CommandResult,
} from "@/lib/validation/command-result";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { getErrorMessage } from "@/lib/validation/error";
import { getCustomerContext } from "@/features/customer/context";
import { syncCurrentCustomerCart } from "@/features/wishlist/merge";

import { ensureGuestContext, readGuestSecretHash } from "./guest";
import {
  addCartItemSchema,
  discountCodeSchema,
  updateCartItemSchema,
} from "./schema";

export type CartActionState = CommandResult<{ changed: true }> | undefined;

function failure(correlationId: string, message: string): CartActionState {
  const stock = message.includes("INSUFFICIENT_STOCK");
  return commandFailure(
    {
      code: stock ? "STOCK_CHANGED" : "INVALID_INPUT",
      messageKey: stock ? "cart.stockChanged" : "cart.actionFailed",
      retryable: stock,
    },
    correlationId,
  );
}

async function syncSignedInCart() {
  const { context } = await getCustomerContext();
  if (context.kind === "customer") {
    await syncCurrentCustomerCart(context.profileId);
  }
}

export async function addToCartAction(
  _previous: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const correlationId = randomUUID();
  const parsed = addCartItemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(correlationId, "INVALID_INPUT");
  try {
    const currency = await getEffectiveCurrencyPreference();
    const { secretHash } = await ensureGuestContext(
      parsed.data.locale,
      currency,
    );
    const client = createServiceSupabaseClient();
    const { error } = await client.rpc("add_guest_cart_item", {
      p_secret_hash: secretHash,
      p_product_id: parsed.data.productId,
      p_quantity: parsed.data.quantity,
    });
    if (error) throw error;
    await syncSignedInCart();
    revalidatePath("/", "layout");
    return commandSuccess({ changed: true }, correlationId);
  } catch (error) {
    return failure(correlationId, getErrorMessage(error, "INTERNAL_ERROR"));
  }
}

export async function updateCartItemAction(
  _previous: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const correlationId = randomUUID();
  const parsed = updateCartItemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(correlationId, "INVALID_INPUT");
  const secretHash = await readGuestSecretHash();
  if (!secretHash) return failure(correlationId, "CART_NOT_FOUND");
  try {
    const client = createServiceSupabaseClient();
    const { error } = await client.rpc("set_guest_cart_item_quantity", {
      p_secret_hash: secretHash,
      p_item_id: parsed.data.itemId,
      p_quantity: parsed.data.quantity,
    });
    if (error) throw error;
    await syncSignedInCart();
    revalidatePath(`/${parsed.data.locale}/cart`);
    revalidatePath("/", "layout");
    return commandSuccess({ changed: true }, correlationId);
  } catch (error) {
    return failure(correlationId, getErrorMessage(error, "INTERNAL_ERROR"));
  }
}

export async function applyDiscountAction(
  _previous: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const correlationId = randomUUID();
  const parsed = discountCodeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(correlationId, "INVALID_INPUT");
  const secretHash = await readGuestSecretHash();
  if (!secretHash) return failure(correlationId, "CART_NOT_FOUND");
  try {
    const client = createServiceSupabaseClient();
    const { error } = await client.rpc("apply_guest_cart_discount", {
      p_secret_hash: secretHash,
      p_code: parsed.data.code,
    });
    if (error) throw error;
    await syncSignedInCart();
    revalidatePath(`/${parsed.data.locale}/cart`);
    return commandSuccess({ changed: true }, correlationId);
  } catch (error) {
    return failure(correlationId, getErrorMessage(error, "INTERNAL_ERROR"));
  }
}
