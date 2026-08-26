import "server-only";

import { cookies } from "next/headers";

import {
  createOpaqueToken,
  isOpaqueToken,
  sha256,
} from "@/features/orders/guest-proof";

export const privacySubjectCookieName = "epoca_privacy_subject";
export const consentChoiceCookieName = "epoca_optional_consent";
const maxAge = 60 * 60 * 24 * 365;

export async function readPrivacySubject() {
  const value = (await cookies()).get(privacySubjectCookieName)?.value;
  return isOpaqueToken(value) ? value : undefined;
}

export async function ensurePrivacySubject() {
  const cookieStore = await cookies();
  const current = cookieStore.get(privacySubjectCookieName)?.value;
  const subject = isOpaqueToken(current) ? current : createOpaqueToken();
  if (!isOpaqueToken(current)) {
    cookieStore.set(privacySubjectCookieName, subject, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.DEPLOY_ENV === "production",
      maxAge,
      path: "/",
    });
  }
  return { subject, subjectHash: sha256(subject) };
}

export async function persistConsentChoiceCookie(
  choices: Record<string, string>,
) {
  const cookieStore = await cookies();
  cookieStore.set(consentChoiceCookieName, JSON.stringify(choices), {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.DEPLOY_ENV === "production",
    maxAge,
    path: "/",
  });
}

export async function readConsentChoiceCookie() {
  const value = (await cookies()).get(consentChoiceCookieName)?.value;
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}
