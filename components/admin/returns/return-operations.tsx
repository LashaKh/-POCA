import {
  applyReturnRestockAction,
  decideReturnRequestAction,
  inspectReturnAction,
  markReturnInTransitAction,
  processReturnRefundAction,
  recordReturnReceiptAction,
  requestReturnInformationAction,
} from "@/features/returns/actions";
import type { AppLocale } from "@/i18n/routing";

async function requestInformationFormAction(formData: FormData) {
  "use server";
  await requestReturnInformationAction(formData);
}

async function decideRequestFormAction(formData: FormData) {
  "use server";
  await decideReturnRequestAction(formData);
}

async function markInTransitFormAction(formData: FormData) {
  "use server";
  await markReturnInTransitAction(formData);
}

async function recordReceiptFormAction(formData: FormData) {
  "use server";
  await recordReturnReceiptAction(formData);
}

async function inspectFormAction(formData: FormData) {
  "use server";
  await inspectReturnAction(formData);
}

async function refundFormAction(formData: FormData) {
  "use server";
  await processReturnRefundAction(formData);
}

async function restockFormAction(formData: FormData) {
  "use server";
  await applyReturnRestockAction(formData);
}

function HiddenContext({
  locale,
  requestId,
  version,
}: {
  locale: AppLocale;
  requestId: string;
  version: number;
}) {
  return (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="returnRequestId" value={requestId} />
      <input type="hidden" name="expectedVersion" value={version} />
      <input
        type="hidden"
        name="idempotencyToken"
        value={crypto.randomUUID()}
      />
    </>
  );
}

