import "server-only";

import OpenAI from "openai";

import { getServerEnvironment } from "@/lib/env/server";
import { disabledAssistanceProvider } from "@/lib/providers/assistance/disabled";
import { OpenAIAssistanceProvider } from "@/lib/providers/assistance/openai";

export function getAssistanceProvider() {
  const environment = getServerEnvironment();
  if (
    (environment.ASSISTANCE_PROVIDER_MODE === "sandbox" ||
      environment.ASSISTANCE_PROVIDER_MODE === "live") &&
    environment.OPENAI_API_KEY
  ) {
    return new OpenAIAssistanceProvider(
      new OpenAI({
        apiKey: environment.OPENAI_API_KEY,
        maxRetries: 2,
        timeout: 30_000,
      }),
      environment.ASSISTANCE_PROVIDER_MODE,
    );
  }
  return disabledAssistanceProvider;
}
