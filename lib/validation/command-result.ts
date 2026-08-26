export type CommandErrorCode =
  | "INVALID_INPUT"
  | "FILE_TYPE_INVALID"
  | "ADDRESS_INVALID"
  | "TRANSLATION_INCOMPLETE"
  | "AUTH_REQUIRED"
  | "MFA_REQUIRED"
  | "SESSION_REVOKED"
  | "FORBIDDEN"
  | "VERSION_CONFLICT"
  | "STOCK_CHANGED"
  | "PRICE_CHANGED"
  | "RESERVATION_EXPIRED"
  | "DISCOUNT_INELIGIBLE"
  | "DELIVERY_UNAVAILABLE"
  | "PAYMENT_DISABLED"
  | "ORDER_ALREADY_ACCEPTED"
  | "PROVIDER_UNAVAILABLE"
  | "PAYMENT_UNCERTAIN"
  | "NOTIFICATION_PENDING"
  | "ASSISTANCE_DISABLED"
  | "RATE_LIMITED"
  | "UPLOAD_REJECTED"
  | "CONTACT_REJECTED"
  | "JOB_RETRYING"
  | "RECONCILIATION_REQUIRED"
  | "CONFIGURATION_INCOMPLETE"
  | "INTERNAL_ERROR";

export type CommandError = {
  code: CommandErrorCode;
  messageKey: string;
  fieldErrors?: Record<string, string[]>;
  retryable: boolean;
  retryAfterSeconds?: number;
  currentVersion?: number;
};

export type CommandResult<T> =
  | { ok: true; data: T; correlationId: string }
  | { ok: false; correlationId: string; error: CommandError };

export function commandSuccess<T>(
  data: T,
  correlationId: string,
): CommandResult<T> {
  return { ok: true, data, correlationId };
}

export function commandFailure<T = never>(
  error: CommandError,
  correlationId: string,
): CommandResult<T> {
  return { ok: false, correlationId, error };
}

export function mapCommandResult<T, U>(
  result: CommandResult<T>,
  map: (data: T) => U,
): CommandResult<U> {
  return result.ok
    ? commandSuccess(map(result.data), result.correlationId)
    : result;
}
