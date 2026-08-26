"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { managerCommandClient } from "@/features/auth/admin-command";
import { isAppLocale } from "@/i18n/routing";
import {
  commandFailure,
  commandSuccess,
  type CommandResult,
} from "@/lib/validation/command-result";

import { parseReportFilters } from "./schema";

export type ReportExportState = CommandResult<{ id: string }> | undefined;

export async function requestOperationalReportExportAction(
  _previous: ReportExportState,
  formData: FormData,
): Promise<ReportExportState> {
  const correlationId = randomUUID();
  const locale = String(formData.get("locale") ?? "");
  const failed = () =>
    commandFailure(
      {
        code: "INVALID_INPUT",
        messageKey: "admin.reporting.exportFailed",
        retryable: false,
      },
      correlationId,
    );
  if (!isAppLocale(locale)) return failed();
  try {
    const filters = parseReportFilters({
      from: String(formData.get("from") ?? ""),
      to: String(formData.get("to") ?? ""),
      currency: String(formData.get("currency") ?? ""),
    });
    const client = await managerCommandClient("report.export");
    const result = await client.rpc("request_operational_report_export", {
      p_from: filters.from,
      p_to: filters.to,
      p_currency: filters.currency,
    });
    if (result.error) return failed();
    revalidatePath(`/${locale}/admin/reports`);
    return commandSuccess({ id: result.data.id }, correlationId);
  } catch {
    return failed();
  }
}
