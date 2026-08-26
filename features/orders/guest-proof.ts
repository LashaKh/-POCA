import { createHash, randomBytes } from "node:crypto";

const tokenPattern = /^[A-Za-z0-9_-]{32,128}$/;

export function createOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

export function isOpaqueToken(value: unknown): value is string {
  return typeof value === "string" && tokenPattern.test(value);
}

export function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function deriveGuestOrderProof(
  guestSecret: string,
  idempotencyKey: string,
) {
  return sha256(`${guestSecret}:order-proof:${idempotencyKey}`);
}

export function orderProofCookieName(reference: string) {
  return `epoca_order_${reference.toLowerCase()}`;
}
