import { createHash } from "node:crypto";

import { z } from "zod";

import {
  catalogProductCommandSchema,
  decimalToMinor,
  splitCatalogTerms,
} from "./admin-schema";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_ROWS = 10_000;

export const standardCatalogHeaders = [
  "sku",
  "name_ka",
  "slug_ka",
  "name_en",
  "slug_en",
  "name_de",
  "slug_de",
  "name_ru",
  "slug_ru",
  "price_gel",
  "on_hand",
  "stock_model",
  "width_mm",
  "length_mm",
  "materials",
  "colors",
] as const;

type ParsedRow = Record<string, string>;
export type ImportPreviewRow = {
  rowNumber: number;
  source: ParsedRow;
  normalized: z.infer<typeof catalogProductCommandSchema> | null;
  errors: Array<{ field: string; code: string }>;
};

function parseRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  if (quoted) throw new Error("CSV_UNCLOSED_QUOTE");
  row.push(cell);
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

async function readInput(input: string | AsyncIterable<string | Uint8Array>) {
  if (typeof input === "string") {
    if (Buffer.byteLength(input) > MAX_BYTES) throw new Error("CSV_TOO_LARGE");
    return input;
  }
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  for await (const chunk of input) {
    const value =
      typeof chunk === "string"
        ? chunk
        : decoder.decode(chunk, { stream: true });
    bytes += Buffer.byteLength(value);
    if (bytes > MAX_BYTES) throw new Error("CSV_TOO_LARGE");
    text += value;
  }
  return text + decoder.decode();
}

function rowRecord(headers: string[], values: string[]) {
  return Object.fromEntries(
    headers.map((header, index) => [header, values[index]?.trim() ?? ""]),
  );
}

function normalizeRow(source: ParsedRow) {
  const errors: ImportPreviewRow["errors"] = [];
  for (const header of standardCatalogHeaders) {
    if (!source[header]) errors.push({ field: header, code: "REQUIRED" });
  }
  if (source.sku && !/^[A-Za-z0-9._-]{2,80}$/.test(source.sku)) {
    errors.push({ field: "sku", code: "INVALID_SKU" });
  }
  let amountMinor = 0;
  try {
    amountMinor = decimalToMinor(source.price_gel ?? "");
  } catch {
    errors.push({ field: "price_gel", code: "INVALID_MONEY" });
  }
  const onHand = Number(source.on_hand);
  if (!Number.isInteger(onHand) || onHand < 0) {
    errors.push({ field: "on_hand", code: "INVALID_QUANTITY" });
  }
  if (!["unique", "stocked"].includes(source.stock_model)) {
    errors.push({ field: "stock_model", code: "INVALID_STOCK_MODEL" });
  }
  if (source.stock_model === "unique" && onHand > 1) {
    errors.push({ field: "on_hand", code: "UNIQUE_QUANTITY_EXCEEDED" });
  }
  const dimensions = ["width_mm", "length_mm"] as const;
  for (const field of dimensions) {
    if (
      !Number.isInteger(Number(source[field])) ||
      Number(source[field]) <= 0
    ) {
      errors.push({ field, code: "INVALID_DIMENSION" });
    }
  }
  const translations = (["ka", "en", "de", "ru"] as const).map((locale) => ({
    locale,
    slug: source[`slug_${locale}`] ?? "",
    name: source[`name_${locale}`] ?? "",
    shortDescription: source[`short_${locale}`] ?? "",
    longDescription: source[`description_${locale}`] ?? "",
    careText: source[`care_${locale}`] ?? "",
    searchText: source[`name_${locale}`] ?? "",
    seoTitle: "",
    seoDescription: "",
    altTextReady: false,
    status: "draft" as const,
  }));
  const candidate = {
    sku: source.sku,
    facts: {
      widthMm: Number(source.width_mm),
      lengthMm: Number(source.length_mm),
      shape: source.shape || "rectangle",
      materials: splitCatalogTerms(source.materials ?? ""),
      construction: source.construction ?? "",
      colors: splitCatalogTerms(source.colors ?? ""),
      styles: splitCatalogTerms(source.styles ?? ""),
      condition: source.condition ?? "",
      careCode: source.care_code ?? "",
      deliveryClass: source.delivery_class || "parcel",
      category: source.category || "carpet",
      origin: source.origin ?? "",
      originVerified: source.origin_verified === "true",
    },
    translations,
    prices: [{ currency: "GEL" as const, amountMinor, enabled: true }],
    stockModel: source.stock_model,
    onHandQuantity: onHand,
    changeNote: "Created by catalog CSV import",
  };
  const parsed = catalogProductCommandSchema.safeParse(candidate);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push({ field: issue.path.join("."), code: "INVALID_VALUE" });
    }
  }
  return {
    normalized: errors.length || !parsed.success ? null : parsed.data,
    errors,
  };
}

export async function previewCatalogCsv(
  input: string | AsyncIterable<string | Uint8Array>,
) {
  const text = (await readInput(input)).replace(/^\uFEFF/, "");
  const rows = parseRows(text);
  if (rows.length < 2) throw new Error("CSV_EMPTY");
  if (rows.length - 1 > MAX_ROWS) throw new Error("CSV_TOO_MANY_ROWS");
  const headers = rows[0].map((header) => header.trim().toLowerCase());
  if (new Set(headers).size !== headers.length)
    throw new Error("CSV_DUPLICATE_HEADER");
  const missingHeaders = standardCatalogHeaders.filter(
    (header) => !headers.includes(header),
  );
  if (missingHeaders.length)
    throw new Error(`CSV_MISSING_HEADERS:${missingHeaders.join(",")}`);
  const previewRows = rows.slice(1).map((values, index) => {
    const source = rowRecord(headers, values);
    const normalized = normalizeRow(source);
    return { rowNumber: index + 2, source, ...normalized };
  });
  return {
    checksum: createHash("sha256").update(text).digest("hex"),
    headers,
    rows: previewRows,
    validCount: previewRows.filter((row) => row.errors.length === 0).length,
    invalidCount: previewRows.filter((row) => row.errors.length > 0).length,
  };
}

export function spreadsheetSafeCell(value: unknown) {
  const text = String(value ?? "");
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

export function csvCell(value: unknown) {
  return `"${spreadsheetSafeCell(value).replaceAll('"', '""')}"`;
}

export function buildImportErrorCsv(rows: ImportPreviewRow[]) {
  return [
    ["row", "field", "code", "sku"].map(csvCell).join(","),
    ...rows.flatMap((row) =>
      row.errors.map((error) =>
        [row.rowNumber, error.field, error.code, row.source.sku]
          .map(csvCell)
          .join(","),
      ),
    ),
  ].join("\r\n");
}
