"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { managerCommandClient } from "@/features/auth/admin-command";
import { checkbox } from "@/features/pricing/schema";
import {
  commandFailure,
  commandSuccess,
  type CommandResult,
} from "@/lib/validation/command-result";

import {
  marketSettingSchema,
  shippingMethodSchema,
  shippingRateSchema,
  shippingZoneSchema,
} from "./schema";

export type DeliveryActionState = CommandResult<{ changed: true }> | undefined;

const optionalNumber = (value: FormDataEntryValue | null) => {
  const text = String(value ?? "").trim();
  return text ? Number(text) : undefined;
};

function failure(correlationId: string, conflict = false) {
  return commandFailure(
    {
      code: conflict ? "VERSION_CONFLICT" : "INVALID_INPUT",
      messageKey: "admin.worldwide.errors.failed",
      retryable: conflict,
    },
    correlationId,
  );
}

function localized(formData: FormData, prefix: string) {
  return {
    ka: String(formData.get(`${prefix}Ka`) ?? ""),
    en: String(formData.get(`${prefix}En`) ?? ""),
    de: String(formData.get(`${prefix}De`) ?? ""),
    ru: String(formData.get(`${prefix}Ru`) ?? ""),
  };
}

export async function saveShippingZoneAction(
  _previous: DeliveryActionState,
  formData: FormData,
): Promise<DeliveryActionState> {
  const correlationId = randomUUID();
  const parsed = shippingZoneSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure(correlationId);
  const client = await managerCommandClient("commerce.delivery.zone.configure");
  const result = await client.rpc("configure_shipping_zone", {
    p_zone_id: parsed.data.zoneId || undefined,
    p_code: parsed.data.code,
    p_name: parsed.data.name,
    p_priority: parsed.data.priority,
    p_country_codes: parsed.data.countryCodes,
    p_configuration_status: parsed.data.configurationStatus,
    p_legal_status: parsed.data.legalStatus,
    p_expected_version: parsed.data.expectedVersion,
    p_reason: parsed.data.reason,
  });
  if (result.error)
    return failure(correlationId, result.error.code === "40001");
  revalidatePath(`/${parsed.data.locale}/admin/settings/delivery`);
  return commandSuccess({ changed: true }, correlationId);
}

export async function saveShippingMethodAction(
  _previous: DeliveryActionState,
  formData: FormData,
): Promise<DeliveryActionState> {
  const correlationId = randomUUID();
  const parsed = shippingMethodSchema.safeParse({
    ...Object.fromEntries(formData),
    name: localized(formData, "name"),
    serviceLevel: localized(formData, "serviceLevel"),
    customs: localized(formData, "customs"),
    manualQuote: checkbox(formData.get("manualQuote")),
  });
  if (!parsed.success) return failure(correlationId);
  const client = await managerCommandClient(
    "commerce.delivery.method.configure",
  );
  const result = await client.rpc("configure_shipping_method", {
    p_method_id: parsed.data.methodId || undefined,
    p_code: parsed.data.code,
    p_name_i18n: parsed.data.name,
    p_service_level_i18n: parsed.data.serviceLevel,
    p_customs_copy_i18n: parsed.data.customs,
    p_estimate_min_days: parsed.data.estimateMinDays,
    p_estimate_max_days: parsed.data.estimateMaxDays,
    p_manual_quote: parsed.data.manualQuote,
    p_configuration_status: parsed.data.configurationStatus,
    p_expected_version: parsed.data.expectedVersion,
    p_reason: parsed.data.reason,
  });
  if (result.error)
    return failure(correlationId, result.error.code === "40001");
  revalidatePath(`/${parsed.data.locale}/admin/settings/delivery`);
  return commandSuccess({ changed: true }, correlationId);
}

export async function saveShippingRateAction(
  _previous: DeliveryActionState,
  formData: FormData,
): Promise<DeliveryActionState> {
  const correlationId = randomUUID();
  const parsed = shippingRateSchema.safeParse({
    ...Object.fromEntries(formData),
    freeThresholdMinor: optionalNumber(formData.get("freeThresholdMinor")),
    maximumSubtotalMinor: optionalNumber(formData.get("maximumSubtotalMinor")),
    enabled: checkbox(formData.get("enabled")),
  });
  if (!parsed.success) return failure(correlationId);
  const client = await managerCommandClient("commerce.delivery.rate.configure");
  const result = await client.rpc("configure_shipping_rate", {
    p_rate_id: parsed.data.rateId || undefined,
    p_zone_id: parsed.data.zoneId,
    p_method_id: parsed.data.methodId,
    p_currency: parsed.data.currency,
    p_amount_minor: parsed.data.amountMinor,
    p_free_threshold_minor: parsed.data.freeThresholdMinor,
    p_minimum_subtotal_minor: parsed.data.minimumSubtotalMinor,
    p_maximum_subtotal_minor: parsed.data.maximumSubtotalMinor,
    p_delivery_classes: parsed.data.deliveryClasses,
    p_priority: parsed.data.priority,
    p_starts_at: parsed.data.startsAt,
    p_ends_at: parsed.data.endsAt,
    p_enabled: parsed.data.enabled,
    p_expected_version: parsed.data.expectedVersion,
    p_reason: parsed.data.reason,
  });
  if (result.error)
    return failure(correlationId, result.error.code === "40001");
  revalidatePath(`/${parsed.data.locale}/admin/settings/delivery`);
  revalidatePath(`/${parsed.data.locale}/cart`);
  return commandSuccess({ changed: true }, correlationId);
}

export async function saveMarketSettingAction(
  _previous: DeliveryActionState,
  formData: FormData,
): Promise<DeliveryActionState> {
  const correlationId = randomUUID();
  const parsed = marketSettingSchema.safeParse({
    ...Object.fromEntries(formData),
    customs: localized(formData, "customs"),
    enabled: checkbox(formData.get("enabled")),
  });
  if (!parsed.success) return failure(correlationId);
  const client = await managerCommandClient("commerce.market.configure");
  const result = await client.rpc("configure_market_setting", {
    p_market_code: parsed.data.marketCode,
    p_country_code: parsed.data.countryCode,
    p_default_currency: parsed.data.defaultCurrency,
    p_tax_display_mode: parsed.data.taxDisplayMode,
    p_tax_registration_reference: parsed.data.taxRegistrationReference ?? "",
    p_customs_responsibility: parsed.data.customsResponsibility,
    p_customs_copy_i18n: parsed.data.customs,
    p_legal_status: parsed.data.legalStatus,
    p_enabled: parsed.data.enabled,
    p_expected_version: parsed.data.expectedVersion,
    p_reason: parsed.data.reason,
  });
  if (result.error)
    return failure(correlationId, result.error.code === "40001");
  revalidatePath(`/${parsed.data.locale}/admin/settings/markets`);
  revalidatePath("/", "layout");
  return commandSuccess({ changed: true }, correlationId);
}
