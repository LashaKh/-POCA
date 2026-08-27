import { getCanonicalOrigin } from "@/features/catalog/metadata";
import {
  isMerchantFeedProfileId,
  merchantFeedProfiles,
  validateMerchantFeedProfile,
} from "@/features/seo/merchant-feed";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ profile: string }> },
) {
  const routeValue = (await params).profile;
  const profileId = routeValue.endsWith(".xml")
    ? routeValue.slice(0, -4)
    : routeValue;
  if (!isMerchantFeedProfileId(profileId)) {
    return new Response(null, { status: 404 });
  }
  const profile = merchantFeedProfiles[profileId];
  if (validateMerchantFeedProfile(profile).length) {
    return new Response(null, { status: 404 });
  }

  // The profile contract deliberately cannot reach this branch until an
  // approved seller, origin, shipping, return policy, market, and domain are
  // configured. Future activation will load and validate public catalog items
  // here; returning 404 prevents an empty or partial feed today.
  void getCanonicalOrigin();
  return new Response(null, { status: 404 });
}
