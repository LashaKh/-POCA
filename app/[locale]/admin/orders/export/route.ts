import { managerCommandClient } from "@/features/auth/admin-command";

function cell(value: unknown) {
  const text = String(value ?? "");
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET() {
  let client: Awaited<ReturnType<typeof managerCommandClient>>;
  try {
    client = await managerCommandClient("orders.export.download");
  } catch {
    return new Response(null, { status: 403 });
  }
  const { data, error } = await client
    .from("staff_order_operations")
    .select(
      "reference,status,payment_status,payment_method,currency,total_minor,masked_email,accepted_at,updated_at",
    )
    .order("accepted_at", { ascending: false })
    .limit(5000);
  if (error) return new Response(null, { status: 403 });
  const headers = [
    "reference",
    "status",
    "payment_status",
    "payment_method",
    "currency",
    "total_minor",
    "masked_email",
    "accepted_at",
    "updated_at",
  ];
  const csv = [
    headers.map(cell).join(","),
    ...data.map((row) =>
      headers.map((key) => cell(row[key as keyof typeof row])).join(","),
    ),
  ].join("\r\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="epoca-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
