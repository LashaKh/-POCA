import { describe, expect, it } from "vitest";

import {
  buildContentSecurityPolicy,
  getSecurityHeaders,
  isSameOriginRequest,
} from "@/lib/security/headers";

describe("security headers", () => {
  it("adds HSTS only in production", () => {
    expect(getSecurityHeaders({ production: true })).toContainEqual(
      expect.objectContaining({ key: "Strict-Transport-Security" }),
    );
    expect(getSecurityHeaders({ production: false })).not.toContainEqual(
      expect.objectContaining({ key: "Strict-Transport-Security" }),
    );
  });

  it("does not add local socket origins to production CSP", () => {
    expect(buildContentSecurityPolicy({ production: true })).not.toContain(
      "127.0.0.1",
    );
  });

  it("authorizes framework scripts with a request nonce without unsafe inline scripts", () => {
    const policy = buildContentSecurityPolicy({
      production: true,
      nonce: "request-nonce",
    });
    expect(policy).toContain(
      "script-src 'self' 'nonce-request-nonce' 'strict-dynamic'",
    );
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  it("allows approved Supabase media without widening other resource types", () => {
    const policy = buildContentSecurityPolicy({
      production: true,
      supabaseOrigin: "https://project.supabase.co",
    });
    expect(policy).toContain(
      "img-src 'self' data: blob: https: https://project.supabase.co",
    );
    expect(policy).toContain("connect-src 'self' https://project.supabase.co");
  });

  it("checks mutation origins", () => {
    const matching = new Request("https://epoca.example/action", {
      headers: { origin: "https://epoca.example" },
    });
    const foreign = new Request("https://epoca.example/action", {
      headers: { origin: "https://evil.invalid" },
    });
    expect(isSameOriginRequest(matching, "https://epoca.example")).toBe(true);
    expect(isSameOriginRequest(foreign, "https://epoca.example")).toBe(false);
  });

  it("isolates documents without requiring cross-origin embedding", () => {
    const headers = getSecurityHeaders({ production: false });
    expect(headers).toContainEqual({
      key: "Cross-Origin-Resource-Policy",
      value: "same-origin",
    });
    expect(headers).toContainEqual({
      key: "X-DNS-Prefetch-Control",
      value: "off",
    });
    expect(headers).toContainEqual({
      key: "Origin-Agent-Cluster",
      value: "?1",
    });
    expect(
      headers.find((header) => header.key === "Permissions-Policy")?.value,
    ).toContain("browsing-topics=()");
  });
});
