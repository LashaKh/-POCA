import { describe, expect, it } from "vitest";

import { parsePublicEnvironment } from "@/lib/env/public";
import {
  EnvironmentValidationError,
  parseEnvironment,
  serverEnvironmentSchema,
} from "@/lib/env/schema";
import { getSafeEnvironmentStatus } from "@/lib/env/status";

const parseServerEnvironment = (input: unknown) =>
  parseEnvironment(serverEnvironmentSchema, input);

const base = {
  NODE_ENV: "test",
  DEPLOY_ENV: "local",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_test_key",
  SUPABASE_SERVICE_ROLE_KEY: "sb_secret_local_test_service_key",
};

describe("environment validation", () => {
  it("accepts safe local fixture defaults", () => {
    expect(
      parseServerEnvironment({
        ...base,
        PAYMENT_PROVIDER_MODE: "fixture",
        EMAIL_PROVIDER_MODE: "fixture",
      }),
    ).toMatchObject({ DEPLOY_ENV: "local", PAYMENT_PROVIDER_MODE: "fixture" });
  });

  it("rejects live payment without credentials without exposing values", () => {
    expect(() =>
      parseServerEnvironment({ ...base, PAYMENT_PROVIDER_MODE: "live" }),
    ).toThrowError(EnvironmentValidationError);

    try {
      parseServerEnvironment({ ...base, PAYMENT_PROVIDER_MODE: "live" });
    } catch (error) {
      expect(String(error)).not.toContain(base.SUPABASE_SERVICE_ROLE_KEY);
    }
  });

  it("rejects fixture providers in production", () => {
    expect(() =>
      parseServerEnvironment({
        ...base,
        NODE_ENV: "production",
        DEPLOY_ENV: "production",
        SITE_URL: "https://example.invalid",
        PAYMENT_PROVIDER_MODE: "fixture",
      }),
    ).toThrowError(/PAYMENT_PROVIDER_MODE/);
  });

  it("reports only safe modes, booleans, and invalid field names", () => {
    const status = getSafeEnvironmentStatus({
      ...base,
      PAYMENT_PROVIDER_MODE: "fixture",
      EMAIL_PROVIDER_MODE: "disabled",
      CREDENTIAL_ROTATION_CONFIRMED: "false",
    });
    expect(status).toMatchObject({
      valid: true,
      environment: "local",
      providers: { PAYMENT_PROVIDER_MODE: "fixture" },
      requirements: { credentialRotationConfirmed: false },
    });
    expect(JSON.stringify(status)).not.toContain(
      base.SUPABASE_SERVICE_ROLE_KEY,
    );
  });

  it("accepts only HTTPS or local-loopback Supabase URLs", () => {
    expect(() =>
      parsePublicEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: "http://example.invalid",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_public_key_value",
      }),
    ).toThrowError(/NEXT_PUBLIC_SUPABASE_URL/);
  });
});
