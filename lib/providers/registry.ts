import "server-only";

import { getServerEnvironment } from "@/lib/env/server";
import { DisabledPaymentProvider } from "./payment/disabled";
import { FixturePaymentProvider } from "./payment/fixture";
import { TbcPaymentProvider } from "./payment/tbc";
import { CaptureEmailProvider } from "./email/capture";
import { DisabledEmailProvider } from "./email/disabled";
import { ResendEmailProvider } from "./email/resend";
import { getProviderStatuses, type ProviderName } from "./status";

export function createPaymentProvider() {
  const env = getServerEnvironment();
  if (env.PAYMENT_PROVIDER_MODE === "fixture") {
    return new FixturePaymentProvider(env.SITE_URL ?? "http://127.0.0.1:3000");
  }
  if (
    (env.PAYMENT_PROVIDER_MODE === "sandbox" ||
      env.PAYMENT_PROVIDER_MODE === "live") &&
    env.TBC_CLIENT_ID &&
    env.TBC_CLIENT_SECRET &&
    env.TBC_API_KEY
  ) {
    return new TbcPaymentProvider({
      clientId: env.TBC_CLIENT_ID,
      clientSecret: env.TBC_CLIENT_SECRET,
      apiKey: env.TBC_API_KEY,
      baseUrl: env.TBC_API_BASE_URL || undefined,
    });
  }
  return new DisabledPaymentProvider();
}

export function createEmailProvider() {
  const env = getServerEnvironment();
  if (env.EMAIL_PROVIDER_MODE === "fixture") return new CaptureEmailProvider();
  if (
    (env.EMAIL_PROVIDER_MODE === "sandbox" ||
      env.EMAIL_PROVIDER_MODE === "live") &&
    env.RESEND_API_KEY
  ) {
    return new ResendEmailProvider(env.RESEND_API_KEY);
  }
  return new DisabledEmailProvider();
}

export function createProviderRegistry() {
  const env = getServerEnvironment();
  const statuses = getProviderStatuses(env);

  return {
    statuses,
    status(provider: ProviderName) {
      return statuses.find((status) => status.provider === provider);
    },
  };
}
