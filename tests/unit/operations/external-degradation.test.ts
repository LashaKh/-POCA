import { describe, expect, it } from "vitest";

import { parseEnvironment, serverEnvironmentSchema } from "@/lib/env/schema";
import { DisabledPaymentProvider } from "@/lib/providers/payment/disabled";
import { DisabledEmailProvider } from "@/lib/providers/email/disabled";
import { disabledAssistanceProvider } from "@/lib/providers/assistance/disabled";
import { statusFromMode } from "@/lib/providers/status";

const productionBase = {
  NODE_ENV: "production",
  DEPLOY_ENV: "production",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_public_value",
  SUPABASE_SERVICE_ROLE_KEY: "synthetic_server_value_for_validation",
  SITE_URL: "https://shop.example.invalid",
  INTERNAL_JOB_SECRET: "synthetic_internal_job_secret_value",
  CREDENTIAL_ROTATION_CONFIRMED: "true",
  BACKUP_MODE: "pitr",
  PAYMENT_PROVIDER_MODE: "disabled",
  EMAIL_PROVIDER_MODE: "disabled",
  ASSISTANCE_PROVIDER_MODE: "disabled",
  ANALYTICS_PROVIDER_MODE: "disabled",
  MONITORING_PROVIDER_MODE: "disabled",
};

describe("external dependency degradation", () => {
  it("keeps missing production providers explicitly disabled, never ready", () => {
    const environment = parseEnvironment(
      serverEnvironmentSchema,
      productionBase,
    );
    for (const provider of [
      "payment",
      "email",
      "assistance",
      "analytics",
      "monitoring",
    ] as const) {
      expect(statusFromMode(provider, "disabled", ["send"])).toEqual({
        provider,
        mode: "disabled",
        state: "disabled",
        capabilities: [],
        safeReason: "not configured",
      });
    }
    expect(environment.PAYMENT_PROVIDER_MODE).toBe("disabled");
  });

  it.each([
    ["PAYMENT_PROVIDER_MODE", "live"],
    ["EMAIL_PROVIDER_MODE", "live"],
    ["ASSISTANCE_PROVIDER_MODE", "live"],
    ["ANALYTICS_PROVIDER_MODE", "live"],
    ["MONITORING_PROVIDER_MODE", "live"],
  ] as const)(
    "rejects %s=%s when its activation input is absent",
    (field, mode) => {
      const result = serverEnvironmentSchema.safeParse({
        ...productionBase,
        [field]: mode,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path.length > 0)).toBe(
          true,
        );
        expect(JSON.stringify(result.error.issues)).not.toContain(
          productionBase.SUPABASE_SERVICE_ROLE_KEY,
        );
      }
    },
  );

  it("rejects test payment modes in production", () => {
    for (const mode of ["fixture", "sandbox"] as const) {
      expect(
        serverEnvironmentSchema.safeParse({
          ...productionBase,
          PAYMENT_PROVIDER_MODE: mode,
          TBC_CLIENT_ID: "synthetic_client_identifier_value",
          TBC_CLIENT_SECRET: "synthetic_client_secret_value",
          TBC_API_KEY: "synthetic_payment_api_key_value",
        }).success,
      ).toBe(false);
    }
  });

  it("disabled payment, email, and assistance adapters fail without false promises", async () => {
    const payment = new DisabledPaymentProvider();
    expect(payment.available).toBe(false);
    await expect(payment.createPayment()).rejects.toMatchObject({
      code: "PAYMENT_PROVIDER_DISABLED",
      retryable: false,
    });

    const email = new DisabledEmailProvider();
    expect(email.available).toBe(false);
    await expect(email.send()).rejects.toMatchObject({
      code: "EMAIL_PROVIDER_DISABLED",
      retryable: false,
    });

    await expect(
      disabledAssistanceProvider.suggestCatalogDraft({
        imageDataUrl: "data:image/png;base64,c3ludGhldGlj",
        verifiedContext: {
          sku: "SYNTHETIC",
          supportedLocales: ["ka", "en", "de", "ru"],
        },
      }),
    ).rejects.toThrow("ASSISTANCE_DISABLED");
  });
});
