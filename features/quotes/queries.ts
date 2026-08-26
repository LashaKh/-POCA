import "server-only";

import { cookies } from "next/headers";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

import { hashManualQuoteProof, manualQuoteProofCookieName } from "./proof";

const quoteViewSchema = z.object({
  id: z.uuid(),
  reference: z.string(),
  status: z.enum([
    "submitted",
    "needs_information",
    "quoted",
    "accepted",
    "declined",
    "expired",
    "cancelled",
  ]),
  locale: z.enum(["ka", "en", "de", "ru"]),
  currency: z.enum(["GEL", "USD", "EUR"]),
  destination_country_code: z.string(),
  contact_email: z.string(),
  contact_phone: z.string().nullable(),
  address: z.record(z.string(), z.unknown()),
  buyer_note: z.string().nullable(),
  cart_snapshot: z.record(z.string(), z.unknown()),
  quoted_amount_minor: z.number().nullable(),
  quoted_currency: z.enum(["GEL", "USD", "EUR"]).nullable(),
  quoted_method_i18n: z.record(z.string(), z.unknown()).nullable(),
  estimate_min_days: z.number().nullable(),
  estimate_max_days: z.number().nullable(),
  customs_snapshot: z.record(z.string(), z.unknown()).nullable(),
  buyer_message: z.string().nullable(),
  quoted_at: z.string().nullable(),
  expires_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  version: z.number(),
});

export type ManualQuoteView = z.infer<typeof quoteViewSchema>;

export async function getBuyerManualQuote(reference: string) {
  const cookieStore = await cookies();
  const proof = cookieStore.get(manualQuoteProofCookieName(reference))?.value;
  const client = proof
    ? createServiceSupabaseClient()
    : await createServerSupabaseClient();
  const result = await client.rpc("read_manual_quote", {
    p_reference: reference,
    p_proof_hash: proof ? hashManualQuoteProof(proof) : undefined,
  });
  if (result.error) return undefined;
  return quoteViewSchema.parse(result.data);
}

export async function getStaffQuoteQueue() {
  const client = await createServerSupabaseClient();
  const result = await client
    .from("staff_manual_quote_queue")
    .select("*")
    .order("created_at", { ascending: false });
  if (result.error) throw result.error;
  return result.data;
}

export async function getStaffManualQuote(id: string) {
  const client = await createServerSupabaseClient();
  const [quote, events] = await Promise.all([
    client.from("manual_quote_requests").select("*").eq("id", id).single(),
    client
      .from("manual_quote_events")
      .select("*")
      .eq("manual_quote_id", id)
      .order("occurred_at"),
  ]);
  if (quote.error) throw quote.error;
  if (events.error) throw events.error;
  return { quote: quote.data, events: events.data };
}
