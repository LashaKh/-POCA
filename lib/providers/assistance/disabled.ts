import { AssistanceUnavailableError, type AssistanceProvider } from "./types";

export const disabledAssistanceProvider: AssistanceProvider = {
  key: "disabled",
  mode: "disabled",
  async suggestCatalogDraft() {
    throw new AssistanceUnavailableError();
  },
};
