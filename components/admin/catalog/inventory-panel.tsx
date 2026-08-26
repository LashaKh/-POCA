import { adjustInventoryFormAction } from "@/features/catalog/admin-actions";
import type { AppLocale } from "@/i18n/routing";

export function InventoryPanel({
  locale,
  productId,
  inventory,
  labels,
}: {
  locale: AppLocale;
  productId: string;
  inventory: {
    version: number;
    stockModel: string;
    onHand: number;
    reserved: number;
    available: number;
  };
  labels: Record<string, string>;
}) {
  return (
    <section className="admin-panel" aria-labelledby="inventory-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{labels.inventoryEyebrow}</p>
          <h2 id="inventory-heading">{labels.inventory}</h2>
        </div>
        <span className="status-chip">{inventory.stockModel}</span>
      </div>
      <dl className="detail-list">
        <div>
          <dt>{labels.onHand}</dt>
          <dd>{inventory.onHand}</dd>
        </div>
        <div>
          <dt>{labels.reserved}</dt>
          <dd>{inventory.reserved}</dd>
        </div>
        <div>
          <dt>{labels.available}</dt>
          <dd>{inventory.available}</dd>
        </div>
      </dl>
      <form
        className="operation-form inventory-adjustment"
        action={adjustInventoryFormAction}
      >
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="productId" value={productId} />
        <input
          type="hidden"
          name="expectedInventoryVersion"
          value={inventory.version}
        />
        <input
          type="hidden"
          name="idempotencyKey"
          value={crypto.randomUUID()}
        />
        <label>
          <span>{labels.quantityDelta}</span>
          <input
            name="quantityDelta"
            type="number"
            min={-1000000}
            max={1000000}
            required
          />
        </label>
        <label>
          <span>{labels.reason}</span>
          <input name="reason" minLength={2} maxLength={500} required />
        </label>
        <button className="button" type="submit">
          {labels.adjustStock}
        </button>
      </form>
      <p className="muted-copy">{labels.inventorySafety}</p>
    </section>
  );
}
