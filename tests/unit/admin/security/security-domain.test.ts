import { describe, expect, it } from "vitest";

import { integrationReadiness } from "@/components/admin/settings/integration-status";
import {
  buildAuditExportCsv,
  redactAuditSummary,
} from "@/features/audit/domain";
import { privacyOperationRegistry } from "@/features/privacy/registry";

describe("access-control security domain", () => {
  it("defensively redacts sensitive keys and email-like summary text", () => {
    expect(
      redactAuditSummary({
        outcome: "sent to buyer@example.test",
        nested: { accessToken: "not-allowed", safeCode: "READY" },
      }),
    ).toEqual({
      outcome: "sent to [redacted]",
      nested: { accessToken: "[redacted]", safeCode: "READY" },
    });
  });

  it("makes audit CSV spreadsheet-safe and quote-safe", () => {
    const csv = buildAuditExportCsv([
      {
        id: 1,
        occurred_at: "2026-08-25T10:00:00Z",
        actor_class: "owner",
        action: '=HYPERLINK("unsafe")',
        entity_type: "staff",
        entity_id: "fixture",
        result: "succeeded",
        source: "test",
        correlation_id: "fixture-correlation",
        retention_class: "security",
        summary: { safeCode: "READY" },
      },
    ]);
    expect(csv).toContain('"\'=HYPERLINK(""unsafe"")"');
    expect(csv).toContain('"{""safeCode"":""READY""}"');
  });

  it("reports provider readiness without needing a secret value", () => {
    expect(
      integrationReadiness({
        key: "payment",
        mode: "live",
        capabilities: ["status"],
        safe_reason: null,
        secret_configured: true,
        last_checked_at: null,
        updated_at: null,
      }),
    ).toBe("Ready");
    expect(
      integrationReadiness({
        key: "email",
        mode: "live",
        capabilities: [],
        safe_reason: "Provider unavailable",
        secret_configured: true,
        last_checked_at: null,
        updated_at: null,
      }),
    ).toBe("Degraded");
  });

  it("marks only deletion as irreversible and keeps every privacy operation bounded", () => {
    expect(privacyOperationRegistry.deletion.irreversible).toBe(true);
    expect(privacyOperationRegistry.access.irreversible).toBe(false);
    expect(
      Object.values(privacyOperationRegistry).every(
        (operation) => operation.bounded,
      ),
    ).toBe(true);
  });
});
