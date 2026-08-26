import { z } from "zod";

export const suggestionLocaleSchema = z.enum(["ka", "en", "de", "ru"]);

export const localizedDraftSchema = z
  .object({
    locale: suggestionLocaleSchema,
    name: z.string().trim().min(1).max(180),
    shortDescription: z.string().trim().min(1).max(500),
    longDescription: z.string().trim().min(1).max(4_000),
    altText: z.string().trim().min(3).max(500),
    observedColorWords: z.array(z.string().trim().min(1).max(60)).max(12),
    observedPatternWords: z.array(z.string().trim().min(1).max(60)).max(12),
  })
  .strict();

export const catalogSuggestionSchema = z
  .object({
    drafts: z
      .array(localizedDraftSchema)
      .length(4)
      .superRefine((drafts, context) => {
        if (new Set(drafts.map((draft) => draft.locale)).size !== 4) {
          context.addIssue({
            code: "custom",
            message: "Each supported locale must occur once.",
          });
        }
      }),
    uncertaintyNote: z.string().trim().min(1).max(500),
  })
  .strict();

export type CatalogSuggestion = z.infer<typeof catalogSuggestionSchema>;

export const forbiddenAssistanceFields = new Set([
  "dimensions",
  "width",
  "length",
  "diameter",
  "material",
  "construction",
  "origin",
  "age",
  "condition",
  "price",
  "stock",
  "provenance",
  "authenticity",
  "artisan",
  "handmade",
  "sustainability",
]);

export function assertNoForbiddenFacts(value: unknown) {
  const inspect = (candidate: unknown): void => {
    if (Array.isArray(candidate)) {
      for (const item of candidate) inspect(item);
      return;
    }
    if (!candidate || typeof candidate !== "object") return;
    for (const [key, nested] of Object.entries(candidate)) {
      const normalized = key.replaceAll(/[_-]/g, "").toLowerCase();
      if (
        [...forbiddenAssistanceFields].some((field) =>
          normalized.includes(field),
        )
      ) {
        throw new TypeError("ASSISTANCE_FORBIDDEN_FACT");
      }
      inspect(nested);
    }
  };
  inspect(value);
}
