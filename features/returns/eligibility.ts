import { z } from "zod";

export const returnEligibilitySchema = z.object({
  eligible: z.boolean(),
  reasonCode: z.string().min(2).max(80),
  deadline: z.iso.datetime({ offset: true }).nullable().optional(),
  policyId: z.string().uuid().optional(),
  policyVersion: z.string().max(80).optional(),
  policyVersionNumber: z.number().int().positive().optional(),
  legalStatus: z.enum(["draft_unapproved", "approved"]).optional(),
  allowedReasons: z.array(z.string()).optional().default([]),
  maxEvidenceFiles: z.number().int().nonnegative().optional(),
  maxEvidenceBytes: z.number().int().positive().optional(),
  allowedEvidenceTypes: z.array(z.string()).optional().default([]),
  buyerCopy: z.record(z.string(), z.string()).optional().default({}),
});

export type ReturnEligibility = z.infer<typeof returnEligibilitySchema>;

export function parseReturnEligibility(value: unknown) {
  return returnEligibilitySchema.parse(value);
}

const transitions: Record<string, readonly string[]> = {
  requested: ["needs_information", "approved", "rejected", "cancelled"],
  needs_information: ["requested", "approved", "rejected", "cancelled"],
  approved: ["in_transit", "received", "cancelled"],
  in_transit: ["received"],
  received: ["inspected"],
  inspected: ["refund_pending", "closed"],
  refund_pending: ["refunded", "needs_information"],
  refunded: ["closed"],
};

export function isAllowedReturnTransition(from: string, to: string) {
  return transitions[from]?.includes(to) ?? false;
}

export function validateRefundAllocation(
  requestedMinor: readonly number[],
  paidMinor: number,
) {
  if (!Number.isSafeInteger(paidMinor) || paidMinor < 0) return false;
  if (
    requestedMinor.some((amount) => !Number.isSafeInteger(amount) || amount < 0)
  ) {
    return false;
  }
  return requestedMinor.reduce((sum, amount) => sum + amount, 0) <= paidMinor;
}
