import { describe, expect, it } from "vitest";

import {
  evaluateReadiness,
  type ReadinessInput,
} from "@/features/operations/readiness-domain";

const passing: ReadinessInput = {
  gates: {
    build: true,
    migrations: true,
    tests: true,
    security: true,
    bankTransfer: true,
    stagingSmoke: true,
    monitoring: true,
    backupRestore: true,
    domain: true,
    legalApproval: true,
    productionEnvironment: true,
  },
  externalBlockers: [],
};

describe("truthful release readiness", () => {
  it("promotes only when every launch gate has evidence", () => {
    expect(evaluateReadiness(passing)).toMatchObject({
      highestStage: "launch-ready",
      launchReady: true,
      decision: "promote",
      blockers: [],
    });
  });

  it("keeps build-complete separate from externally blocked launch readiness", () => {
    const result = evaluateReadiness({
      ...passing,
      gates: {
        ...passing.gates,
        stagingSmoke: false,
        backupRestore: false,
        domain: false,
        legalApproval: false,
        productionEnvironment: false,
      },
      externalBlockers: ["ROTATE_DISCLOSED_CREDENTIALS", "NETLIFY_SITE_LINK"],
    });
    expect(result.highestStage).toBe("payment-ready");
    expect(result.launchReady).toBe(false);
    expect(result.decision).toBe("hold");
    expect(result.blockers).toContain("BACKUP_RESTORE_UNPROVEN");
    expect(result.blockers).toContain("ROTATE_DISCLOSED_CREDENTIALS");
  });
});
