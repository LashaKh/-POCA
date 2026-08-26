"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { managerCommandClient } from "@/features/auth/admin-command";
import {
  commandFailure,
  commandSuccess,
  type CommandResult,
} from "@/lib/validation/command-result";

import { promotionSchema } from "./schema";

export type PromotionActionState = CommandResult<{ id: string }> | undefined;

const optionalNumber = (value: FormDataEntryValue | null) => {
  const text = String(value ?? "").trim();
  return text ? Number(text) : undefined;
};

export async function savePromotionAction(
  _previous: PromotionActionState,
  formData: FormData,
): Promise<PromotionActionState> {
  const correlationId = randomUUID();
  const parsed = promotionSchema.safeParse({
    ...Object.fromEntries(formData),
    percentageBasisPoints: optionalNumber(
      formData.get("percentageBasisPoints"),
    ),
    fixedAmountMinor: optionalNumber(formData.get("fixedAmountMinor")),
    maximumDiscountMinor: optionalNumber(formData.get("maximumDiscountMinor")),
    usageLimit: optionalNumber(formData.get("usageLimit")),
  });
  if (!parsed.success) {
    return commandFailure(
      {
        code: "INVALID_INPUT",
        messageKey: "admin.worldwide.errors.failed",
        retryable: false,
      },
      correlationId,
    );
  }
  const value = parsed.data;
  const client = await managerCommandClient("commerce.promotion.configure");
  const result = await client.rpc("configure_promotion", {
    p_discount_id: value.discountId || undefined,
    p_code: value.code,
    p_kind: value.kind,
    p_percentage_basis_points:
      value.kind === "percentage" ? value.percentageBasisPoints : undefined,
    p_fixed_amount_minor:
      value.kind === "fixed" ? value.fixedAmountMinor : undefined,
    p_currency:
      value.kind === "fixed" ? value.currency || undefined : undefined,
    p_minimum_subtotal_minor: value.minimumSubtotalMinor,
    p_maximum_discount_minor: value.maximumDiscountMinor,
    p_usage_limit: value.usageLimit,
    p_per_subject_limit: value.perSubjectLimit,
    p_starts_at: value.startsAt,
    p_ends_at: value.endsAt,
    p_combinability: value.combinability,
    p_stacking_group: value.stackingGroup,
    p_priority: value.priority,
    p_public_name_i18n: {
      ka: value.publicNameKa,
      en: value.publicNameEn,
      de: value.publicNameDe,
      ru: value.publicNameRu,
    },
    p_description_i18n: {
      ka: value.descriptionKa ?? "",
      en: value.descriptionEn ?? "",
      de: value.descriptionDe ?? "",
      ru: value.descriptionRu ?? "",
    },
    p_configuration_status: value.configurationStatus,
    p_expected_version: value.expectedVersion,
    p_reason: value.reason,
  });
  if (result.error) {
    return commandFailure(
      {
        code:
          result.error.code === "40001" ? "VERSION_CONFLICT" : "INVALID_INPUT",
        messageKey: "admin.worldwide.errors.failed",
        retryable: result.error.code === "40001",
      },
      correlationId,
    );
  }
  revalidatePath(`/${value.locale}/admin/promotions`);
  revalidatePath(`/${value.locale}/cart`);
  return commandSuccess({ id: result.data.id }, correlationId);
}
