import { z } from "zod";

import { locales } from "@/i18n/routing";

export const wishlistToggleSchema = z.object({
  productId: z.uuid(),
  locale: z.enum(locales),
});

export const guestWishlistViewSchema = z.object({
  id: z.uuid().nullable(),
  productIds: z.array(z.uuid()),
});
