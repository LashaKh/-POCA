import { mkdir, readFile, writeFile } from "node:fs/promises";
import process from "node:process";

import { evaluateReadiness } from "../features/operations/readiness-domain.ts";
import { getSafeEnvironmentStatus } from "../lib/env/status.ts";

async function readQualityEvidence() {
  try {
    const value = JSON.parse(
      await readFile("artifacts/release-gates/latest.json", "utf8"),
    );
    return {
      build: value.gates?.build === "passed",
      migrations: value.gates?.migrations === "passed",
      tests: value.gates?.tests === "passed",
      security: value.gates?.security === "passed",
    };
  } catch {
    return { build: false, migrations: false, tests: false, security: false };
  }
}

const status = getSafeEnvironmentStatus(process.env);
if (!status.valid) {
  process.stderr.write(
    `Cannot evaluate readiness: ${status.invalidFields.join(", ")}\n`,
  );
  process.exitCode = 1;
} else {
  const quality = await readQualityEvidence();
  const requirements = status.requirements;
  const externalBlockers = [
    ...(!requirements.credentialRotationConfirmed
      ? ["ROTATE_DISCLOSED_CREDENTIALS"]
      : []),
    ...(!requirements.netlifySiteLinked ? ["NETLIFY_SITE_LINK"] : []),
    ...(!requirements.managedSupabaseLinked ? ["MANAGED_SUPABASE_LINK"] : []),
  ];
  const result = evaluateReadiness({
    gates: {
      ...quality,
      bankTransfer: status.providers.PAYMENT_PROVIDER_MODE !== "disabled",
      stagingSmoke: requirements.stagingSmokeEvidence,
      monitoring: requirements.monitoringEvidence,
      backupRestore: requirements.backupRestoreEvidence,
      domain: requirements.domainActivationEvidence,
      legalApproval: requirements.legalApprovalEvidence,
      productionEnvironment:
        status.environment === "production" &&
        requirements.credentialRotationConfirmed &&
        requirements.backupMode === "pitr",
    },
    externalBlockers,
  });
  const report = {
    generatedAt: new Date().toISOString(),
    environment: status.environment,
    release: status.release,
    ...result,
  };
  await mkdir("artifacts/readiness", { recursive: true });
  await writeFile(
    "artifacts/readiness/latest.json",
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  process.stdout.write(
    `${report.highestStage}: ${report.decision}; ${report.blockers.length} blocker(s).\n`,
  );
}
