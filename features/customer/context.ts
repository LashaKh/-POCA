import "server-only";

import { redirect } from "next/navigation";

import { getCurrentAuthSessionId } from "@/features/auth/session";
import type { AppLocale } from "@/i18n/routing";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { resolveActorContext } from "../auth/context";

export async function getCustomerContext() {
  const client = await createServerSupabaseClient();
  const sessionId = await getCurrentAuthSessionId(client);
  const context = await resolveActorContext(client, sessionId);
  return { client, context };
}

export async function requireCustomerPage(locale: AppLocale) {
  const result = await getCustomerContext();
  if (result.context.kind !== "customer") {
    redirect(
      result.context.kind === "staff"
        ? `/${locale}/admin`
        : `/${locale}/auth/sign-in?returnTo=%2Faccount`,
    );
  }
  return { client: result.client, context: result.context };
}
