import { z } from "zod";

export const deployEnvironmentSchema = z.enum([
  "local",
  "preview",
  "staging",
  "production",
]);

export const providerModeSchema = z.enum([
  "disabled",
  "fixture",
  "sandbox",
  "live",
]);

const optionalSecret = z.string().trim().min(20).optional().or(z.literal(""));
const optionalEvidenceReference = z
  .string()
  .trim()
  .max(240)
  .regex(/^[A-Za-z0-9_./:@-]*$/)
  .optional()
  .or(z.literal(""));
const environmentBoolean = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

export const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .url()
    .refine(
      (value) =>
        value.startsWith("https://") || value.startsWith("http://127.0.0.1"),
      {
        message: "must use HTTPS except for the local loopback service",
      },
    ),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(20),
  NEXT_PUBLIC_POSTHOG_KEY: optionalSecret,
});

export const serverEnvironmentSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DEPLOY_ENV: deployEnvironmentSchema.default("local"),
    NEXT_PUBLIC_SUPABASE_URL:
      publicEnvironmentSchema.shape.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      publicEnvironmentSchema.shape.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(20),
    SITE_URL: z.url().optional(),
    PAYMENT_PROVIDER_MODE: providerModeSchema.default("disabled"),
    EMAIL_PROVIDER_MODE: providerModeSchema.default("disabled"),
    ASSISTANCE_PROVIDER_MODE: providerModeSchema.default("disabled"),
    ANALYTICS_PROVIDER_MODE: providerModeSchema.default("disabled"),
    MONITORING_PROVIDER_MODE: providerModeSchema.default("disabled"),
    TBC_CLIENT_ID: optionalSecret,
    TBC_CLIENT_SECRET: optionalSecret,
    TBC_API_KEY: optionalSecret,
    TBC_API_BASE_URL: z.url().optional().or(z.literal("")),
    RESEND_API_KEY: optionalSecret,
    RESEND_WEBHOOK_SECRET: optionalSecret,
    EMAIL_FROM: z.email().optional().or(z.literal("")),
    OPENAI_API_KEY: optionalSecret,
    INTERNAL_JOB_SECRET: optionalSecret,
    NEXT_PUBLIC_POSTHOG_KEY: optionalSecret,
    SENTRY_DSN: z.url().optional().or(z.literal("")),
    EPOCA_RELEASE: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_.:-]{1,120}$/)
      .default("development"),
    BUSINESS_TIME_ZONE: z.string().trim().default("Asia/Tbilisi"),
    BACKUP_MODE: z.enum(["disabled", "daily", "pitr"]).default("disabled"),
    CREDENTIAL_ROTATION_CONFIRMED: environmentBoolean,
    STAGING_SMOKE_REFERENCE: optionalEvidenceReference,
    MONITORING_CHECK_REFERENCE: optionalEvidenceReference,
    BACKUP_RESTORE_EVIDENCE_REFERENCE: optionalEvidenceReference,
    DOMAIN_ACTIVATION_REFERENCE: optionalEvidenceReference,
    SEARCH_CONSOLE_ACTIVATION_REFERENCE: optionalEvidenceReference,
    MERCHANT_CENTER_ACTIVATION_REFERENCE: optionalEvidenceReference,
    BING_WEBMASTER_ACTIVATION_REFERENCE: optionalEvidenceReference,
    LEGAL_APPROVAL_REFERENCE: optionalEvidenceReference,
    NETLIFY_SITE_ID: optionalEvidenceReference,
    MANAGED_SUPABASE_PROJECT_REF: z
      .string()
      .trim()
      .regex(/^[a-z0-9]{20}$/)
      .optional()
      .or(z.literal("")),
  })
  .superRefine((env, context) => {
    const requireValue = (
      path: string,
      value: string | undefined,
      provider: string,
    ) => {
      if (!value) {
        context.addIssue({
          code: "custom",
          message: `${provider} live/sandbox mode requires configured credentials`,
          path: [path],
        });
      }
    };

    if (env.DEPLOY_ENV !== "local" && !env.SITE_URL) {
      context.addIssue({
        code: "custom",
        message:
          "non-local environments require an explicit canonical SITE_URL",
        path: ["SITE_URL"],
      });
    }

    if (["sandbox", "live"].includes(env.PAYMENT_PROVIDER_MODE)) {
      requireValue("TBC_CLIENT_ID", env.TBC_CLIENT_ID, "TBC payment");
      requireValue("TBC_CLIENT_SECRET", env.TBC_CLIENT_SECRET, "TBC payment");
      requireValue("TBC_API_KEY", env.TBC_API_KEY, "TBC payment");
    }

    if (["sandbox", "live"].includes(env.EMAIL_PROVIDER_MODE)) {
      requireValue("RESEND_API_KEY", env.RESEND_API_KEY, "Resend email");
      requireValue(
        "RESEND_WEBHOOK_SECRET",
        env.RESEND_WEBHOOK_SECRET,
        "Resend email",
      );
      requireValue("EMAIL_FROM", env.EMAIL_FROM, "Resend email");
    }

    if (["sandbox", "live"].includes(env.ASSISTANCE_PROVIDER_MODE)) {
      requireValue("OPENAI_API_KEY", env.OPENAI_API_KEY, "OpenAI assistance");
    }

    if (env.ANALYTICS_PROVIDER_MODE === "live") {
      requireValue(
        "NEXT_PUBLIC_POSTHOG_KEY",
        env.NEXT_PUBLIC_POSTHOG_KEY,
        "PostHog analytics",
      );
    }

    if (env.MONITORING_PROVIDER_MODE === "live") {
      requireValue("SENTRY_DSN", env.SENTRY_DSN, "Sentry monitoring");
    }

    if (env.DEPLOY_ENV === "production") {
      requireValue(
        "INTERNAL_JOB_SECRET",
        env.INTERNAL_JOB_SECRET,
        "Background job dispatch",
      );
      for (const [name, mode] of [
        ["PAYMENT_PROVIDER_MODE", env.PAYMENT_PROVIDER_MODE],
        ["EMAIL_PROVIDER_MODE", env.EMAIL_PROVIDER_MODE],
        ["ASSISTANCE_PROVIDER_MODE", env.ASSISTANCE_PROVIDER_MODE],
        ["ANALYTICS_PROVIDER_MODE", env.ANALYTICS_PROVIDER_MODE],
        ["MONITORING_PROVIDER_MODE", env.MONITORING_PROVIDER_MODE],
      ]) {
        if (mode === "fixture" || mode === "sandbox") {
          context.addIssue({
            code: "custom",
            message:
              "production cannot start with a fixture or sandbox provider mode",
            path: [name],
          });
        }
      }
      if (!env.CREDENTIAL_ROTATION_CONFIRMED) {
        context.addIssue({
          code: "custom",
          message: "production requires confirmed credential rotation",
          path: ["CREDENTIAL_ROTATION_CONFIRMED"],
        });
      }
      if (env.BACKUP_MODE !== "pitr") {
        context.addIssue({
          code: "custom",
          message: "production requires point-in-time recovery",
          path: ["BACKUP_MODE"],
        });
      }
    }
  });

export class EnvironmentValidationError extends Error {
  readonly fields: string[];

  constructor(
    issues: ReadonlyArray<{ readonly path: ReadonlyArray<PropertyKey> }>,
  ) {
    const fields = [
      ...new Set(
        issues.map(
          (issue) => issue.path.map(String).join(".") || "environment",
        ),
      ),
    ];
    super(`Invalid environment configuration: ${fields.join(", ")}`);
    this.name = "EnvironmentValidationError";
    this.fields = fields;
  }
}

export function parseEnvironment<TOutput>(
  schema: z.ZodType<TOutput>,
  input: unknown,
): TOutput {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new EnvironmentValidationError(result.error.issues);
  }

  return result.data;
}
