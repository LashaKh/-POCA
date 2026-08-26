"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { ensureGuestContext } from "@/features/cart/guest";
import { getCustomerContext } from "@/features/customer/context";
import { getEffectiveCurrencyPreference } from "@/features/preferences/currency";
import { logger } from "@/lib/observability/logger";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import {
  commandFailure,
  commandSuccess,
  type CommandResult,
} from "@/lib/validation/command-result";

import { wishlistToggleSchema } from "./schema";

export type WishlistActionState = CommandResult<{ saved: boolean }> | undefined;

export async function toggleWishlistAction(
  _previous: WishlistActionState,
  formData: FormData,
): Promise<WishlistActionState> {
  const correlationId = randomUUID();
  const parsed = wishlistToggleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return commandFailure(
      {
        code: "INVALID_INPUT",
        messageKey: "wishlist.actionFailed",
        retryable: false,
      },
      correlationId,
    );
  }
  try {
    const { client, context } = await getCustomerContext();
    let saved: boolean;
    if (context.kind === "customer") {
      const result = await client.rpc("toggle_customer_wishlist_item", {
        p_product_id: parsed.data.productId,
      });
      if (result.error) throw result.error;
      saved = result.data;
    } else {
      const currency = await getEffectiveCurrencyPreference();
      const guest = await ensureGuestContext(parsed.data.locale, currency);
      const service = createServiceSupabaseClient();
      const result = await service.rpc("toggle_guest_wishlist_item", {
        p_secret_hash: guest.secretHash,
        p_product_id: parsed.data.productId,
      });
      if (result.error) throw result.error;
      saved = result.data;
    }
    logger.info({
      correlationId,
      event: "wishlist.toggle",
      actorClass: context.kind === "customer" ? "customer" : "guest",
      outcome: "succeeded",
      metadata: { productId: parsed.data.productId, saved },
    });
    revalidatePath("/", "layout");
    return commandSuccess({ saved }, correlationId);
  } catch {
    return commandFailure(
      {
        code: "INTERNAL_ERROR",
        messageKey: "wishlist.actionFailed",
        retryable: true,
      },
      correlationId,
    );
  }
}
