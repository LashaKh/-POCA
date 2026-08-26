import { notFound, redirect } from "next/navigation";

import { approveFixturePayment } from "@/features/payments/fixture-approval";
import { isAppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function FixturePaymentApprovalPage({
  params,
}: {
  params: Promise<{ locale: string; providerReference: string }>;
}) {
  const { locale, providerReference } = await params;
  if (!isAppLocale(locale)) notFound();
  const order = await approveFixturePayment(providerReference);
  if (!order || order.locale !== locale) notFound();
  redirect(
    `/${locale}/payment/return?reference=${encodeURIComponent(order.reference)}`,
  );
}
