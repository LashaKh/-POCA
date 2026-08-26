"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { readGuestSecretHash } from "@/features/cart/guest";
import {
  checkoutAcceptanceSchema,
  checkoutPreparationSchema,
} from "@/features/checkout/schema";
import { acceptOrder, reviewCheckout } from "@/features/checkout/service";
import { orderProofCookieName } from "@/features/orders/guest-proof";
import { isAppLocale } from "@/i18n/routing";
import {
  consumePolicyRateLimit,
  type RateLimitPolicyKey,
} from "@/lib/security/rate-limit";
import { getErrorMessage } from "@/lib/validation/error";

function safeCheckoutError(error: unknown) {
  const message = getErrorMessage(error, "CHECKOUT_FAILED");
  const codes = [
    "CART_NOT_FOUND",
    "EMPTY_CART",
    "INSUFFICIENT_STOCK",
    "DELIVERY_QUOTE_REQUIRED",
    "MANUAL_QUOTE_REQUIRED",
    "PAYMENT_METHOD_DISABLED",
    "CHECKOUT_EXPIRED",
    "CHECKOUT_STALE",
    "TOTAL_CHANGED",
    "CURRENCY_DISABLED",
  ];
  return codes.find((code) => message.includes(code)) ?? "CHECKOUT_FAILED";
}

async function checkoutRateLimit(policy: RateLimitPolicyKey) {
  const subjectHash = await readGuestSecretHash();
  if (!subjectHash) return false;
  const decision = await consumePolicyRateLimit({
    policy,
    subjectHash,
  });
  return decision.allowed;
}

export async function prepareCheckoutAction(formData: FormData) {
  const parsed = checkoutPreparationSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) redirect("/en/cart?error=INVALID_INPUT");
  if (!(await checkoutRateLimit("checkoutReview"))) {
    redirect(`/${parsed.data.locale}/cart?error=RATE_LIMITED`);
  }
  let destination: string;
  try {
    const review = await reviewCheckout(parsed.data);
    destination = `/${parsed.data.locale}/checkout?session=${encodeURIComponent(review.session.id)}`;
  } catch (error) {
    const code = safeCheckoutError(error);
    destination = ["DELIVERY_QUOTE_REQUIRED", "MANUAL_QUOTE_REQUIRED"].includes(
      code,
    )
      ? `/${parsed.data.locale}/quote?country=${encodeURIComponent(parsed.data.countryCode)}`
      : `/${parsed.data.locale}/cart?error=${code}`;
  }
  redirect(destination);
}

export async function acceptCheckoutAction(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const locale = isAppLocale(raw.locale) ? raw.locale : "en";
  const parsed = checkoutAcceptanceSchema.safeParse(raw);
  if (!parsed.success) redirect(`/${locale}/checkout?error=INVALID_INPUT`);
  if (!(await checkoutRateLimit("checkoutAccept"))) {
    redirect(`/${parsed.data.locale}/checkout?error=RATE_LIMITED`);
  }
  let destination: string;
  try {
    const accepted = await acceptOrder(parsed.data);
    const cookieStore = await cookies();
    cookieStore.set(
      orderProofCookieName(accepted.order.reference),
      accepted.proof,
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.DEPLOY_ENV === "production",
        maxAge: 60 * 60 * 24 * 90,
        path: "/",
      },
    );
    destination =
      "approvalUrl" in accepted && accepted.approvalUrl
        ? accepted.approvalUrl
        : `/${parsed.data.locale}/order/${accepted.order.reference}${"paymentError" in accepted ? "?error=PAYMENT_PROVIDER_UNAVAILABLE" : ""}`;
  } catch (error) {
    destination = `/${parsed.data.locale}/checkout?session=${encodeURIComponent(parsed.data.checkoutSessionId)}&error=${safeCheckoutError(error)}`;
  }
  redirect(destination);
}
