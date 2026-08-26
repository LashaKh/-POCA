export type ReadinessStage =
  | "incomplete"
  | "build-complete"
  | "payment-ready"
  | "staging-operational"
  | "launch-ready";

export type ReadinessInput = {
  gates: {
    build: boolean;
    migrations: boolean;
    tests: boolean;
    security: boolean;
    bankTransfer: boolean;
    stagingSmoke: boolean;
    monitoring: boolean;
    backupRestore: boolean;
    domain: boolean;
    legalApproval: boolean;
    productionEnvironment: boolean;
  };
  externalBlockers: readonly string[];
};

const blockerByGate: Record<keyof ReadinessInput["gates"], string> = {
  build: "BUILD_FAILED",
  migrations: "MIGRATIONS_UNVERIFIED",
  tests: "TESTS_FAILED",
  security: "SECURITY_GATE_FAILED",
  bankTransfer: "NO_PAYMENT_METHOD_READY",
  stagingSmoke: "STAGING_SMOKE_UNPROVEN",
  monitoring: "MONITORING_UNPROVEN",
  backupRestore: "BACKUP_RESTORE_UNPROVEN",
  domain: "DOMAIN_NOT_ACTIVATED",
  legalApproval: "LEGAL_COPY_NOT_APPROVED",
  productionEnvironment: "PRODUCTION_ENVIRONMENT_INCOMPLETE",
};

export function evaluateReadiness(input: ReadinessInput) {
  const buildComplete =
    input.gates.build &&
    input.gates.migrations &&
    input.gates.tests &&
    input.gates.security;
  const paymentReady = buildComplete && input.gates.bankTransfer;
  const stagingOperational =
    paymentReady && input.gates.stagingSmoke && input.gates.monitoring;
  const launchReady =
    stagingOperational &&
    input.gates.backupRestore &&
    input.gates.domain &&
    input.gates.legalApproval &&
    input.gates.productionEnvironment &&
    input.externalBlockers.length === 0;

  let highestStage: ReadinessStage = "incomplete";
  if (buildComplete) highestStage = "build-complete";
  if (paymentReady) highestStage = "payment-ready";
  if (stagingOperational) highestStage = "staging-operational";
  if (launchReady) highestStage = "launch-ready";

  const blockers = Object.entries(input.gates)
    .filter(([, passed]) => !passed)
    .map(([gate]) => blockerByGate[gate as keyof ReadinessInput["gates"]]);
  blockers.push(...input.externalBlockers);

  return {
    highestStage,
    launchReady,
    decision: launchReady ? ("promote" as const) : ("hold" as const),
    blockers: [...new Set(blockers)],
    stages: {
      buildComplete,
      paymentReady,
      stagingOperational,
      launchReady,
    },
  };
}
