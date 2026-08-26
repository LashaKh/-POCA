import type { SupportedCurrency } from "@/i18n/preferences";

export type MarketPrice = {
  currency: SupportedCurrency;
  amountMinor: number;
  marketCode?: string;
  enabled: boolean;
  activeFrom: Date;
  activeUntil: Date;
  source: "explicit" | "approved_rate_snapshot";
  sourceReference?: string;
};

export function resolveMarketPrice(
  prices: MarketPrice[],
  input: {
    currency: SupportedCurrency;
    marketCode?: string;
    at?: Date;
    approvedRateReference?: string;
  },
) {
  const at = input.at ?? new Date();
  return prices
    .filter(
      (price) =>
        price.currency === input.currency &&
        price.enabled &&
        price.activeFrom <= at &&
        price.activeUntil > at &&
        (!price.marketCode || price.marketCode === input.marketCode) &&
        (price.source === "explicit" ||
          (Boolean(input.approvedRateReference) &&
            price.sourceReference === input.approvedRateReference)),
    )
    .sort((left, right) => {
      const leftSpecific = left.marketCode === input.marketCode ? 1 : 0;
      const rightSpecific = right.marketCode === input.marketCode ? 1 : 0;
      return rightSpecific - leftSpecific;
    })[0];
}

export function requireExactMinorAmount(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError("INVALID_MINOR_AMOUNT");
  }
  return value;
}
