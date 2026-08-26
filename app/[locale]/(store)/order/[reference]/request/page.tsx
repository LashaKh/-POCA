import { randomUUID } from "node:crypto";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { ReturnRequestForm } from "@/components/returns/request-form";
import { ReturnStatus } from "@/components/returns/return-status";
import {
  getCustomerReturn,
  getGuestReturn,
  getViewerReturnEligibility,
  getViewerReturnsForOrder,
} from "@/features/returns/queries";
import { buildBuyerReturnLabels } from "@/features/returns/copy";
import { Link } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function OrderRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; reference: string }>;
  searchParams: Promise<{ kind?: string; returnId?: string }>;
}) {
  const [{ locale, reference }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  if (!isAppLocale(locale)) return null;
  const kind = query.kind === "cancellation" ? "cancellation" : "return";
  const [t, eligibilityRecord, orderReturns] = await Promise.all([
    getTranslations({ locale, namespace: "returns" }),
    getViewerReturnEligibility(reference, locale, kind),
    getViewerReturnsForOrder(reference, locale),
  ]);
  if (!eligibilityRecord || !orderReturns) notFound();
  const labels = buildBuyerReturnLabels(t);
  const selectedReturn = query.returnId
    ? ((await getCustomerReturn(query.returnId)) ??
      (await getGuestReturn(query.returnId, reference, locale)))
    : undefined;
  return (
    <main className="commerce-page return-page" id="main-content">
      <header className="commerce-header">
        <p className="eyebrow">{reference}</p>
        <h1>{t("title")}</h1>
        <p>{t("intro")}</p>
      </header>
      <nav className="account-navigation" aria-label={t("requestType")}>
        <Link href={`/order/${reference}/request?kind=return`} locale={locale}>
          {t("returnTab")}
        </Link>
        <Link
          href={`/order/${reference}/request?kind=cancellation`}
          locale={locale}
        >
          {t("cancellationTab")}
        </Link>
      </nav>
      {selectedReturn ? (
        <ReturnStatus
          locale={locale}
          orderReference={reference}
          request={selectedReturn}
          labels={labels}
        />
      ) : (
        <ReturnRequestForm
          locale={locale}
          orderReference={reference}
          requestKind={kind}
          idempotencyToken={randomUUID()}
          lines={eligibilityRecord.order.lines.map((line) => ({
            id: line.id,
            name: line.localized_name,
            quantity: line.quantity,
          }))}
          eligibility={eligibilityRecord.eligibility}
          labels={labels}
        />
      )}
      {orderReturns.requests.length ? (
        <section className="account-panel">
          <h2>{t("existing")}</h2>
          <ul>
            {orderReturns.requests.map((request) => (
              <li key={request.id}>
                <a
                  href={`/${locale}/order/${reference}/request?returnId=${request.id}`}
                >
                  {request.reference} ·{" "}
                  {labels[`status_${request.status}`] ?? request.status}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
