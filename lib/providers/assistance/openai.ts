import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import {
  assertNoForbiddenFacts,
  catalogSuggestionSchema,
} from "@/features/ingestion/suggestion-schema";

import type {
  AssistanceProvider,
  AssistanceRequest,
  AssistanceResult,
} from "./types";

export const OPENAI_ASSISTANCE_MODEL = "gpt-5.4-mini-2026-03-17";

export class OpenAIAssistanceProvider implements AssistanceProvider {
  readonly key = "openai";

  constructor(
    private readonly client: OpenAI,
    readonly mode: "sandbox" | "live",
  ) {}

  async suggestCatalogDraft(
    request: AssistanceRequest,
  ): Promise<AssistanceResult> {
    if (!request.imageDataUrl.startsWith("data:image/")) {
      throw new TypeError("ASSISTANCE_IMAGE_MUST_BE_REDACTED_DATA");
    }
    const response = await this.client.responses.parse({
      model: OPENAI_ASSISTANCE_MODEL,
      store: false,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Draft cautious catalog copy in Georgian, English, German, and Russian from visible appearance only. Never infer dimensions, material, construction, origin, age, condition, price, stock, provenance, authenticity, artisan, handmade, or sustainability claims. State uncertainty and do not repeat embedded image metadata.",
            },
            {
              type: "input_image",
              detail: "low",
              image_url: request.imageDataUrl,
            },
          ],
        },
      ],
      text: {
        format: zodTextFormat(
          catalogSuggestionSchema,
          "epoca_catalog_draft_v1",
        ),
      },
    });
    const parsed = response.output_parsed;
    if (!parsed) throw new Error("ASSISTANCE_EMPTY_RESPONSE");
    assertNoForbiddenFacts(parsed);
    return {
      suggestion: catalogSuggestionSchema.parse(parsed),
      providerKey: this.key,
      modelKey: OPENAI_ASSISTANCE_MODEL,
      schemaVersion: "v1",
    };
  }
}
