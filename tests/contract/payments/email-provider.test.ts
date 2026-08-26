import { describe, expect, it, vi } from "vitest";

import { renderOrderNotification } from "@/emails/order/notifications";
import {
  CaptureEmailProvider,
  clearCapturedEmails,
} from "@/lib/providers/email/capture";
import { DisabledEmailProvider } from "@/lib/providers/email/disabled";
import { ResendEmailProvider } from "@/lib/providers/email/resend";

const emailInput = {
  to: "buyer@example.test",
  from: "orders@example.test",
  subject: "ÉPOCA order",
  text: "Order accepted",
  html: "<p>Order accepted</p>",
  idempotencyKey: "notification-idempotency-0001",
};

describe("email provider contract", () => {
  it("fails closed in disabled mode", async () => {
    await expect(new DisabledEmailProvider().send()).rejects.toMatchObject({
      code: "EMAIL_PROVIDER_DISABLED",
      retryable: false,
    });
  });

  it("captures fixture email idempotently", async () => {
    clearCapturedEmails();
    const provider = new CaptureEmailProvider();
    expect(await provider.send(emailInput)).toEqual(
      await provider.send(emailInput),
    );
  });

  it("sends through Resend with an idempotency header", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "email-001" }), { status: 200 }),
      );
    const provider = new ResendEmailProvider(
      "resend-key-value-000000",
      fetcher,
    );
    await expect(provider.send(emailInput)).resolves.toEqual({
      provider: "resend",
      providerReference: "email-001",
      outcome: "sent",
    });
    expect(fetcher.mock.calls[0]?.[1]?.headers).toMatchObject({
      "idempotency-key": emailInput.idempotencyKey,
    });
  });

  it("maps Resend outages to safe retryable errors", async () => {
    const provider = new ResendEmailProvider(
      "resend-key-value-000000",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response("private", { status: 503 })),
    );
    await expect(provider.send(emailInput)).rejects.toMatchObject({
      code: "EMAIL_PROVIDER_UNAVAILABLE",
      retryable: true,
    });
  });

  it.each(["ka", "en", "de", "ru"] as const)(
    "renders all transactional order states in %s",
    (locale) => {
      for (const templateKey of [
        "order-bank-transfer-pending",
        "order-payment-pending",
        "order-payment-confirmed",
        "order-payment-update",
        "order-shipped",
        "order-delivered",
        "order-cancelled",
        "order-refunded",
        "order-staff-alert",
      ]) {
        const rendered = renderOrderNotification(locale, {
          templateKey,
          orderReference: "EPO-TEST00000001",
        });
        expect(rendered.subject).toContain("EPO-TEST00000001");
        expect(rendered.text.length).toBeGreaterThan(20);
        expect(rendered.html).toContain("EPO-TEST00000001");
      }
    },
  );
});
