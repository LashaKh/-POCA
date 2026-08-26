import "server-only";

import { notFound, redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AppLocale } from "@/i18n/routing";

import { requireManager } from "./authorization";
import { resolveActorContext } from "./context";
import { getCurrentAuthSessionId } from "./session";

export async function requireAdminPage() {
  const client = await createServerSupabaseClient();
  const context = requireManager(
    await resolveActorContext(client, await getCurrentAuthSessionId(client)),
  );
  return { client, context };
}

export async function requireOwnerPage(locale: AppLocale, returnTo: string) {
  const result = await requireAdminPage();
  if (result.context.role !== "owner") notFound();
  if (result.context.assuranceLevel !== "aal2") {
    redirect(`/${locale}/auth/mfa?returnTo=${encodeURIComponent(returnTo)}`);
  }
  return result;
}
