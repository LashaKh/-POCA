import { z } from "zod";

import { locales } from "@/i18n/routing";

export const consentPreferenceSchema = z.object({
  locale: z.enum(locales),
  analytics: z.enum(["granted", "refused", "withdrawn"]),
  preferences: z.enum(["granted", "refused", "withdrawn"]),
  analyticsDisclosureVersion: z.string().min(2).max(80),
  preferencesDisclosureVersion: z.string().min(2).max(80),
  currency: z.enum(["GEL", "USD", "EUR"]).optional(),
});
