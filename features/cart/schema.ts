import { z } from "zod";

import { supportedCurrencies } from "@/i18n/preferences";
import { locales } from "@/i18n/routing";

export const cartItemSchema = z.object({
  id: z.uuid(),
  productId: z.uuid(),
  quantity: z.int().min(1).max(20),
  sku: z.string().min(1).max(80),
  slug: z.string().min(1).max(160),
  name: z.string().min(1).max(180),
  locale: z.enum(locales),
  unitAmountMinor: z.int().nonnegative(),
  observedUnitAmountMinor: z.int().nonnegative().nullable(),
  availableQuantity: z.int().nonnegative(),
  productStatus: z.string(),
  productVersion: z.int().positive(),
});

export const cartViewSchema = z.object({
  id: z.uuid(),
  currency: z.enum(supportedCurrencies),
  discountCode: z.string().nullable(),
  version: z.int().positive(),
  expiresAt: z.iso.datetime({ offset: true }),
  items: z.array(cartItemSchema),
});

export const addCartItemSchema = z.object({
  productId: z.uuid(),
  quantity: z.coerce.number().int().min(1).max(20).default(1),
  locale: z.enum(locales),
});

export const updateCartItemSchema = z.object({
  itemId: z.uuid(),
  quantity: z.coerce.number().int().min(0).max(20),
  locale: z.enum(locales),
});

export const discountCodeSchema = z.object({
  code: z.string().trim().max(40),
  locale: z.enum(locales),
});

export type CartView = z.infer<typeof cartViewSchema>;
