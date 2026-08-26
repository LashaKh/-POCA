import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase/service";

export async function inspectConsentRetention() {
  const client = createServiceSupabaseClient();
  const [disclosures, withdrawals] = await Promise.all([
    client
      .from("disclosure_versions")
      .select("id", { count: "exact", head: true }),
    client
      .from("consent_records")
      .select("id", { count: "exact", head: true })
      .eq("choice", "withdrawn"),
  ]);
  if (disclosures.error) throw disclosures.error;
  if (withdrawals.error) throw withdrawals.error;
  return {
    policy: "append-only-regulatory-evidence",
    disclosureVersions: disclosures.count ?? 0,
    withdrawals: withdrawals.count ?? 0,
  };
}
