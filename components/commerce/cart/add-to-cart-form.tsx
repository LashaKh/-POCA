"use client";

import { useActionState } from "react";

import { addToCartAction, type CartActionState } from "@/features/cart/actions";
import type { AppLocale } from "@/i18n/routing";

export function AddToCartForm({
  productId,
  locale,
  available,
  labels,
}: {
  productId: string;
  locale: AppLocale;
  available: boolean;
  labels: { add: string; added: string; failed: string; quantity: string };
}) {
  const [state, action, pending] = useActionState<CartActionState, FormData>(
    addToCartAction,
    undefined,
  );

  return (
    <form className="add-to-cart" action={action}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="locale" value={locale} />
      <label>
        <span>{labels.quantity}</span>
        <input
          name="quantity"
          type="number"
          inputMode="numeric"
          min="1"
          max="20"
          defaultValue="1"
          disabled={!available || pending}
        />
      </label>
      <button className="button" type="submit" disabled={!available || pending}>
        {labels.add}
      </button>
      <p className="form-feedback" role="status" aria-live="polite">
        {state?.ok ? labels.added : state ? labels.failed : ""}
      </p>
    </form>
  );
}
