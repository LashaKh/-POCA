import { sha256 } from "@/features/orders/guest-proof";

export function newsletterProofCookieName(email: string) {
  return `epoca_news_${sha256(email.toLowerCase().trim()).slice(0, 24)}`;
}
