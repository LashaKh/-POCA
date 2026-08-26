import { createHash } from "node:crypto";

import {
  PaymentProviderError,
  type CreatePaymentInput,
  type PaymentProvider,
  type PaymentProviderState,
  type PaymentResult,
  type RefundPaymentInput,
  type RefundResult,
  type VerifiedPaymentCallback,
} from "./types";

const DEFAULT_TBC_BASE_URL = "https://api.tbcbank.ge/v1/tpay";
const TBC_CALLBACK_IPS = new Set([
  "193.104.20.44",
  "193.104.20.45",
  "185.52.80.44",
  "185.52.80.45",
]);

type FetchLike = typeof fetch;

type TbcProviderOptions = {
  clientId: string;
  clientSecret: string;
  apiKey: string;
  baseUrl?: string;
  fetch?: FetchLike;
  timeoutMs?: number;
};

type AccessToken = { value: string; expiresAt: number };

function minorToMajor(amountMinor: number) {
  return Number((amountMinor / 100).toFixed(2));
}

function normalizedTbcState(value: unknown): PaymentProviderState {
  const state = typeof value === "string" ? value.toLowerCase() : "";
  if (["succeeded", "success", "completed", "paid"].includes(state))
    return "paid";
  if (["authorized", "preauthorized"].includes(state)) return "authorized";
  if (["failed", "declined", "rejected"].includes(state)) return "failed";
  if (["expired", "timeout"].includes(state)) return "expired";
  if (["cancelled", "canceled"].includes(state)) return "cancelled";
  if (["refunded"].includes(state)) return "refunded";
  if (["partiallyrefunded", "partially_refunded"].includes(state)) {
    return "partially_refunded";
  }
  if (["created", "pending", "processing", "submitted"].includes(state))
    return "pending";
  return "uncertain";
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PaymentProviderError("PAYMENT_PROVIDER_REJECTED", false);
  }
  return value as Record<string, unknown>;
}

