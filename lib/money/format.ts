import type { MinorAmount } from "./minor";

const fractionDigits: Record<string, number> = {
  EUR: 2,
  GEL: 2,
  USD: 2,
};

export function formatMinorMoney(
  amount: MinorAmount,
  currency: "GEL" | "EUR" | "USD",
  locale: "ka" | "en" | "de" | "ru",
) {
  const digits = fractionDigits[currency];
  const scale = 10 ** digits;
  const whole = Math.floor(amount / scale);
  const fraction = String(amount % scale).padStart(digits, "0");
  const separators = {
    en: { group: ",", decimal: "." },
    de: { group: ".", decimal: "," },
    ru: { group: "\u00a0", decimal: "," },
    ka: { group: "\u00a0", decimal: "." },
  } as const;
  const punctuation = separators[locale];
  const grouped = String(whole).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    punctuation.group,
  );
  const formatted = `${grouped}${punctuation.decimal}${fraction}`;
  return locale === "en"
    ? `${currency} ${formatted}`
    : `${formatted}\u00a0${currency}`;
}
