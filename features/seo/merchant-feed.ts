import type { SupportedCurrency } from "@/i18n/preferences";
import type { AppLocale } from "@/i18n/routing";

export const merchantFeedProfileIds = [
  "ge-en-gel",
  "de-de-eur",
  "de-en-eur",
  "de-ru-eur",
] as const;

export type MerchantFeedProfileId = (typeof merchantFeedProfileIds)[number];
export type MerchantFeedValidationCode =
  | "profile_disabled"
  | "domain_unapproved"
  | "seller_missing"
  | "seller_ambiguous"
  | "market_unapproved"
  | "origin_missing"
  | "delivery_policy_missing"
  | "return_policy_missing"
  | "price_missing"
  | "currency_mismatch"
  | "translation_missing"
  | "image_missing"
  | "description_missing"
  | "condition_missing"
  | "identifier_unresolved"
  | "no_eligible_items";

export type MerchantFeedProfile = {
  id: MerchantFeedProfileId;
  active: boolean;
  sellerReference?: string;
  targetCountry: "GE" | "DE";
  language: Exclude<AppLocale, "ka">;
  currency: SupportedCurrency;
  marketCode: string;
  fulfillmentOrigin?: "GE" | "DE";
  deliveryPolicyReference?: string;
  returnPolicyReference?: string;
  shipping?: {
    service: string;
    amountMinor: number;
  };
  returns?: {
    days: number;
    method: "ByMail" | "InStore";
    fees: "FreeReturn" | "ReturnShippingFees";
  };
  validationErrors: MerchantFeedValidationCode[];
};

const sharedBlockedFacts: MerchantFeedValidationCode[] = [
  "profile_disabled",
  "domain_unapproved",
  "seller_missing",
  "origin_missing",
  "delivery_policy_missing",
  "return_policy_missing",
];

export const merchantFeedProfiles: Record<
  MerchantFeedProfileId,
  MerchantFeedProfile
> = {
  "ge-en-gel": {
    id: "ge-en-gel",
    active: false,
    targetCountry: "GE",
    language: "en",
    currency: "GEL",
    marketCode: "GE",
    validationErrors: [...sharedBlockedFacts, "seller_ambiguous"],
  },
  "de-de-eur": {
    id: "de-de-eur",
    active: false,
    targetCountry: "DE",
    language: "de",
    currency: "EUR",
    marketCode: "DE",
    validationErrors: [...sharedBlockedFacts, "seller_ambiguous"],
  },
  "de-en-eur": {
    id: "de-en-eur",
    active: false,
    targetCountry: "DE",
    language: "en",
    currency: "EUR",
    marketCode: "DE",
    validationErrors: [...sharedBlockedFacts, "market_unapproved"],
  },
  "de-ru-eur": {
    id: "de-ru-eur",
    active: false,
    targetCountry: "DE",
    language: "ru",
    currency: "EUR",
    marketCode: "DE",
    validationErrors: [...sharedBlockedFacts, "market_unapproved"],
  },
};

export type MerchantFeedItem = {
  id: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  additionalImageLinks?: string[];
  amountMinor: number;
  currency: SupportedCurrency;
  availability: "in_stock" | "out_of_stock";
  condition: "new" | "used";
  brand?: string;
  gtin?: string;
  mpn?: string;
  identifierExists: boolean | null;
};

export function isMerchantFeedProfileId(
  value: string,
): value is MerchantFeedProfileId {
  return merchantFeedProfileIds.some((profileId) => profileId === value);
}

export function validateMerchantFeedProfile(
  profile: MerchantFeedProfile,
): MerchantFeedValidationCode[] {
  const errors = new Set(profile.validationErrors);
  if (!profile.active) errors.add("profile_disabled");
  if (!profile.sellerReference) errors.add("seller_missing");
  if (!profile.fulfillmentOrigin) errors.add("origin_missing");
  if (!profile.deliveryPolicyReference || !profile.shipping) {
    errors.add("delivery_policy_missing");
  }
  if (!profile.returnPolicyReference || !profile.returns) {
    errors.add("return_policy_missing");
  }
  return [...errors];
}

export function validateMerchantFeedItem(
  profile: MerchantFeedProfile,
  item: MerchantFeedItem,
): MerchantFeedValidationCode[] {
  const errors: MerchantFeedValidationCode[] = [];
  if (!item.title || !item.link) errors.push("translation_missing");
  if (!item.description) errors.push("description_missing");
  if (!item.imageLink) errors.push("image_missing");
  if (!item.condition) errors.push("condition_missing");
  if (!Number.isSafeInteger(item.amountMinor) || item.amountMinor < 0) {
    errors.push("price_missing");
  }
  if (item.currency !== profile.currency) errors.push("currency_mismatch");
  if (
    item.identifierExists === null ||
    (item.identifierExists && !item.gtin && !item.mpn)
  ) {
    errors.push("identifier_unresolved");
  }
  return errors;
}

export function escapeXml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function money(amountMinor: number, currency: SupportedCurrency) {
  return `${(amountMinor / 100).toFixed(2)} ${currency}`;
}

export function buildGoogleMerchantXml({
  origin,
  profile,
  items,
}: {
  origin: string;
  profile: MerchantFeedProfile;
  items: MerchantFeedItem[];
}) {
  const profileErrors = validateMerchantFeedProfile(profile);
  if (profileErrors.length) {
    throw new Error(`MERCHANT_PROFILE_NOT_READY:${profileErrors.join(",")}`);
  }
  const eligible = items.filter(
    (item) => validateMerchantFeedItem(profile, item).length === 0,
  );
  if (!eligible.length) throw new Error("MERCHANT_FEED_NO_ELIGIBLE_ITEMS");

  const itemXml = eligible
    .map(
      (item) => `
    <item>
      <g:id>${escapeXml(item.id)}</g:id>
      <g:title>${escapeXml(item.title)}</g:title>
      <g:description>${escapeXml(item.description)}</g:description>
      <g:link>${escapeXml(item.link)}</g:link>
      <g:image_link>${escapeXml(item.imageLink)}</g:image_link>${(
        item.additionalImageLinks ?? []
      )
        .map(
          (image) =>
            `\n      <g:additional_image_link>${escapeXml(image)}</g:additional_image_link>`,
        )
        .join("")}
      <g:price>${escapeXml(money(item.amountMinor, item.currency))}</g:price>
      <g:availability>${item.availability}</g:availability>
      <g:condition>${item.condition}</g:condition>${item.brand ? `\n      <g:brand>${escapeXml(item.brand)}</g:brand>` : ""}${item.gtin ? `\n      <g:gtin>${escapeXml(item.gtin)}</g:gtin>` : ""}${item.mpn ? `\n      <g:mpn>${escapeXml(item.mpn)}</g:mpn>` : ""}
      <g:identifier_exists>${item.identifierExists ? "yes" : "no"}</g:identifier_exists>
      <g:shipping>
        <g:country>${profile.targetCountry}</g:country>
        <g:service>${escapeXml(profile.shipping?.service ?? "")}</g:service>
        <g:price>${escapeXml(money(profile.shipping?.amountMinor ?? 0, profile.currency))}</g:price>
      </g:shipping>
    </item>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(`ÉPOCA ${profile.targetCountry} ${profile.language}`)}</title>
    <link>${escapeXml(`${origin}/${profile.language}`)}</link>
    <description>${escapeXml(`ÉPOCA approved carpet catalog for ${profile.targetCountry}`)}</description>${itemXml}
  </channel>
</rss>`;
}
