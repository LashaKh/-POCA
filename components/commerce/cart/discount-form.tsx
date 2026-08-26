"use client";

import { useActionState } from "react";

import {
  applyDiscountAction,
  type CartActionState,
} from "@/features/cart/actions";
import type { AppLocale } from "@/i18n/routing";

export function DiscountForm({
  locale,
  currentCode,
  labels,
}: {
  locale: AppLocale;
  currentCode?: string;
  labels: { code: string; apply: string; applied: string; failed: string };
}) {
  const [state, action, pending] = useActionState<CartActionState, FormData>(
    applyDiscountAction,
    undefined,
  );
  return (
    <form className="discount-form" action={action}>
      <input type="hidden" name="locale" value={locale} />
      <label>
        <span>{labels.code}</span>
        <input name="code" maxLength={40} defaultValue={currentCode} />
      </label>
      <button className="button" type="submit" disabled={pending}>
        {labels.apply}
      </button>
      <span role="status" aria-live="polite">
        {state?.ok ? labels.applied : state ? labels.failed : ""}
      </span>
    </form>
  );
}
