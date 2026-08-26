import "server-only";

import { randomUUID } from "node:crypto";

import type { ActorContext } from "@/features/auth/context";
import { logger } from "@/lib/observability/logger";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

function actorClass(context: ActorContext) {
  if (context.kind === "staff") return context.role;
  return context.kind;
}

export async function recordDeniedCommand(
  action: string,
  context: ActorContext,
  reasonCode: string,
) {
  const service = createServiceSupabaseClient();
  const correlationId = randomUUID();
  const result = await service.from("audit_events").insert({
    actor_profile_id:
      context.kind === "customer" || context.kind === "staff"
        ? context.profileId
        : null,
    actor_class: actorClass(context),
    action,
    entity_type: "command",
    result: "denied",
    source: "authorization-boundary",
    correlation_id: correlationId,
    retention_class: "security",
    summary: { reasonCode },
  });
  if (result.error) throw result.error;
  logger.warn({
    correlationId,
    event: "admin.command.denied",
    actorClass: actorClass(context),
    outcome: "denied",
    metadata: { action, reasonCode },
  });
}
