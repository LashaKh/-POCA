"use client";

import { useActionState } from "react";

import {
  updateCartItemAction,
  type CartActionState,
} from "@/features/cart/actions";
import type { CartView } from "@/features/cart/schema";
import type { AppLocale } from "@/i18n/routing";
import { formatMinorMoney } from "@/lib/money/format";
import { minorAmount } from "@/lib/money/minor";

export function CartLine({
  item,
  currency,
  locale,
  labels,
}: {
  item: CartView["items"][number];
  currency: CartView["currency"];
  locale: AppLocale;
  labels: { quantity: string; update: string; remove: string; failed: string };
}) {
  const [state, action, pending] = useActionState<CartActionState, FormData>(
    updateCartItemAction,
    undefined,
  );
  return (
    <article className="cart-line">
      <div>
        <p className="eyebrow">{item.sku}</p>
        <h2>{item.name}</h2>
        <p>
          {formatMinorMoney(
            minorAmount(item.unitAmountMinor),
            currency,
            locale,
          )}
        </p>
      </div>
      <form action={action}>
        <input type="hidden" name="itemId" value={item.id} />
        <input type="hidden" name="locale" value={locale} />
        <label>
          <span>{labels.quantity}</span>
          <input
            name="quantity"
            type="number"
            inputMode="numeric"
            min="0"
            max={Math.min(20, item.availableQuantity)}
            defaultValue={item.quantity}
            disabled={pending}
          />
        </label>
        <button className="button" type="submit" disabled={pending}>
          {labels.update}
        </button>
        <button
          className="text-button"
          type="submit"
          name="quantity"
          value="0"
          disabled={pending}
        >
          {labels.remove}
        </button>
      </form>
      {state && !state.ok ? (
        <p className="field-error" role="alert">
          {labels.failed}
        </p>
      ) : null}
    </article>
  );
}
