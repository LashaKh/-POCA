import { z } from "zod";

import { locales } from "@/i18n/routing";

export const newsletterSubscriptionSchema = z.object({
  locale: z.enum(locales),
  email: z.email().max(254),
  disclosureVersion: z.string().min(2).max(80),
});

export const newsletterWithdrawalSchema = newsletterSubscriptionSchema.pick({
  locale: true,
  email: true,
});

export const abandonedCartMessagingEnabled = false as const;
