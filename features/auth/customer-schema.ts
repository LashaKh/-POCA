import { z } from "zod";

import { locales } from "@/i18n/routing";

export const customerSignUpSchema = z
  .object({
    locale: z.enum(locales),
    email: z.email().max(254),
    password: z.string().min(14).max(200),
    confirmation: z.string().min(14).max(200),
    displayName: z.string().trim().min(1).max(160),
    termsAccepted: z.literal("on"),
    marketingAccepted: z.preprocess(
      (value) => value === "on" || value === true,
      z.boolean(),
    ),
    returnTo: z.string().max(500).default("/account"),
  })
  .refine((value) => value.password === value.confirmation, {
    path: ["confirmation"],
  });
