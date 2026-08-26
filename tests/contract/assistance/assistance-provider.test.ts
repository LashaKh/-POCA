import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  assertNoForbiddenFacts,
  catalogSuggestionSchema,
} from "@/features/ingestion/suggestion-schema";
import { disabledAssistanceProvider } from "@/lib/providers/assistance/disabled";
import { OPENAI_ASSISTANCE_MODEL } from "@/lib/providers/assistance/openai";

const safeDrafts = ["ka", "en", "de", "ru"].map((locale) => ({
  locale,
  name: `Visible carpet ${locale}`,
  shortDescription: "A cautious visual description.",
  longDescription: "A draft based only on visible color and pattern.",
  altText: "A carpet shown against a neutral background.",
  observedColorWords: ["blue"],
  observedPatternWords: ["geometric"],
}));

describe("assistance contract", () => {
  it("keeps the provider disabled without an approved configuration", async () => {
    await expect(
      disabledAssistanceProvider.suggestCatalogDraft({
        imageDataUrl: "data:image/jpeg;base64,AA==",
        verifiedContext: {
          sku: "TEST",
          supportedLocales: ["ka", "en", "de", "ru"],
        },
      }),
    ).rejects.toThrow("ASSISTANCE_DISABLED");
  });

  it("accepts only four strict localized suggestion records", () => {
    expect(
      catalogSuggestionSchema.parse({
        drafts: safeDrafts,
        uncertaintyNote: "Human review required.",
      }).drafts,
    ).toHaveLength(4);
    expect(() =>
      catalogSuggestionSchema.parse({
        drafts: safeDrafts.slice(0, 3),
        uncertaintyNote: "Incomplete.",
      }),
    ).toThrow();
    expect(() =>
      catalogSuggestionSchema.parse({
        drafts: safeDrafts.map((draft) => ({ ...draft, material: "wool" })),
        uncertaintyNote: "Unsafe.",
      }),
    ).toThrow();
  });

  it("guards nested output against forbidden catalog facts", () => {
    expect(() =>
      assertNoForbiddenFacts({ draft: { originCountry: "Unknown" } }),
    ).toThrow("ASSISTANCE_FORBIDDEN_FACT");
    expect(() => assertNoForbiddenFacts({ drafts: safeDrafts })).not.toThrow();
  });

  it("pins the reviewed Responses API snapshot", () => {
    expect(OPENAI_ASSISTANCE_MODEL).toBe("gpt-5.4-mini-2026-03-17");
  });
});
