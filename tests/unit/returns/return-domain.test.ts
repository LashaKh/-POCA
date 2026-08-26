import { describe, expect, it } from "vitest";

import {
  isAllowedReturnTransition,
  parseReturnEligibility,
  validateRefundAllocation,
} from "@/features/returns/eligibility";
import {
  detectReturnEvidenceType,
  validateReturnEvidence,
} from "@/features/returns/evidence-validation";
import {
  returnInspectionSchema,
  returnPolicySchema,
  returnRequestSchema,
} from "@/features/returns/schema";

describe("return domain", () => {
  it("requires a line for a physical return but not a cancellation", () => {
    const base = {
      locale: "en",
      orderReference: "EPO-ABCDEFGHIJKL",
      reasonCode: "damaged",
      buyerNote: "The corner was damaged.",
      quantity: 1,
      idempotencyToken: crypto.randomUUID(),
    };
    expect(
      returnRequestSchema.safeParse({ ...base, requestKind: "return" }).success,
    ).toBe(false);
    expect(
      returnRequestSchema.safeParse({
        ...base,
        requestKind: "cancellation",
      }).success,
    ).toBe(true);
  });

  it("bounds reason, note, inspection, and policy configuration", () => {
    expect(
      returnRequestSchema.safeParse({
        locale: "en",
        orderReference: "EPO-ABCDEFGHIJKL",
        requestKind: "return",
        reasonCode: "unsupported",
        buyerNote: "x",
        lineId: crypto.randomUUID(),
        quantity: 21,
        idempotencyToken: crypto.randomUUID(),
      }).success,
    ).toBe(false);
    expect(
      returnInspectionSchema.safeParse({
        locale: "en",
        returnRequestId: crypto.randomUUID(),
        expectedVersion: 1,
        idempotencyToken: crypto.randomUUID(),
        summary: "Inspected",
        packageCondition: "Intact",
        items: [
          {
            itemId: crypto.randomUUID(),
            condition: "damaged",
            restockDecision: "restock",
            refundAmountMinor: 50_000,
            itemNote: "Repairable edge",
          },
        ],
      }).success,
    ).toBe(true);
    expect(
      returnPolicySchema.safeParse({
        locale: "en",
        version: "returns-v2-draft",
        cancellationWindowHours: 12,
        returnWindowDays: 21,
        allowedReasons: ["damaged", "other"],
        maxEvidenceFiles: 4,
        maxEvidenceBytes: 4_194_304,
        restockMode: "after_inspection",
      }).success,
    ).toBe(true);
  });

  it("parses a policy-window snapshot without inventing legal approval", () => {
    expect(
      parseReturnEligibility({
        eligible: true,
        reasonCode: "eligible",
        deadline: "2026-09-01T00:00:00.000Z",
        policyId: crypto.randomUUID(),
        policyVersion: "returns-v1-draft",
        policyVersionNumber: 1,
        legalStatus: "draft_unapproved",
        allowedReasons: ["damaged"],
        maxEvidenceFiles: 5,
        maxEvidenceBytes: 8_388_608,
        allowedEvidenceTypes: ["image/jpeg"],
        buyerCopy: { en: "Operational draft" },
      }),
    ).toMatchObject({ legalStatus: "draft_unapproved", eligible: true });
  });

  it("accepts only valid lifecycle transitions", () => {
    expect(isAllowedReturnTransition("requested", "approved")).toBe(true);
    expect(isAllowedReturnTransition("approved", "refunded")).toBe(false);
    expect(isAllowedReturnTransition("received", "inspected")).toBe(true);
    expect(isAllowedReturnTransition("closed", "requested")).toBe(false);
  });

  it("validates deterministic refund allocations", () => {
    expect(validateRefundAllocation([40_000, 10_000], 50_000)).toBe(true);
    expect(validateRefundAllocation([40_000, 10_001], 50_000)).toBe(false);
    expect(validateRefundAllocation([-1], 50_000)).toBe(false);
    expect(validateRefundAllocation([Number.MAX_SAFE_INTEGER, 1], 100)).toBe(
      false,
    );
  });

  it("checks evidence by file signature, claimed type, and size", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xdb]);
    const png = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    expect(detectReturnEvidenceType(jpeg)).toBe("image/jpeg");
    expect(detectReturnEvidenceType(png)).toBe("image/png");
    expect(
      validateReturnEvidence({
        bytes: jpeg,
        claimedType: "image/jpeg",
        size: jpeg.length,
      }),
    ).toEqual({ ok: true, detectedType: "image/jpeg" });
    expect(
      validateReturnEvidence({
        bytes: jpeg,
        claimedType: "application/pdf",
        size: jpeg.length,
      }),
    ).toMatchObject({ ok: false, code: "RETURN_EVIDENCE_TYPE_MISMATCH" });
    expect(
      validateReturnEvidence({
        bytes: jpeg,
        claimedType: "image/jpeg",
        size: 9_000_000,
      }),
    ).toMatchObject({ ok: false, code: "RETURN_EVIDENCE_SIZE_INVALID" });
  });
});