export function ReturnOperations({
  locale,
  request,
  labels,
}: {
  locale: AppLocale;
  labels: Record<string, string>;
  request: {
    id: string;
    version: number;
    status: string;
    request_kind: string;
    orders: { currency: string; total_minor: number };
    return_items: Array<{
      id: string;
      quantity: number;
      refund_amount_minor: number | null;
      order_lines: { localized_name: string; total_minor: number };
    }>;
  };
}) {
  const t = (key: string, values: Record<string, string | number> = {}) =>
    Object.entries(values).reduce(
      (message, [name, value]) =>
        message.replaceAll(`{${name}}`, String(value)),
      labels[key] ?? key,
    );
  const context = {
    locale,
    requestId: request.id,
    version: request.version,
  };
  return (
    <section
      className="return-operations"
      aria-labelledby="return-operations-title"
    >
      <h2 id="return-operations-title">{t("title")}</h2>
      {["requested", "needs_information"].includes(request.status) ? (
        <div className="admin-card-grid">
          <form
            className="stack-form admin-card"
            action={requestInformationFormAction}
          >
            <HiddenContext {...context} />
            <h3>{t("requestInformation")}</h3>
            <label>
              <span>{t("buyerMessage")}</span>
              <textarea
                name="message"
                minLength={2}
                maxLength={2000}
                required
              />
            </label>
            <button className="button" type="submit">
              {t("sendRequest")}
            </button>
          </form>
          <form
            className="stack-form admin-card"
            action={decideRequestFormAction}
          >
            <HiddenContext {...context} />
            <h3>{t("decision")}</h3>
            <label>
              <span>{t("decision")}</span>
              <select name="decision" defaultValue="approve">
                <option value="approve">{t("approve")}</option>
                <option value="reject">{t("reject")}</option>
              </select>
            </label>
            <label>
              <span>{t("buyerReason")}</span>
              <textarea name="reason" minLength={2} maxLength={2000} required />
            </label>
            <button className="button" type="submit">
              {t("recordDecision")}
            </button>
          </form>
        </div>
      ) : null}
      {["approved", "in_transit"].includes(request.status) ? (
        <div className="admin-card-grid">
          {request.status === "approved" &&
          request.request_kind === "return" ? (
            <form
              className="stack-form admin-card"
              action={markInTransitFormAction}
            >
              <HiddenContext {...context} />
              <h3>{t("returnShipment")}</h3>
              <label>
                <span>{t("transitNote")}</span>
                <textarea name="note" minLength={2} maxLength={2000} required />
              </label>
              <button className="button" type="submit">
                {t("markInTransit")}
              </button>
            </form>
          ) : null}
          <form
            className="stack-form admin-card"
            action={recordReceiptFormAction}
          >
            <HiddenContext {...context} />
            <h3>{t("receipt")}</h3>
            <label>
              <span>{t("receiptNote")}</span>
              <textarea name="note" minLength={2} maxLength={2000} required />
            </label>
            <button className="button" type="submit">
              {t("recordReceipt")}
            </button>
          </form>
        </div>
      ) : null}
      {request.status === "received" ? (
        <form className="stack-form admin-panel" action={inspectFormAction}>
          <HiddenContext {...context} />
          <h3>{t("inspection")}</h3>
          <label>
            <span>{t("inspectionSummary")}</span>
            <textarea name="summary" minLength={2} maxLength={2000} required />
          </label>
          <label>
            <span>{t("packageCondition")}</span>
            <textarea name="packageCondition" maxLength={500} />
          </label>
          {request.return_items.map((item) => (
            <fieldset key={item.id} className="return-inspection-item">
              <legend>
                {item.order_lines.localized_name} × {item.quantity}
              </legend>
              <input type="hidden" name="itemId" value={item.id} />
              <label>
                <span>{t("condition")}</span>
                <select name="condition" defaultValue="like_new">
                  <option value="unopened">{t("conditionUnopened")}</option>
                  <option value="like_new">{t("conditionLikeNew")}</option>
                  <option value="used">{t("conditionUsed")}</option>
                  <option value="damaged">{t("conditionDamaged")}</option>
                  <option value="missing">{t("conditionMissing")}</option>
                </select>
              </label>
              <label>
                <span>{t("restockDecision")}</span>
                <select name="restockDecision" defaultValue="do_not_restock">
                  <option value="restock">{t("restock")}</option>
                  <option value="do_not_restock">{t("doNotRestock")}</option>
                </select>
              </label>
              <label>
                <span>
                  {t("refundMinor", { maximum: item.order_lines.total_minor })}
                </span>
                <input
                  name="refundAmountMinor"
                  type="number"
                  min="0"
                  max={item.order_lines.total_minor}
                  defaultValue="0"
                  required
                />
              </label>
              <label>
                <span>{t("itemNote")}</span>
                <textarea name="itemNote" maxLength={1000} />
              </label>
            </fieldset>
          ))}
          <button className="button" type="submit">
            {t("recordInspection")}
          </button>
        </form>
      ) : null}
      {["inspected", "refund_pending", "refunded"].includes(request.status) ? (
        <div className="admin-card-grid">
          {request.status !== "refunded" ? (
            <form className="stack-form admin-card" action={refundFormAction}>
              <HiddenContext {...context} />
              <h3>{t("refund")}</h3>
              <p>
                {t("proposedRefund", {
                  amount: request.return_items.reduce(
                    (sum, item) => sum + (item.refund_amount_minor ?? 0),
                    0,
                  ),
                  currency: request.orders.currency,
                })}
              </p>
              <label>
                <span>{t("reason")}</span>
                <textarea
                  name="reason"
                  minLength={2}
                  maxLength={500}
                  required
                />
              </label>
              <label>
                <span>{t("externalReference")}</span>
                <input
                  name="providerReference"
                  minLength={2}
                  maxLength={180}
                  required
                />
              </label>
              <button className="button" type="submit">
                {t("issueRefund")}
              </button>
            </form>
          ) : null}
          <form className="stack-form admin-card" action={restockFormAction}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="returnRequestId" value={request.id} />
            <input
              type="hidden"
              name="idempotencyToken"
              value={crypto.randomUUID()}
            />
            <h3>{t("inventory")}</h3>
            <p>{t("restockHelp")}</p>
            <button className="button" type="submit">
              {t("applyRestock")}
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}
