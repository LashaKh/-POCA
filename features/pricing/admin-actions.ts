"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { managerCommandClient } from "@/features/auth/admin-command";
import {
  commandFailure,
  commandSuccess,
  type CommandResult,
} from "@/lib/validation/command-result";

import { checkbox, currencySettingSchema, marketPriceSchema } from "./schema";

export type PricingActionState = CommandResult<{ changed: true }> | undefined;

function failure(correlationId: string, conflict = false) {
  return commandFailure(
    {
      code: conflict ? "VERSION_CONFLICT" : "INVALID_INPUT",
      messageKey: conflict
        ? "admin.worldwide.errors.conflict"
        : "admin.worldwide.errors.failed",
      retryable: conflict,
    },
    correlationId,
  );
}

export async function configureCurrencyAction(
  _previous: PricingActionState,
  formData: FormData,
): Promise<PricingActionState> {
  const correlationId = randomUUID();
  const parsed = currencySettingSchema.safeParse({
    ...Object.fromEntries(formData),
    enabled: checkbox(formData.get("enabled")),
    checkoutEnabled: checkbox(formData.get("checkoutEnabled")),
    isDefault: checkbox(formData.get("isDefault")),
  });
  if (!parsed.success) return failure(correlationId);
  const client = await managerCommandClient("commerce.currency.configure");
  const result = await client.rpc("configure_currency_setting", {
    p_currency: parsed.data.currency,
    p_enabled: parsed.data.enabled,
    p_checkout_enabled: parsed.data.checkoutEnabled,
    p_is_default: parsed.data.isDefault,
    p_display_order: parsed.data.displayOrder,
    p_price_source_mode: parsed.data.priceSourceMode,
    p_approved_rate_reference: parsed.data.approvedRateReference ?? "",
    p_configuration_status: parsed.data.configurationStatus,
    p_expected_version: parsed.data.expectedVersion,
    p_reason: parsed.data.reason,
  });
  if (result.error) {
    return failure(
      correlationId,
      result.error.code === "40001" ||
        result.error.message.includes("VERSION_CONFLICT"),
    );
  }
  revalidatePath(`/${parsed.data.locale}/admin/settings/currencies`);
  revalidatePath("/", "layout");
  return commandSuccess({ changed: true }, correlationId);
}

export async function saveMarketPriceAction(
  _previous: PricingActionState,
  formData: FormData,
): Promise<PricingActionState> {
  const correlationId = randomUUID();
  const parsed = marketPriceSchema.safeParse({
    ...Object.fromEntries(formData),
    enabled: checkbox(formData.get("enabled")),
  });
  if (!parsed.success) return failure(correlationId);
  const client = await managerCommandClient("commerce.price.configure");
  const result = await client.rpc("save_product_market_price", {
    p_product_id: parsed.data.productId,
    p_currency: parsed.data.currency,
    p_market_code: parsed.data.marketCode || undefined,
    p_amount_minor: parsed.data.amountMinor,
    p_active_from: parsed.data.activeFrom,
    p_active_until: parsed.data.activeUntil,
    p_enabled: parsed.data.enabled,
    p_source: parsed.data.source,
    p_source_reference: parsed.data.sourceReference ?? "",
    p_expected_version: parsed.data.expectedVersion,
    p_reason: parsed.data.reason,
  });
  if (result.error) {
    return failure(
      correlationId,
      result.error.code === "40001" ||
        result.error.message.includes("VERSION_CONFLICT"),
    );
  }
  revalidatePath(`/${parsed.data.locale}/admin/settings/currencies`);
  revalidatePath("/", "layout");
  return commandSuccess({ changed: true }, correlationId);
}
