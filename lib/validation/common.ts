import { z } from "zod";

export const uuidSchema = z.uuid();
export const localeSchema = z.enum(["ka", "en", "de", "ru"]);
export const currencySchema = z.enum(["GEL", "EUR", "USD"]);
export const moneyMinorSchema = z
  .int()
  .nonnegative()
  .max(9_000_000_000_000_000);
export const safeVersionSchema = z.int().positive();
export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(160)
  .regex(/^[A-Za-z0-9._~-]+$/);
export const cursorSchema = z
  .string()
  .trim()
  .min(8)
  .max(500)
  .regex(/^[A-Za-z0-9_-]+$/);
export const pageSizeSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(100)
  .default(24);

export function boundedTextSchema({
  min = 1,
  max,
}: {
  min?: number;
  max: number;
}) {
  return z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine(
      (value) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value),
      {
        message: "contains unsupported control characters",
      },
    );
}

export const correlationIdSchema = uuidSchema;
