import "server-only";

import { cookies } from "next/headers";

import { sha256 } from "@/features/orders/guest-proof";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

import { contactProofCookieName } from "./proof";

export async function getContactMessageStatus(reference: string) {
  const proof = (await cookies()).get(contactProofCookieName(reference))?.value;
  if (!proof) return undefined;
  const client = createServiceSupabaseClient();
  const result = await client.rpc("read_contact_message_status", {
    p_reference: reference,
    p_guest_proof_hash: sha256(proof),
  });
  if (result.error) throw result.error;
  return result.data &&
    typeof result.data === "object" &&
    !Array.isArray(result.data)
    ? (result.data as {
        reference: string;
        status: string;
        createdAt: string;
        updatedAt: string;
      })
    : undefined;
}
