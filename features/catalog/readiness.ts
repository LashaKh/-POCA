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
});

export type ProductReadiness = z.infer<typeof readinessSchema>;

export async function getProductReadiness(productId: string) {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("evaluate_product_readiness", {
    p_product_id: productId,
  });
  if (error) throw error;
  return readinessSchema.parse(data);
}
