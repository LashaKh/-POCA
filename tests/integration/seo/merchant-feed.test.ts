import { describe, expect, it } from "vitest";

import {
  buildGoogleMerchantXml,
  escapeXml,
  merchantFeedProfiles,
  validateMerchantFeedProfile,
} from "@/features/seo/merchant-feed";

import {
  completeMerchantItem,
  completeMerchantProfile,
  discoveryOrigin,
} from "./fixtures";

describe("Google Merchant feeds", () => {
  it("keeps every declared profile closed while business facts are unresolved", () => {
    for (const profile of Object.values(merchantFeedProfiles)) {
      expect(validateMerchantFeedProfile(profile)).toContain(
        "profile_disabled",
      );
      expect(validateMerchantFeedProfile(profile)).toContain("seller_missing");
    }
  });

  it("escapes XML and serializes only a complete enabled profile", () => {
    const xml = buildGoogleMerchantXml({
      origin: discoveryOrigin,
      profile: completeMerchantProfile,
      items: [completeMerchantItem],
    });

    expect(xml).toContain("Wool &amp; Indigo");
    expect(xml).toContain("&lt;vintage&gt;");
    expect(xml).toContain("2500.00 GEL");
    expect(xml).toContain("<g:identifier_exists>no</g:identifier_exists>");
  });

  it("escapes every XML delimiter", () => {
    expect(escapeXml(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&apos;");
  });
});
