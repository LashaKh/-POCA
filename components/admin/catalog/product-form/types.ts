import type { AppLocale } from "@/i18n/routing";

export type CatalogTranslationValue = {
  locale: AppLocale;
  slug: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  careText: string;
  searchText: string;
  seoTitle: string;
  seoDescription: string;
  altTextReady: boolean;
  status: "draft" | "reviewed" | "published";
};

export type CatalogProductFormValue = {
  id?: string;
  version?: number;
  sku: string;
  widthMm: number | null;
  lengthMm: number | null;
  diameterMm: number | null;
  shape: string;
  materials: string[];
  construction: string;
  colors: string[];
  styles: string[];
  condition: string;
  careCode: string;
  deliveryClass: string;
  category: string;
  origin: string;
  originVerified: boolean;
  ageMinYear?: number | null;
  ageMaxYear?: number | null;
  ageVerified?: boolean;
  pile?: string;
  pileVerified?: boolean;
  handmade?: boolean | null;
  handmadeVerified?: boolean;
  provenanceSummary?: string;
  provenanceVerified?: boolean;
  gelPrice: string;
  stockModel: "unique" | "stocked";
  onHandQuantity: number;
  translations: CatalogTranslationValue[];
};
