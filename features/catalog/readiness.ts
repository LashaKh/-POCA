import "server-only";

import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const readinessSchema = z.object({
  ready: z.boolean(),
  productId: z.uuid(),
  productVersion: z.number().int().positive(),
  blockers: z.array(
    z.object({ group: z.string().min(1), code: z.string().min(1) }),
  ),
  warnings: z
    .array(
      z.object({
        group: z.string().min(1),
        code: z.string().min(1),
      }),
    )
    .default([]),
});

export type ProductReadiness = z.infer<typeof readinessSchema>;

export async function getProductReadiness(productId: string) {
  const client = await createServerSupabaseClient();
  const [readiness, discovery] = await Promise.all([
    client.rpc("evaluate_product_readiness", { p_product_id: productId }),
    client.rpc("product_discovery_warnings", { p_product_id: productId }),
  ]);
  if (readiness.error) throw readiness.error;
  if (discovery.error) throw discovery.error;
  return readinessSchema.parse({
    ...(readiness.data && typeof readiness.data === "object"
      ? readiness.data
      : {}),
    warnings: discovery.data.map((warning) => ({
      group: "discovery",
      code: warning.code,
    })),
  });
}
