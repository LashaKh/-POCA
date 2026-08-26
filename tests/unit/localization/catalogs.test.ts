import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { renderOrderEmail } from "@/emails/order";
import { renderQuoteNotification } from "@/emails/quotes";
import { renderReturnNotification } from "@/emails/returns";
import { locales } from "@/i18n/routing";

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return [prefix];
  return Object.entries(value).flatMap(([key, nested]) =>
    leafKeys(nested, prefix ? `${prefix}.${key}` : key),
  );
}

describe("four-locale product surface", () => {
  it("keeps every message catalog on the same complete key contract", () => {
    const catalogs = Object.fromEntries(
      locales.map((locale) => [
        locale,
        JSON.parse(
          fs.readFileSync(path.resolve(`messages/${locale}.json`), "utf8"),
        ) as unknown,
      ]),
    );
    const expected = leafKeys(catalogs.en).sort();
    expect(expected.length).toBeGreaterThan(900);
    for (const locale of locales) {
      expect(leafKeys(catalogs[locale]).sort()).toEqual(expected);
    }
  });

  it("renders order, quote, and return subjects and bodies in every locale", () => {
    for (const locale of locales) {
      const order = renderOrderEmail(locale, {
        orderReference: "EPO-TEST123456",
        amount: "1,000 GEL",
        dueAt: "2026-08-30",
        beneficiary: "ÉPOCA",
        bank: "Configured bank",
        iban: "GE00TEST",
        instructions: "Use the order reference.",
      });
      const quote = renderQuoteNotification(locale, {
        templateKey: "quote-ready",
        quoteReference: "QUO-TEST123456",
        amount: "1,000 GEL",
      });
      const returnMessage = renderReturnNotification(locale, {
        templateKey: "return-approved",
        orderReference: "EPO-TEST123456",
        returnReference: "RET-TEST123456",
      });
      for (const rendered of [order, quote, returnMessage]) {
        expect(rendered.subject).toContain("ÉPOCA");
        expect(rendered.text.length).toBeGreaterThan(20);
        expect(rendered.html).not.toContain("undefined");
      }
    }
  });
});
