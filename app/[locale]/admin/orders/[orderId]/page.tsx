import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { FulfillmentPanel } from "@/components/admin/orders/fulfillment-panel";
import { OrderTimeline } from "@/components/admin/orders/order-timeline";
import { PaymentPanel } from "@/components/admin/orders/payment-panel";
import { TransferReview } from "@/components/admin/orders/transfer-review";
import { DataTable } from "@/components/ui/data-table";
import {
  addOrderNoteFormAction,
  retryNotificationFormAction,
  transitionOrderFormAction,
} from "@/features/orders/admin-actions";
import { getAdminOrderDetail } from "@/features/orders/admin-queries";
import { Link } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/routing";
import { formatMinorMoney } from "@/lib/money/format";
import { minorAmount } from "@/lib/money/minor";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>;
}) {
  const { locale, orderId } = await params;
  if (!isAppLocale(locale)) return null;
  setRequestLocale(locale);
  const [t, detail] = await Promise.all([
    getTranslations({ locale, namespace: "admin.orders" }),
    getAdminOrderDetail(orderId),
  ]);
  if (!detail) notFound();
  const { order } = detail;
  const payment = detail.payments[0];
  const fulfillment = detail.fulfillments[0];
  const pendingReconciliation = detail.reconciliations.find(
    (item) =>
      item.reconciliation_kind === "bank_transfer" && item.status === "pending",
  );
  const refundedMinor = detail.refunds
    .filter((item) => item.status === "succeeded")
    .reduce((total, item) => total + item.amount_minor, 0);
  const money = (value: number) =>
    formatMinorMoney(
      minorAmount(value),
      order.currency as "GEL" | "USD" | "EUR",
      locale,
    );
  return (
    <main className="admin-main admin-wide" id="main-content">
      <header className="admin-page-header">
        <Link href="/admin/orders" locale={locale}>
          ← {t("back")}
        </Link>
        <p className="eyebrow">{order.reference}</p>
        <h1>{t("detailTitle")}</h1>
        <p>
          {order.contact_email} · {order.contact_phone ?? "—"}
        </p>
      </header>
      <section className="admin-panel">
        <div className="section-heading">
          <h2>{t("snapshot")}</h2>
          <span className={`status-chip status-${order.status}`}>
            {order.status}
          </span>
        </div>
        <dl className="detail-list">
          <div>
            <dt>{t("total")}</dt>
            <dd>{money(order.total_minor)}</dd>
          </div>
          <div>
            <dt>{t("paymentStatus")}</dt>
            <dd>{order.payment_status}</dd>
          </div>
          <div>
            <dt>Locale</dt>
            <dd>{order.locale}</dd>
          </div>
          <div>
            <dt>Accepted</dt>
            <dd>
              <time dateTime={order.accepted_at}>
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "long",
                  timeStyle: "short",
                }).format(new Date(order.accepted_at))}
              </time>
            </dd>
          </div>
        </dl>
        <DataTable caption={t("items")}>
          <thead>
            <tr>
              <th>SKU</th>
              <th>{t("item")}</th>
              <th>{t("quantity")}</th>
              <th>{t("total")}</th>
            </tr>
          </thead>
          <tbody>
            {detail.lines.map((line) => (
              <tr key={line.id}>
                <td>{line.sku}</td>
                <td>{line.localized_name}</td>
                <td>{line.quantity}</td>
                <td>{money(line.total_minor)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </section>
      <section className="operation-grid">
        {order.payment_method === "bank_transfer" &&
        ["bank_transfer_review", "reconciliation_required"].includes(
          order.payment_status,
        ) ? (
          <TransferReview
            locale={locale}
            orderId={order.id}
            amountMinor={order.total_minor}
            currency={order.currency}
            pendingReconciliation={pendingReconciliation}
          />
        ) : null}
        <PaymentPanel
          locale={locale}
          orderId={order.id}
          paymentStatus={order.payment_status}
          paymentMethod={order.payment_method}
          provider={payment?.provider}
          providerReference={payment?.provider_reference}
          refundableMinor={Math.max(0, order.total_minor - refundedMinor)}
        />
        <FulfillmentPanel
          locale={locale}
          orderId={order.id}
          orderVersion={order.version}
          orderStatus={order.status}
          paymentStatus={order.payment_status}
          fulfillment={fulfillment}
        />
      </section>
      <section className="admin-panel">
        <h2>{t("transitions")}</h2>
        <div className="button-row">
          {order.status === "confirmed" ? (
            <form action={transitionOrderFormAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="orderId" value={order.id} />
              <input
                type="hidden"
                name="expectedVersion"
                value={order.version}
              />
              <input type="hidden" name="targetStatus" value="processing" />
              <input
                type="hidden"
                name="reason"
                value="Order preparation started"
              />
              <input
                type="hidden"
                name="idempotencyKey"
                value={crypto.randomUUID()}
              />
              <button className="button" type="submit">
                {t("startProcessing")}
              </button>
            </form>
          ) : null}
          {[
            "bank_transfer_pending",
            "payment_pending",
            "confirmed",
            "processing",
          ].includes(order.status) ? (
            <form action={transitionOrderFormAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="orderId" value={order.id} />
              <input
                type="hidden"
                name="expectedVersion"
                value={order.version}
              />
              <input type="hidden" name="targetStatus" value="cancelled" />
              <input
                type="hidden"
                name="reason"
                value="Cancelled by staff after confirmation"
              />
              <input
                type="hidden"
                name="idempotencyKey"
                value={crypto.randomUUID()}
              />
              <button className="button" type="submit">
                {t("cancel")}
              </button>
            </form>
          ) : null}
        </div>
      </section>
      <OrderTimeline events={detail.events} />
      <section className="admin-panel">
        <h2>{t("notes")}</h2>
        <form className="operation-form" action={addOrderNoteFormAction}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="orderId" value={order.id} />
          <label>
            {t("note")}
            <textarea name="note" minLength={2} maxLength={2000} required />
          </label>
          <button className="button" type="submit">
            {t("addNote")}
          </button>
        </form>
        <ul>
          {detail.notes.map((note) => (
            <li key={note.id}>
              {note.note}{" "}
              <time dateTime={note.created_at}>
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                }).format(new Date(note.created_at))}
              </time>
            </li>
          ))}
        </ul>
      </section>
      <section className="admin-panel">
        <h2>{t("notifications")}</h2>
        <ul className="notification-list">
          {detail.notifications.map((link) => {
            const notification = link.notifications;
            return notification ? (
              <li key={notification.id}>
                <strong>{link.purpose}</strong>
                <span>{notification.status}</span>
                {["failed", "bounced", "cancelled"].includes(
                  notification.status,
                ) ? (
                  <form action={retryNotificationFormAction}>
                    <input
                      type="hidden"
                      name="notificationId"
                      value={notification.id}
                    />
                    <button className="text-button" type="submit">
                      {t("retry")}
                    </button>
                  </form>
                ) : null}
              </li>
            ) : null;
          })}
        </ul>
      </section>
    </main>
  );
}
