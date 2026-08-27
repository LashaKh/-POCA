import type {
  MerchantFeedItem,
  MerchantFeedProfile,
} from "@/features/seo/merchant-feed";

export const discoveryOrigin = "https://epoca.example";

export const translatedProductRoutes = [
  { locale: "ka" as const, slug: "lurji-khali" },
  { locale: "en" as const, slug: "indigo-rug" },
  { locale: "de" as const, slug: "indigo-teppich" },
];

export const completeMerchantProfile: MerchantFeedProfile = {
  id: "ge-en-gel",
  active: true,
  sellerReference: "seller-ge-approved",
  targetCountry: "GE",
  language: "en",
  currency: "GEL",
  marketCode: "GE",
  fulfillmentOrigin: "GE",
  deliveryPolicyReference: "delivery-ge-v1",
  returnPolicyReference: "returns-ge-v1",
  shipping: { service: "Standard", amountMinor: 1500 },
  returns: { days: 14, method: "ByMail", fees: "ReturnShippingFees" },
  validationErrors: [],
};

export const completeMerchantItem: MerchantFeedItem = {
  id: "EPOCA-001",
  title: "Wool & Indigo",
  description: "A reviewed <vintage> carpet.",
  link: `${discoveryOrigin}/en/products/indigo?currency=GEL`,
  imageLink: "https://cdn.example/indigo.webp",
  amountMinor: 250000,
  currency: "GEL",
  availability: "in_stock",
  condition: "used",
  identifierExists: false,
};
