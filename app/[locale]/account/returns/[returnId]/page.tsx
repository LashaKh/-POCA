import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { ReturnStatus } from "@/components/returns/return-status";
import { getCustomerReturn } from "@/features/returns/queries";
import { buildBuyerReturnLabels } from "@/features/returns/copy";
import { isAppLocale } from "@/i18n/routing";

export default async function CustomerReturnPage({
  params,
}: {
  params: Promise<{ locale: string; returnId: string }>;
}) {
  const { locale, returnId } = await params;
  if (!isAppLocale(locale)) return null;
  const [t, request] = await Promise.all([
    getTranslations({ locale, namespace: "returns" }),
    getCustomerReturn(returnId),
  ]);
  if (!request) notFound();
  const labels = buildBuyerReturnLabels(t);
  return (
    <main className="account-page" id="main-content">
      <h1>{t("accountTitle")}</h1>
      <ReturnStatus
        locale={locale}
        orderReference={request.orders.reference}
        request={request}
        labels={labels}
      />
    </main>
  );
}
