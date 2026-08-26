export const returnEvidenceLimits = {
  maximumFiles: 5,
  maximumBytes: 8 * 1024 * 1024,
  allowedTypes: ["image/jpeg", "image/png", "image/webp"],
} as const;

export function detectReturnEvidenceType(bytes: Uint8Array) {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg" as const;
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png" as const;
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp" as const;
  }
  return undefined;
}

export function validateReturnEvidence(input: {
  bytes: Uint8Array;
  claimedType: string;
  size: number;
  maximumBytes?: number;
  allowedTypes?: readonly string[];
}) {
  const detectedType = detectReturnEvidenceType(input.bytes);
  const allowedTypes = input.allowedTypes ?? returnEvidenceLimits.allowedTypes;
  const maximumBytes = input.maximumBytes ?? returnEvidenceLimits.maximumBytes;
  if (!detectedType || detectedType !== input.claimedType) {
    return { ok: false as const, code: "RETURN_EVIDENCE_TYPE_MISMATCH" };
  }
  if (!allowedTypes.includes(detectedType)) {
    return { ok: false as const, code: "RETURN_EVIDENCE_TYPE_NOT_ALLOWED" };
  }
  if (input.size < 1 || input.size > maximumBytes) {
    return { ok: false as const, code: "RETURN_EVIDENCE_SIZE_INVALID" };
  }
  return { ok: true as const, detectedType };
}
