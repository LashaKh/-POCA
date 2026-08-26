import "server-only";

import { z } from "zod";

import type { AppLocale } from "@/i18n/routing";
import { getServerEnvironment } from "@/lib/env/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

const bankTransferSettingSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(["fixture", "live", "disabled"]),
  deadlineDays: z.int().min(1).max(30),
  beneficiary: z.string().min(1).max(160),
  bank: z.string().min(1).max(160),
  iban: z.string().min(4).max(80),
  instructions: z.object({
    ka: z.string().min(1).max(1000),
    en: z.string().min(1).max(1000),
    de: z.string().min(1).max(1000),
    ru: z.string().min(1).max(1000),
  }),
});

export type BankTransferMethod =
  | { enabled: false; safeReason: string }
  | {
      enabled: true;
      mode: "fixture" | "live";
      deadlineDays: number;
      beneficiary: string;
      bank: string;
      iban: string;
      instructions: string;
    };

export async function getBankTransferMethod(
  locale: AppLocale,
): Promise<BankTransferMethod> {
  const environment = getServerEnvironment();
  if (environment.PAYMENT_PROVIDER_MODE === "disabled") {
    return { enabled: false, safeReason: "payment provider disabled" };
  }
  const client = createServiceSupabaseClient();
  const { data, error } = await client
    .from("business_settings")
    .select("value")
    .eq("key", "payments.bank_transfer")
    .maybeSingle();
  if (error) throw error;
  const parsed = bankTransferSettingSchema.safeParse(data?.value);
  if (
    !parsed.success ||
    !parsed.data.enabled ||
    parsed.data.mode === "disabled"
  ) {
    return { enabled: false, safeReason: "bank transfer not configured" };
  }
  if (environment.DEPLOY_ENV === "production" && parsed.data.mode !== "live") {
    return { enabled: false, safeReason: "test instructions blocked" };
  }
  return {
    enabled: true,
    mode: parsed.data.mode,
    deadlineDays: parsed.data.deadlineDays,
    beneficiary: parsed.data.beneficiary,
    bank: parsed.data.bank,
    iban: parsed.data.iban,
    instructions: parsed.data.instructions[locale],
  };
}
