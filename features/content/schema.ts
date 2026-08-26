import { z } from "zod";

import { locales } from "@/i18n/routing";

export const contentBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("heading"),
    level: z.union([z.literal(2), z.literal(3)]),
    text: z.string().trim().min(1).max(180),
  }),
  z.object({
    type: z.literal("paragraph"),
    text: z.string().trim().min(1).max(5000),
  }),
  z.object({
    type: z.literal("list"),
    style: z.enum(["bullet", "numbered"]),
    items: z.array(z.string().trim().min(1).max(500)).min(1).max(30),
  }),
  z.object({
    type: z.literal("quote"),
    text: z.string().trim().min(1).max(1000),
    attribution: z.string().trim().max(180).optional(),
  }),
  z.object({
    type: z.literal("callout"),
    tone: z.enum(["info", "warning"]),
    title: z.string().trim().max(180).optional(),
    text: z.string().trim().min(1).max(2000),
  }),
]);

export type ContentBlock = z.infer<typeof contentBlockSchema>;

const contentTranslationSchema = z.object({
  locale: z.enum(locales),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]{0,119}$/),
  title: z.string().trim().min(1).max(180),
  summary: z.string().trim().max(500).optional(),
  blocks: z.array(contentBlockSchema).max(100),
  metaTitle: z.string().trim().max(180).optional(),
  metaDescription: z.string().trim().max(320).optional(),
  socialImageUrl: z.union([z.url(), z.literal("")]).optional(),
  reviewStatus: z.enum(["draft", "reviewed", "approved"]),
});

export const contentEntrySchema = z.object({
  locale: z.enum(locales),
  contentEntryId: z.union([z.uuid(), z.literal("")]).optional(),
  entryKey: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9-]{1,79}$/),
  contentType: z.enum([
    "homepage",
    "journal",
    "about",
    "faq",
    "delivery",
    "returns",
    "privacy",
    "cookie",
    "terms",
  ]),
  fallbackPolicy: z.enum(["disclose", "strict"]),
  legalStatus: z.enum(["not_applicable", "draft_unapproved", "approved"]),
  expectedVersion: z.coerce.number().int().nonnegative(),
  reason: z.string().trim().min(2).max(500),
  translations: z.array(contentTranslationSchema).length(4),
});

export const contentTransitionSchema = z.object({
  locale: z.enum(locales),
  contentEntryId: z.uuid(),
  targetStatus: z.enum([
    "draft",
    "scheduled",
    "published",
    "unpublished",
    "archived",
    "restore",
  ]),
  publishAt: z.iso.datetime({ offset: true }).optional(),
  unpublishAt: z.iso.datetime({ offset: true }).optional(),
  expectedVersion: z.coerce.number().int().positive(),
  reason: z.string().trim().min(2).max(500),
});

export const contentMenuSchema = z.object({
  locale: z.enum(locales),
  menuKey: z.enum(["header", "footer"]),
  status: z.enum(["draft", "published", "disabled"]),
  expectedVersion: z.coerce.number().int().positive(),
  items: z
    .array(
      z.object({
        itemKey: z.string().regex(/^[a-z][a-z0-9-]{1,79}$/),
        destinationPath: z.string().startsWith("/").max(500),
        labels: z.record(z.enum(locales), z.string().trim().min(1).max(120)),
        position: z.number().int().min(0).max(10_000),
        enabled: z.boolean().default(true),
        visibleFrom: z.iso.datetime({ offset: true }).optional(),
        visibleUntil: z.iso.datetime({ offset: true }).optional(),
      }),
    )
    .max(30),
  reason: z.string().trim().min(2).max(500),
});

export const contentRedirectSchema = z.object({
  locale: z.enum(locales),
  redirectId: z.union([z.uuid(), z.literal("")]).optional(),
  sourcePath: z.string().startsWith("/").max(500),
  destinationPath: z.string().startsWith("/").max(500),
  httpStatus: z.coerce
    .number()
    .int()
    .refine((value) => [301, 302, 307, 308].includes(value)),
  status: z.enum(["draft", "scheduled", "published", "disabled"]),
  activeFrom: z.iso.datetime({ offset: true }),
  activeUntil: z.union([
    z.iso.datetime({ offset: true }),
    z.literal("infinity"),
  ]),
  expectedVersion: z.coerce.number().int().nonnegative(),
  reason: z.string().trim().min(2).max(500),
});

export const contactChannelSchema = z.object({
  locale: z.enum(locales),
  channelId: z.union([z.uuid(), z.literal("")]).optional(),
  channelKey: z.string().regex(/^[a-z][a-z0-9-]{1,79}$/),
  channelType: z.enum(["email", "phone", "messaging"]),
  publicValue: z.string().trim().min(3).max(320),
  labels: z.record(z.enum(locales), z.string().trim().min(1).max(120)),
  enabled: z.boolean(),
  verified: z.boolean(),
  configurationStatus: z.enum(["draft", "published", "disabled"]),
  expectedVersion: z.coerce.number().int().nonnegative(),
  reason: z.string().trim().min(2).max(500),
});

export function parseBlocksJson(value: unknown) {
  if (typeof value !== "string") return undefined;
  try {
    return z.array(contentBlockSchema).max(100).parse(JSON.parse(value));
  } catch {
    return undefined;
  }
}
