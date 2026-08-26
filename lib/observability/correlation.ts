import { correlationIdSchema } from "@/lib/validation/common";

export const correlationHeader = "x-correlation-id";

export function createCorrelationId() {
  return crypto.randomUUID();
}

export function resolveCorrelationId(headers: Headers) {
  const incoming = headers.get(correlationHeader);
  const parsed = correlationIdSchema.safeParse(incoming);
  return parsed.success ? parsed.data : createCorrelationId();
}
