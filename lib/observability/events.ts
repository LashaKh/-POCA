export type EventKind = "analytics" | "operational";

type EventDefinition = {
  kind: EventKind;
  allowedProperties: readonly string[];
};

const analyticsBase = [
  "locale",
  "displayCurrency",
  "routeClass",
  "viewportClass",
  "release",
  "sessionPseudonym",
] as const;

const analyticsDefinitions = {
  search_submitted: ["queryLengthBucket", "resultCountBucket", "mixedScript"],
  filter_changed: ["filterKey", "action", "activeCountBucket"],
  product_viewed: ["productId", "collectionKey", "availabilityCode"],
  wishlist_changed: ["productId", "saved", "buyerClass"],
  cart_changed: ["productId", "action", "quantityBucket", "reconciliationCode"],
  checkout_started: ["itemCountBucket", "buyerClass", "destinationRegion"],
  checkout_step_completed: ["stepKey", "recoverableErrorCountBucket"],
  order_completed: [
    "orderPseudonym",
    "paymentMethod",
    "currency",
    "valueBucket",
    "itemCountBucket",
  ],
  upload_completed: [
    "batchId",
    "fileCountBucket",
    "durationBucket",
    "retryCountBucket",
  ],
  admin_outcome: ["operationKey", "entityType", "success", "errorCodeClass"],
} as const;

const operationalNames = [
  "application.runtime.ready",
  "admin.command.denied",
  "auth.sign-in",
  "catalog.export.worker",
  "checkout.accept",
  "ingestion.upload.completed",
  "media.ingestion-worker",
  "notification.send",
  "notification.worker",
  "observability.invalid-event",
  "order.notification.capture",
  "payment.create",
  "payment.return.refresh",
  "payment.webhook.lease-release",
  "payment.webhook.process",
  "scheduled.coordinator",
  "scheduled.commerce-expiry",
] as const;

export const eventDictionary: Readonly<Record<string, EventDefinition>> = {
  ...Object.fromEntries(
    Object.entries(analyticsDefinitions).map(([name, properties]) => [
      name,
      {
        kind: "analytics" as const,
        allowedProperties: [...analyticsBase, ...properties],
      },
    ]),
  ),
  ...Object.fromEntries(
    operationalNames.map((name) => [
      name,
      { kind: "operational" as const, allowedProperties: [] },
    ]),
  ),
};

const prohibitedProperties = new Set([
  "address",
  "authorization",
  "cardNumber",
  "cookie",
  "cvv",
  "email",
  "message",
  "name",
  "notes",
  "password",
  "payload",
  "phone",
  "prompt",
  "secret",
  "token",
  "url",
]);

export function isKnownEvent(name: string) {
  return Object.hasOwn(eventDictionary, name);
}

export type NamedEventValidation =
  | { ok: true; definition: EventDefinition }
  | {
      ok: false;
      code: "UNKNOWN_EVENT" | "PROHIBITED_PROPERTY" | "UNKNOWN_PROPERTY";
      property?: string;
    };

export function validateNamedEvent(input: {
  name: string;
  properties: Readonly<Record<string, unknown>>;
}): NamedEventValidation {
  const definition = eventDictionary[input.name];
  if (!definition) return { ok: false, code: "UNKNOWN_EVENT" };

  const allowed = new Set(definition.allowedProperties);
  for (const property of Object.keys(input.properties)) {
    if (prohibitedProperties.has(property)) {
      return { ok: false, code: "PROHIBITED_PROPERTY", property };
    }
    if (!allowed.has(property)) {
      return { ok: false, code: "UNKNOWN_PROPERTY", property };
    }
  }
  return { ok: true, definition };
}
