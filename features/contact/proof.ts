import { sha256 } from "@/features/orders/guest-proof";

export function contactProofCookieName(reference: string) {
  return `epoca_contact_${reference.replace(/[^A-Z0-9]/g, "").toLowerCase()}`;
}

export function contactMessageFingerprint(input: {
  email: string;
  subject: string;
  message: string;
  orderReference?: string;
}) {
  return sha256(
    [
      input.email.toLowerCase().trim(),
      input.subject.trim(),
      input.message.trim(),
      input.orderReference?.trim() ?? "",
    ].join("\n"),
  );
}
