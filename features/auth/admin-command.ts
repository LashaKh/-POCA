import "server-only";

import { recordDeniedCommand } from "@/features/audit/command";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { requireManager } from "./authorization";
import { resolveActorContext } from "./context";
import { getCurrentAuthSessionId } from "./session";

export async function managerCommandClient(action: string) {
  const client = await createServerSupabaseClient();
  const context = await resolveActorContext(
    client,
    await getCurrentAuthSessionId(client),
  );
  try {
    requireManager(context);
  } catch (error) {
    await recordDeniedCommand(
      action,
      context,
      error instanceof Error ? error.message : "FORBIDDEN",
    );
    throw error;
  }
  return client;
}
