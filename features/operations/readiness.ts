import "server-only";

import { randomUUID } from "node:crypto";

import { getBankTransferMethod } from "@/features/payments/bank-transfer";
import {
  merchantFeedProfiles,
  validateMerchantFeedProfile,
} from "@/features/seo/merchant-feed";
import { getServerEnvironment } from "@/lib/env/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

import { evaluateReadiness, type ReadinessInput } from "./readiness-domain";

export type QualityGateEvidence = {
  build: boolean;
  migrations: boolean;
  tests: boolean;
  security: boolean;
};

export async function evaluateOperationalReadiness(
  quality: QualityGateEvidence,
) {
  const environment = getServerEnvironment();
  const client = createServiceSupabaseClient();
  const [bankTransfer, backupEvidence] = await Promise.all([
    getBankTransferMethod("en"),
    client
      .from("backup_restore_evidence")
      .select("id")
      .eq("evidence_type", "restore")
      .eq("status", "passed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (backupEvidence.error) throw backupEvidence.error;

  const externalBlockers = [
    ...(!environment.CREDENTIAL_ROTATION_CONFIRMED
      ? ["ROTATE_DISCLOSED_CREDENTIALS"]
      : []),
    ...(!environment.NETLIFY_SITE_ID ? ["NETLIFY_SITE_LINK"] : []),
    ...(!environment.MANAGED_SUPABASE_PROJECT_REF
      ? ["MANAGED_SUPABASE_LINK"]
      : []),
  ];
  const input: ReadinessInput = {
    gates: {
      ...quality,
      bankTransfer: bankTransfer.enabled,
      stagingSmoke: Boolean(environment.STAGING_SMOKE_REFERENCE),
      monitoring: Boolean(environment.MONITORING_CHECK_REFERENCE),
      backupRestore: Boolean(
        backupEvidence.data || environment.BACKUP_RESTORE_EVIDENCE_REFERENCE,
      ),
      domain: Boolean(environment.DOMAIN_ACTIVATION_REFERENCE),
      legalApproval: Boolean(environment.LEGAL_APPROVAL_REFERENCE),
      productionEnvironment:
        environment.DEPLOY_ENV === "production" &&
        environment.CREDENTIAL_ROTATION_CONFIRMED &&
        environment.BACKUP_MODE === "pitr",
    },
    externalBlockers,
  };
  const googleDiscovery = {
    domainActivated: Boolean(environment.DOMAIN_ACTIVATION_REFERENCE),
    searchConsoleActivated: Boolean(
      environment.SEARCH_CONSOLE_ACTIVATION_REFERENCE,
    ),
    merchantCenterActivated: Boolean(
      environment.MERCHANT_CENTER_ACTIVATION_REFERENCE,
    ),
    bingWebmasterActivated: Boolean(
      environment.BING_WEBMASTER_ACTIVATION_REFERENCE,
    ),
    feedProfiles: Object.values(merchantFeedProfiles).map((profile) => ({
      id: profile.id,
      ready: validateMerchantFeedProfile(profile).length === 0,
      blockers: validateMerchantFeedProfile(profile),
    })),
  };
  return { ...evaluateReadiness(input), input, googleDiscovery };
}

export async function recordOperationalReadiness(
  quality: QualityGateEvidence,
  releaseRecordId: string,
) {
  const result = await evaluateOperationalReadiness(quality);
  const environment = getServerEnvironment();
  const client = createServiceSupabaseClient();
  const recorded = await client.rpc("record_readiness_assessment", {
    p_environment: environment.DEPLOY_ENV,
    p_stage: result.highestStage,
    p_decision: result.decision,
    p_gates: result.input.gates,
    p_blockers: result.blockers,
    p_release_record_id: releaseRecordId,
    p_correlation_id: randomUUID(),
  });
  if (recorded.error) throw recorded.error;
  return { ...result, assessmentId: recorded.data.id };
}
