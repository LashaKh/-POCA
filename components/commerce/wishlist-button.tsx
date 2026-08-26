"use client";

import { useActionState } from "react";

import {
  toggleWishlistAction,
  type WishlistActionState,
} from "@/features/wishlist/actions";
import type { AppLocale } from "@/i18n/routing";

export function WishlistButton({
  productId,
  locale,
  initialSaved = false,
  labels = {
    save: "Save",
    remove: "Remove from wishlist",
    failed: "Try again",
  },
}: {
  productId: string;
  locale: AppLocale;
  initialSaved?: boolean;
  labels?: { save: string; remove: string; failed: string };
}) {
  const [state, action, pending] = useActionState<
    WishlistActionState,
    FormData
  >(toggleWishlistAction, undefined);
  const saved = state?.ok ? state.data.saved : initialSaved;
  return (
    <form className="wishlist-control" action={action}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="locale" value={locale} />
      <button
        className="wishlist-button"
        type="submit"
        disabled={pending}
        aria-pressed={saved}
      >
        <span aria-hidden="true">{saved ? "♥" : "♡"}</span>{" "}
        {saved ? labels.remove : labels.save}
      </button>
      {state && !state.ok ? (
        <span className="field-error" role="alert">
          {labels.failed}
        </span>
      ) : null}
    </form>
  );
}
