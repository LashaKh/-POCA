import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Notice } from "@/components/ui";
import { getHostedPaymentReturn } from "@/features/payments/return-service";
import { Link } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function PaymentReturnPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ reference?: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  setRequestLocale(locale);
  const { reference } = await searchParams;
  if (!reference) notFound();
  const [t, record] = await Promise.all([
    getTranslations({ locale, namespace: "commerce.paymentReturn" }),
    getHostedPaymentReturn(reference, locale),
  ]);
  if (!record) notFound();
  const paid = ["paid", "partially_refunded", "refunded"].includes(
    record.order.payment_status,
  );
  const failed = ["failed", "expired", "cancelled"].includes(
    record.order.payment_status,
  );
  return (
    <main className="commerce-page" id="main-content">
      <p className="eyebrow">ÉPOCA</p>
      <h1>{t("title")}</h1>
      <Notice tone={paid ? "success" : failed ? "error" : "warning"}>
        {paid ? t("paid") : failed ? t("failed") : t("pending")}
      </Notice>
      <p>{t("reference", { reference: record.order.reference })}</p>
      <Link href={`/order/${record.order.reference}`} locale={locale}>
        {t("viewOrder")}
      </Link>
    </main>
  );
}
