import { addMinor, minorAmount, type MinorAmount } from "@/lib/money/minor";

export type ReconciliationDecision =
  | "unchanged"
  | "acknowledgement-required"
  | "accepted-change";

export function decideReconciliation(
  previousTotal: MinorAmount,
  currentTotal: MinorAmount,
  acceptedChange: boolean,
): ReconciliationDecision {
  if (previousTotal === currentTotal) return "unchanged";
  return acceptedChange ? "accepted-change" : "acknowledgement-required";
}

export function calculateCheckoutTotal(input: {
  subtotal: MinorAmount;
  discount: MinorAmount;
  tax: MinorAmount;
  delivery: MinorAmount;
}) {
  if (input.discount > input.subtotal) {
    throw new RangeError("Discount cannot exceed subtotal.");
  }
  return addMinor(
    minorAmount(input.subtotal - input.discount),
    input.tax,
    input.delivery,
  );
}

export function deliveryDecision(input: {
  methodAvailable: boolean;
  manualQuote: boolean;
}) {
  if (!input.methodAvailable) return "unavailable" as const;
  if (input.manualQuote) return "manual-quote" as const;
  return "purchasable" as const;
}
