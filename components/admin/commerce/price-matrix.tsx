"use client";

import { useActionState } from "react";

import {
  saveMarketPriceAction,
  type PricingActionState,
} from "@/features/pricing/admin-actions";
import type { SupportedCurrency } from "@/i18n/preferences";
import type { AppLocale } from "@/i18n/routing";

type Price = {
  id: string;
  product_id: string;
  currency: string;
  amount_minor: number;
  market_code: string | null;
  source: string;
  source_reference: string | null;
  enabled: boolean;
  active_from: string;
  active_until: string;
  version: number;
};

function PriceForm({
  locale,
  product,
  currency,
  price,
  labels,
}: {
  locale: AppLocale;
  product: { id: string; sku: string | null; display_name: string | null };
  currency: SupportedCurrency;
  price?: Price;
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<PricingActionState, FormData>(
    saveMarketPriceAction,
    undefined,
  );
  const productName = product.display_name ?? product.sku ?? product.id;
  return (
    <form className="price-matrix-row" action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="productId" value={product.id} />
      <input type="hidden" name="currency" value={currency} />
      <input
        type="hidden"
        name="activeFrom"
        value={price?.active_from ?? new Date().toISOString()}
      />
      <input
        type="hidden"
        name="activeUntil"
        value={price?.active_until ?? "9999-12-31T23:59:59.999Z"}
      />
      <input type="hidden" name="expectedVersion" value={price?.version ?? 0} />
      <span>
        <strong>{product.display_name ?? product.sku}</strong>
        <small>{product.sku}</small>
      </span>
      <strong>{currency}</strong>
      <label>
        <span className="visually-hidden">{labels.amountMinor}</span>
        <input
          name="amountMinor"
          type="number"
          min="0"
          defaultValue={price?.amount_minor ?? 0}
          aria-label={`${labels.amountMinor} · ${productName} · ${currency}`}
          required
        />
      </label>
      <label>
        <span className="visually-hidden">{labels.market}</span>
        <input
          name="marketCode"
          defaultValue={price?.market_code ?? ""}
          placeholder={labels.global}
          pattern="[A-Z0-9-]{2,20}"
          aria-label={`${labels.market} · ${productName} · ${currency}`}
        />
      </label>
      <select
        name="source"
        defaultValue={price?.source ?? "explicit"}
        aria-label={`${labels.priceSource} · ${productName} · ${currency}`}
      >
        <option value="explicit">{labels.explicit}</option>
        <option value="approved_rate_snapshot">
          {labels.approvedSnapshot}
        </option>
      </select>
      <input
        name="sourceReference"
        defaultValue={price?.source_reference ?? ""}
        placeholder={labels.rateReference}
        aria-label={`${labels.rateReference} · ${productName} · ${currency}`}
      />
      <label className="checkbox-field">
        <input name="enabled" type="checkbox" defaultChecked={price?.enabled} />
        <span>{labels.enabled}</span>
      </label>
      <input
        name="reason"
        placeholder={labels.reason}
        aria-label={`${labels.reason} · ${productName} · ${currency}`}
        minLength={2}
        required
      />
      <button className="button" type="submit" disabled={pending}>
        {labels.save}
      </button>
      <span role="status">
        {state?.ok ? labels.saved : state ? labels.failed : ""}
      </span>
    </form>
  );
}

export function PriceMatrix({
  locale,
  products,
  prices,
  labels,
}: {
  locale: AppLocale;
  products: Array<{
    id: string;
    sku: string | null;
    display_name: string | null;
  }>;
  prices: Price[];
  labels: Record<string, string>;
}) {
  return (
    <section
      className="admin-panel price-matrix-panel"
      aria-labelledby="price-matrix-title"
    >
      <h2 id="price-matrix-title">{labels.priceMatrix}</h2>
      <p>{labels.priceMatrixHelp}</p>
      <div className="price-matrix">
        {products.flatMap((product) =>
          (["GEL", "USD", "EUR"] as const).map((currency) => (
            <PriceForm
              key={`${product.id}:${currency}`}
              locale={locale}
              product={product}
              currency={currency}
              price={prices.find(
                (candidate) =>
                  candidate.product_id === product.id &&
                  candidate.currency === currency,
              )}
              labels={labels}
            />
          )),
        )}
      </div>
    </section>
  );
}
