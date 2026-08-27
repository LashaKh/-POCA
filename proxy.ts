import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

import { refreshRequestAuth } from "@/features/auth/context";
import { parseLocalizedPath, routing } from "@/i18n/routing";
import { getPublicEnvironment } from "@/lib/env/public";
import {
  correlationHeader,
  resolveCorrelationId,
} from "@/lib/observability/correlation";
import {
  applySecurityHeaders,
  buildContentSecurityPolicy,
  type SecurityHeaderOptions,
} from "@/lib/security/headers";

const handleInternationalization = createIntlMiddleware(routing);
const protectedSegments = new Set(["admin", "account"]);
const noIndexSegments = new Set([
  "admin",
  "account",
  "auth",
  "cart",
  "checkout",
  "order",
  "payment",
  "quote",
  "preview",
]);

type PublishedRedirect = {
  destination_path: string;
  http_status: number;
};

async function resolveManagedRedirect(
  pathname: string,
  publicEnvironment: ReturnType<typeof getPublicEnvironment>,
) {
  try {
    const endpoint = new URL(
      "/rest/v1/published_content_redirects",
      publicEnvironment.NEXT_PUBLIC_SUPABASE_URL,
    );
    endpoint.searchParams.set("select", "destination_path,http_status");
    endpoint.searchParams.set("source_path", `eq.${pathname}`);
    endpoint.searchParams.set("limit", "1");
    const response = await fetch(endpoint, {
      headers: {
        apikey: publicEnvironment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      },
      next: { revalidate: 60 },
    });
    if (!response.ok) return undefined;
    const records = (await response.json()) as PublishedRedirect[];
    return records[0];
  } catch (error) {
    console.warn("Managed redirect lookup was unavailable.", {
      error: error instanceof Error ? error.name : "UNKNOWN_ERROR",
    });
    return undefined;
  }
}

function copyAuthCookies(source: NextResponse, target: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }
  return target;
}

function withResponseHeaders(
  response: NextResponse,
  correlationId: string,
  securityOptions: SecurityHeaderOptions,
) {
  response.headers.set(correlationHeader, correlationId);
  applySecurityHeaders(response.headers, securityOptions);
  return response;
}

function applyPrivateIndexingHeaders(
  response: NextResponse,
  segment: string | undefined,
) {
  if (segment && noIndexSegments.has(segment)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const correlationId = resolveCorrelationId(request.headers);
  request.headers.set(correlationHeader, correlationId);
  const nonce = btoa(crypto.randomUUID());
  const publicEnvironment = getPublicEnvironment();
  const securityOptions = {
    production: process.env.DEPLOY_ENV === "production",
    supabaseOrigin: publicEnvironment.NEXT_PUBLIC_SUPABASE_URL,
    posthogOrigin: process.env.NEXT_PUBLIC_POSTHOG_ORIGIN,
    nonce,
  };
  const contentSecurityPolicy = buildContentSecurityPolicy(securityOptions);
  request.headers.set("x-nonce", nonce);
  request.headers.set("content-security-policy", contentSecurityPolicy);

  if (request.nextUrl.pathname === "/") {
    return withResponseHeaders(
      NextResponse.redirect(new URL(`/${routing.defaultLocale}`, request.url), {
        status: 308,
      }),
      correlationId,
      securityOptions,
    );
  }

  if (
    request.nextUrl.pathname.startsWith("/feeds/") ||
    request.nextUrl.pathname === "/opengraph-image"
  ) {
    const publicResponse = NextResponse.next({ request });
    publicResponse.headers.set(
      "Content-Security-Policy",
      contentSecurityPolicy,
    );
    return withResponseHeaders(publicResponse, correlationId, securityOptions);
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    const apiResponse = NextResponse.next({ request });
    apiResponse.headers.set("Content-Security-Policy", contentSecurityPolicy);
    return withResponseHeaders(apiResponse, correlationId, securityOptions);
  }

  const intlResponse = handleInternationalization(request);
  intlResponse.headers.set("Content-Security-Policy", contentSecurityPolicy);
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return withResponseHeaders(intlResponse, correlationId, securityOptions);
  }

  const { context, response } = await refreshRequestAuth(request);
  const localizedPath = parseLocalizedPath(request.nextUrl.pathname);
  const managedRedirect =
    (await resolveManagedRedirect(
      request.nextUrl.pathname,
      publicEnvironment,
    )) ??
    (await resolveManagedRedirect(localizedPath.pathname, publicEnvironment));
  if (managedRedirect) {
    const destination = /^\/(ka|en|de|ru)(?:\/|$)/.test(
      managedRedirect.destination_path,
    )
      ? managedRedirect.destination_path
      : `/${localizedPath.locale}${managedRedirect.destination_path}`;
    return withResponseHeaders(
      NextResponse.redirect(new URL(destination, request.url), {
        status: managedRedirect.http_status,
      }),
      correlationId,
      securityOptions,
    );
  }
  const isProtected = localizedPath.segment
    ? protectedSegments.has(localizedPath.segment)
    : false;

  if (!isProtected) {
    return withResponseHeaders(
      applyPrivateIndexingHeaders(
        copyAuthCookies(response, intlResponse),
        localizedPath.segment,
      ),
      correlationId,
      securityOptions,
    );
  }

  if (context.kind === "anonymous" || context.kind === "guest") {
    const signInUrl = new URL(
      `/${localizedPath.locale}/auth/sign-in`,
      request.url,
    );
    signInUrl.searchParams.set("returnTo", localizedPath.pathname);
    return withResponseHeaders(
      applyPrivateIndexingHeaders(
        NextResponse.redirect(signInUrl),
        localizedPath.segment,
      ),
      correlationId,
      securityOptions,
    );
  }

  if (context.sessionState !== "active") {
    return withResponseHeaders(
      applyPrivateIndexingHeaders(
        NextResponse.redirect(
          new URL(`/${localizedPath.locale}/auth/session-ended`, request.url),
        ),
        localizedPath.segment,
      ),
      correlationId,
      securityOptions,
    );
  }

  if (
    localizedPath.segment === "admin" &&
    (context.kind !== "staff" || !context.active)
  ) {
    return withResponseHeaders(
      applyPrivateIndexingHeaders(
        new NextResponse(null, { status: 404 }),
        localizedPath.segment,
      ),
      correlationId,
      securityOptions,
    );
  }

  return withResponseHeaders(
    applyPrivateIndexingHeaders(
      copyAuthCookies(response, intlResponse),
      localizedPath.segment,
    ),
    correlationId,
    securityOptions,
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html)$).*)",
  ],
};
