import type { CatalogSuggestion } from "@/features/ingestion/suggestion-schema";

export type AssistanceRequest = {
  imageDataUrl: string;
  verifiedContext: {
    sku: string;
    supportedLocales: readonly ["ka", "en", "de", "ru"];
  };
};

export type AssistanceResult = {
  suggestion: CatalogSuggestion;
  providerKey: string;
  modelKey: string;
  schemaVersion: "v1";
};

export interface AssistanceProvider {
  readonly key: string;
  readonly mode: "disabled" | "sandbox" | "live";
  suggestCatalogDraft(request: AssistanceRequest): Promise<AssistanceResult>;
}

export class AssistanceUnavailableError extends Error {
  constructor() {
    super("ASSISTANCE_DISABLED");
    this.name = "AssistanceUnavailableError";
  }
}
