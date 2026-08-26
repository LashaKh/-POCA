export type SecurityHeaderOptions = {
  production: boolean;
  supabaseOrigin?: string;
  posthogOrigin?: string;
  nonce?: string;
};

export function buildContentSecurityPolicy({
  production,
  supabaseOrigin,
  posthogOrigin,
  nonce,
}: SecurityHeaderOptions) {
  const connectSources = ["'self'"];
  const imageSources = ["'self'", "data:", "blob:", "https:"];
  if (supabaseOrigin) connectSources.push(new URL(supabaseOrigin).origin);
  if (supabaseOrigin) imageSources.push(new URL(supabaseOrigin).origin);
  if (posthogOrigin) connectSources.push(new URL(posthogOrigin).origin);
  if (!production)
    connectSources.push("ws://127.0.0.1:*", "http://127.0.0.1:*");

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src 'self'${nonce ? ` 'nonce-${nonce}' 'strict-dynamic'` : ""}${production ? "" : " 'unsafe-eval'"}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imageSources.join(" ")}`,
    "font-src 'self' data:",
    `connect-src ${connectSources.join(" ")}`,
    "worker-src 'self' blob:",
    "media-src 'self'",
    "manifest-src 'self'",
    ...(production ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export function getSecurityHeaders(options: SecurityHeaderOptions) {
  const headers = [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(options),
    },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    {
      key: "Permissions-Policy",
      value:
        "camera=(), microphone=(), geolocation=(), usb=(), serial=(), hid=(), bluetooth=(), browsing-topics=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    { key: "Origin-Agent-Cluster", value: "?1" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
  ];

  if (options.production) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}

export function applySecurityHeaders(
  headers: Headers,
  options: SecurityHeaderOptions,
) {
  for (const header of getSecurityHeaders(options)) {
    headers.set(header.key, header.value);
  }
  return headers;
}

export function isSameOriginRequest(request: Request, canonicalOrigin: string) {
  const expected = new URL(canonicalOrigin).origin;
  const origin = request.headers.get("origin");

  if (origin) return origin === expected;

  const fetchSite = request.headers.get("sec-fetch-site");
  return fetchSite === "same-origin" || fetchSite === "same-site";
}
