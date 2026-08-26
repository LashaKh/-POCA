import { serverEnvironmentSchema } from "./schema.ts";

const providerKeys = [
  "PAYMENT_PROVIDER_MODE",
  "EMAIL_PROVIDER_MODE",
  "ASSISTANCE_PROVIDER_MODE",
  "ANALYTICS_PROVIDER_MODE",
  "MONITORING_PROVIDER_MODE",
] as const;

export function getSafeEnvironmentStatus(input: unknown) {
  const result = serverEnvironmentSchema.safeParse(input);
  if (!result.success) {
    return {
      valid: false as const,
      invalidFields: [
        ...new Set(
          result.error.issues.map(
            (issue) => issue.path.map(String).join(".") || "environment",
          ),
        ),
      ],
    };
  }
  const env = result.data;
  return {
    valid: true as const,
    environment: env.DEPLOY_ENV,
    release: env.EPOCA_RELEASE,
    providers: Object.fromEntries(providerKeys.map((key) => [key, env[key]])),
    requirements: {
      siteUrl: Boolean(env.SITE_URL),
      internalJobSigning: Boolean(env.INTERNAL_JOB_SECRET),
      credentialRotationConfirmed: env.CREDENTIAL_ROTATION_CONFIRMED,
      backupMode: env.BACKUP_MODE,
      stagingSmokeEvidence: Boolean(env.STAGING_SMOKE_REFERENCE),
      monitoringEvidence: Boolean(env.MONITORING_CHECK_REFERENCE),
      backupRestoreEvidence: Boolean(env.BACKUP_RESTORE_EVIDENCE_REFERENCE),
      domainActivationEvidence: Boolean(env.DOMAIN_ACTIVATION_REFERENCE),
      legalApprovalEvidence: Boolean(env.LEGAL_APPROVAL_REFERENCE),
      netlifySiteLinked: Boolean(env.NETLIFY_SITE_ID),
      managedSupabaseLinked: Boolean(env.MANAGED_SUPABASE_PROJECT_REF),
    },
  };
}
