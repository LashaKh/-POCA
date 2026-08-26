"use client";

import { useState } from "react";

import { DataTable } from "@/components/ui/data-table";
import { getCatalogStatusLabel } from "@/features/catalog/admin-copy";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { formatBusinessDate } from "@/lib/datetime/format";
import { formatMinorMoney } from "@/lib/money/format";
import { minorAmount } from "@/lib/money/minor";

import { BulkToolbar } from "./bulk-toolbar";

export type CatalogTableRow = {
  id: string;
  sku: string;
  displayName: string;
  status: string;
  version: number;
  gelAmountMinor: number | null;
  onHand: number;
  reserved: number;
  available: number;
  missingLocales: string[];
  updatedAt: string;
};

export function ProductTable({
  locale,
  rows,
  initialBulkKey,
  collections,
  labels,
}: {
  locale: AppLocale;
  rows: CatalogTableRow[];
  initialBulkKey: string;
  collections: Array<{ id: string; name: string }>;
  labels: Record<string, string>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const allSelected = rows.length > 0 && selected.length === rows.length;

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id],
    );
  }

  return (
    <>
      <BulkToolbar
        locale={locale}
        productIds={selected}
        initialKey={initialBulkKey}
        collections={collections}
        labels={labels}
      />
      <DataTable caption={labels.count.replace("{count}", String(rows.length))}>
        <thead>
          <tr>
            <th className="selection-cell">
              <label className="visually-hidden" htmlFor="select-catalog-page">
                {labels.selectAll}
              </label>
              <input
                id="select-catalog-page"
                type="checkbox"
                checked={allSelected}
                onChange={() =>
                  setSelected(allSelected ? [] : rows.map((row) => row.id))
                }
              />
            </th>
            <th>{labels.product}</th>
            <th>{labels.status}</th>
            <th>{labels.price}</th>
            <th>{labels.inventory}</th>
            <th>{labels.languages}</th>
            <th>{labels.updated}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="selection-cell">
                <label className="visually-hidden" htmlFor={`select-${row.id}`}>
                  {labels.selectProduct.replace("{name}", row.displayName)}
                </label>
                <input
                  id={`select-${row.id}`}
                  type="checkbox"
                  checked={selected.includes(row.id)}
                  onChange={() => toggle(row.id)}
                />
              </td>
              <td>
                <Link href={`/admin/products/${row.id}/edit`} locale={locale}>
                  <strong>{row.displayName}</strong>
                </Link>
                <small className="table-secondary">
                  {row.sku} · v{row.version}
                </small>
              </td>
              <td>
                <span className={`status-chip status-${row.status}`}>
                  {getCatalogStatusLabel(labels, row.status)}
                </span>
              </td>
              <td>
                {row.gelAmountMinor === null
                  ? "—"
                  : formatMinorMoney(
                      minorAmount(row.gelAmountMinor),
                      "GEL",
                      locale,
                    )}
              </td>
              <td>
                {row.available} {labels.availableShort} · {row.reserved}{" "}
                {labels.reservedShort}
              </td>
              <td>
                {row.missingLocales.length
                  ? labels.missingLocales.replace(
                      "{locales}",
                      row.missingLocales.join(", "),
                    )
                  : labels.allLanguages}
              </td>
              <td>
                <time dateTime={row.updatedAt}>
                  {formatBusinessDate(row.updatedAt)}
                </time>
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </>
  );
}
