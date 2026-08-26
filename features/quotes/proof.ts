import { createHash } from "node:crypto";

export function manualQuoteProofCookieName(reference: string) {
  return `epoca_quote_${reference.replace(/[^A-Z0-9]/g, "").toLowerCase()}`;
}

export function hashManualQuoteProof(proof: string) {
  return createHash("sha256").update(proof).digest("hex");
}
