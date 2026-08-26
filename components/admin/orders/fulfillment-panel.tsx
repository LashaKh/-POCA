import {
  createShipmentFormAction,
  recordDeliveryFormAction,
} from "@/features/orders/admin-actions";
import type { AppLocale } from "@/i18n/routing";

export function FulfillmentPanel({
  locale,
  orderId,
  orderVersion,
  orderStatus,
  paymentStatus,
  fulfillment,
}: {
  locale: AppLocale;
  orderId: string;
  orderVersion: number;
  orderStatus: string;
  paymentStatus: string;
  fulfillment?: {
    id: string;
    status: string;
    carrier: string;
    tracking_reference: string;
    tracking_url: string | null;
  };
}) {
  const canShip =
    paymentStatus === "paid" &&
    ["confirmed", "processing"].includes(orderStatus);
  return (
    <section className="admin-panel" aria-labelledby="fulfillment-title">
      <h2 id="fulfillment-title">Fulfillment</h2>
      {fulfillment ? (
        <>
          <dl className="detail-list">
            <div>
              <dt>Status</dt>
              <dd>{fulfillment.status}</dd>
            </div>
            <div>
              <dt>Carrier</dt>
              <dd>{fulfillment.carrier}</dd>
            </div>
            <div>
              <dt>Tracking</dt>
              <dd>{fulfillment.tracking_reference}</dd>
            </div>
          </dl>
          {fulfillment.status === "dispatched" ? (
            <form className="operation-form" action={recordDeliveryFormAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="orderId" value={orderId} />
              <input
                type="hidden"
                name="fulfillmentId"
                value={fulfillment.id}
              />
              <input
                type="hidden"
                name="eventKey"
                value={`manual-delivery-${fulfillment.id}`}
              />
              <label>
                Safe delivery location (optional)
                <input name="safeLocation" maxLength={160} />
              </label>
              <button className="button" type="submit">
                Mark delivered
              </button>
            </form>
          ) : null}
        </>
      ) : canShip ? (
        <form className="operation-form" action={createShipmentFormAction}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="expectedVersion" value={orderVersion} />
          <input
            type="hidden"
            name="idempotencyKey"
            value={crypto.randomUUID()}
          />
          <label>
            Carrier
            <input name="carrier" required maxLength={120} />
          </label>
          <label>
            Service level
            <input name="serviceLevel" maxLength={120} />
          </label>
          <label>
            Tracking reference
            <input name="trackingReference" required maxLength={180} />
          </label>
          <label>
            Tracking URL
            <input name="trackingUrl" type="url" maxLength={500} />
          </label>
          <button className="button" type="submit">
            Dispatch shipment
          </button>
        </form>
      ) : (
        <p className="muted-copy">
          Shipment becomes available only after authoritative payment
          confirmation and order preparation.
        </p>
      )}
    </section>
  );
}
