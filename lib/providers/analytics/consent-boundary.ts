import type {
  AnalyticsAdapter,
  AnalyticsEnvelope,
  AnalyticsResult,
} from "./contract";

export function analyticsConsentFromCookie(cookieHeader: string) {
  const encoded = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("epoca_optional_consent="))
    ?.slice("epoca_optional_consent=".length);
  if (!encoded) return "refused" as const;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(encoded));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const choice = (parsed as Record<string, unknown>).analytics;
      if (
        choice === "granted" ||
        choice === "withdrawn" ||
        choice === "refused"
      )
        return choice;
    }
  } catch {
    return "refused" as const;
  }
  return "refused" as const;
}

export function createConsentBoundAnalytics(
  adapter: AnalyticsAdapter,
  readCookie: () => string,
) {
  return {
    capabilities: adapter.capabilities,
    captured: (): readonly AnalyticsEnvelope[] => adapter.captured(),
    track(
      name: string,
      properties: Record<string, unknown>,
    ): Promise<AnalyticsResult> {
      return adapter.track({
        consent: analyticsConsentFromCookie(readCookie()),
        name,
        properties,
      });
    },
  };
}
