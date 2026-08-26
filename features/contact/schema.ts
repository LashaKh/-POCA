import { z } from "zod";

import { locales } from "@/i18n/routing";

export const contactSubmissionSchema = z.object({
  locale: z.enum(locales),
  email: z.email().max(254),
  fullName: z.string().trim().min(1).max(160),
  subject: z.string().trim().min(2).max(180),
  message: z.string().trim().min(2).max(5000),
  orderReference: z.string().trim().max(40).optional(),
  disclosureVersion: z.string().min(2).max(80),
  idempotencyKey: z.string().min(16).max(180),
});