function stringValue(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

function approvalUrl(record: Record<string, unknown>) {
  const direct = stringValue(
    record,
    "approvalUrl",
    "approval_url",
    "redirectUrl",
  );
  if (direct) return direct;
  if (!Array.isArray(record.links)) return undefined;
  for (const entry of record.links) {
    if (!entry || typeof entry !== "object") continue;
    const link = entry as Record<string, unknown>;
    const relation = stringValue(link, "rel")?.toLowerCase();
    if (relation === "approval_url" || relation === "approval") {
      return stringValue(link, "uri", "href");
    }
  }
  return undefined;
}

export class TbcPaymentProvider implements PaymentProvider {
  readonly name = "tbc";
  readonly available = true;
  private readonly baseUrl: string;
  private readonly fetcher: FetchLike;
  private readonly timeoutMs: number;
  private token?: AccessToken;

  constructor(private readonly options: TbcProviderOptions) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_TBC_BASE_URL).replace(/\/$/, "");
    this.fetcher = options.fetch ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 8_000;
  }

  private async request(url: string, init: RequestInit) {
    let response: Response;
    try {
      response = await this.fetcher(url, {
        ...init,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const errorName =
        error && typeof error === "object" && "name" in error
          ? String(error.name)
          : "";
      if (errorName === "TimeoutError" || errorName === "AbortError") {
        throw new PaymentProviderError("PAYMENT_PROVIDER_TIMEOUT", true);
      }
      throw new PaymentProviderError("PAYMENT_PROVIDER_UNAVAILABLE", true);
    }
    if (!response.ok) {
      throw new PaymentProviderError(
        response.status >= 500
          ? "PAYMENT_PROVIDER_UNAVAILABLE"
          : "PAYMENT_PROVIDER_REJECTED",
        response.status >= 500 || response.status === 429,
      );
    }
    try {
      return (await response.json()) as unknown;
    } catch {
      throw new PaymentProviderError("PAYMENT_PROVIDER_REJECTED", false);
    }
  }

  private async accessToken() {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) {
      return this.token.value;
    }
    const body = new URLSearchParams({
      client_id: this.options.clientId,
      client_secret: this.options.clientSecret,
      grant_type: "client_credentials",
    });
    const response = asRecord(
      await this.request(`${this.baseUrl}/access-token`, {
        method: "POST",
        headers: {
          apikey: this.options.apiKey,
          "content-type": "application/x-www-form-urlencoded",
        },
        body,
      }),
    );
    const value = stringValue(response, "access_token", "accessToken");
    if (!value)
      throw new PaymentProviderError("PAYMENT_PROVIDER_REJECTED", false);
    const expiresIn =
      typeof response.expires_in === "number" ? response.expires_in : 86_400;
    this.token = {
      value,
      expiresAt: Date.now() + Math.max(60, expiresIn) * 1000,
    };
    return value;
  }

  private async authorizedRequest(path: string, init: RequestInit) {
    const token = await this.accessToken();
    return this.request(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        apikey: this.options.apiKey,
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        ...init.headers,
      },
    });
  }

  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    const language = input.locale === "ka" ? "KA" : "EN";
    const response = asRecord(
      await this.authorizedRequest("/payments", {
        method: "POST",
        headers: { "idempotency-key": input.idempotencyKey },
        body: JSON.stringify({
          amount: {
            currency: input.currency,
            total: minorToMajor(input.amountMinor),
          },
          returnurl: input.returnUrl,
          callbackUrl: input.callbackUrl,
          preAuth: false,
          language,
          merchantPaymentId: input.orderReference,
          description: `ÉPOCA ${input.orderReference}`,
        }),
      }),
    );
    const providerReference = stringValue(response, "payId", "paymentId", "id");
    const redirect = approvalUrl(response);
    if (!providerReference || !redirect) {
      throw new PaymentProviderError("PAYMENT_PROVIDER_REJECTED", false);
    }
    return {
      provider: this.name,
      providerReference,
      state: normalizedTbcState(response.status ?? "pending"),
      approvalUrl: redirect,
    };
  }

  async getPayment(providerReference: string): Promise<PaymentResult> {
    const response = asRecord(
      await this.authorizedRequest(
        `/payments/${encodeURIComponent(providerReference)}`,
        {
          method: "GET",
        },
      ),
    );
    return {
      provider: this.name,
      providerReference:
        stringValue(response, "payId", "paymentId", "id") ?? providerReference,
      state: normalizedTbcState(response.status),
    };
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundResult> {
    const response = asRecord(
      await this.authorizedRequest(
        `/payments/${encodeURIComponent(input.providerReference)}/refund`,
        {
          method: "POST",
          headers: { "idempotency-key": input.idempotencyKey },
          body: JSON.stringify({ amount: minorToMajor(input.amountMinor) }),
        },
      ),
    );
    const refundReference = stringValue(
      response,
      "refundId",
      "id",
      "operationId",
    );
    if (!refundReference) {
      throw new PaymentProviderError("PAYMENT_PROVIDER_REJECTED", false);
    }
    const state = normalizedTbcState(response.status);
    return {
      provider: this.name,
      providerReference: input.providerReference,
      refundReference,
      state:
        state === "paid" || state === "refunded"
          ? "succeeded"
          : state === "pending"
            ? "pending"
            : state === "failed"
              ? "failed"
              : "uncertain",
    };
  }

  async verifyCallback(input: {
    body: unknown;
    sourceIp?: string;
  }): Promise<VerifiedPaymentCallback> {
    if (!input.sourceIp || !TBC_CALLBACK_IPS.has(input.sourceIp)) {
      throw new PaymentProviderError("PAYMENT_CALLBACK_INVALID", false);
    }
    if (
      !input.body ||
      typeof input.body !== "object" ||
      Array.isArray(input.body)
    ) {
      throw new PaymentProviderError("PAYMENT_CALLBACK_INVALID", false);
    }
    const body = input.body as Record<string, unknown>;
    const providerReference = stringValue(body, "PaymentId", "paymentId");
    if (!providerReference || providerReference.length > 180) {
      throw new PaymentProviderError("PAYMENT_CALLBACK_INVALID", false);
    }
    const canonical = JSON.stringify({ PaymentId: providerReference });
    return {
      provider: this.name,
      providerReference,
      eventKey: `tbc:${providerReference}`,
      eventType: "payment.updated",
      payloadHash: createHash("sha256").update(canonical).digest("hex"),
      safeMetadata: { source: "tbc-callback" },
    };
  }
}

export { TBC_CALLBACK_IPS };
