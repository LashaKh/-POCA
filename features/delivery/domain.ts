import type { SupportedCurrency } from "@/i18n/preferences";

export type DeliveryRule = {
  zonePriority: number;
  ratePriority: number;
  countryCode: string;
  currency: SupportedCurrency;
  minimumSubtotalMinor: number;
  maximumSubtotalMinor?: number;
  deliveryClasses: string[];
  manualQuote: boolean;
  amountMinor: number;
  methodCode: string;
};

export function resolveDeliveryRule(
  rules: DeliveryRule[],
  input: {
    countryCode: string;
    currency: SupportedCurrency;
    subtotalMinor: number;
    deliveryClasses: string[];
  },
) {
  return rules
    .filter(
      (rule) =>
        rule.countryCode === input.countryCode &&
        rule.currency === input.currency &&
        input.subtotalMinor >= rule.minimumSubtotalMinor &&
        (rule.maximumSubtotalMinor === undefined ||
          input.subtotalMinor <= rule.maximumSubtotalMinor) &&
        (rule.deliveryClasses.length === 0 ||
          input.deliveryClasses.every((value) =>
            rule.deliveryClasses.includes(value),
          )),
    )
    .sort(
      (left, right) =>
        right.zonePriority - left.zonePriority ||
        right.ratePriority - left.ratePriority ||
        left.methodCode.localeCompare(right.methodCode),
    )[0];
}

export function deliveryFallback(
  resolved: DeliveryRule | undefined,
): "checkout" | "manual-quote" {
  return !resolved || resolved.manualQuote ? "manual-quote" : "checkout";
}

export function customsDisclosure(input: {
  responsibility?: string;
  legalStatus?: string;
}) {
  if (
    !input.responsibility ||
    input.responsibility === "pending_legal_review" ||
    input.legalStatus !== "approved"
  ) {
    return { state: "pending-review" as const, promiseMade: false };
  }
  return {
    state: input.responsibility as
      | "buyer_unless_confirmed"
      | "seller"
      | "included_by_carrier",
    promiseMade: input.responsibility !== "buyer_unless_confirmed",
  };
}
