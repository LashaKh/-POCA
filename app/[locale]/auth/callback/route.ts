import { NextResponse, type NextRequest } from "next/server";

import { isSafeReturnPath } from "@/features/auth/context";
import { isAppLocale } from "@/i18n/routing";
import { getServerEnvironment } from "@/lib/env/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { registerCurrentSession } from "@/features/auth/session";
import { resolveActorContext } from "@/features/auth/context";
import { mergeCurrentGuestIntoCustomer } from "@/features/wishlist/merge";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return new NextResponse(null, { status: 404 });
  const environment = getServerEnvironment();
  const siteUrl = environment.SITE_URL ?? request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");
  const requestedNext = request.nextUrl.searchParams.get("next") ?? "";
  const next = isSafeReturnPath(requestedNext)
    ? requestedNext
    : "/auth/recovery?mode=update";
  if (code) {
    const client = await createServerSupabaseClient();
    const exchange = await client.auth.exchangeCodeForSession(code);
    if (!exchange.error) {
      const existing = await client.from("profiles").select("id").maybeSingle();
      if (!existing.error && !existing.data) {
        const displayName =
          typeof exchange.data.user.user_metadata.display_name === "string"
            ? exchange.data.user.user_metadata.display_name
            : undefined;
        await client.rpc("initialize_customer_profile", {
          p_display_name: displayName,
          p_locale: locale,
          p_currency: "GEL",
        });
      }
      const registered = await registerCurrentSession(client);
      const context = await resolveActorContext(
        client,
        registered.auth_session_id,
      );
      if (context.kind === "customer") {
        await mergeCurrentGuestIntoCustomer(context.profileId, locale);
      }
      return NextResponse.redirect(new URL(`/${locale}${next}`, siteUrl));
    }
  }
  return NextResponse.redirect(
    new URL(`/${locale}/auth/recovery?error=expired`, siteUrl),
  );
}
