const TBILISI_OFFSET_MS = 4 * 60 * 60 * 1000;

function businessParts(value: string) {
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return undefined;
  const local = new Date(instant.getTime() + TBILISI_OFFSET_MS);
  return {
    year: String(local.getUTCFullYear()).padStart(4, "0"),
    month: String(local.getUTCMonth() + 1).padStart(2, "0"),
    day: String(local.getUTCDate()).padStart(2, "0"),
    hour: String(local.getUTCHours()).padStart(2, "0"),
    minute: String(local.getUTCMinutes()).padStart(2, "0"),
  };
}

export function formatBusinessDate(value: string) {
  const parts = businessParts(value);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : "—";
}

export function formatBusinessDateTime(value: string) {
  const parts = businessParts(value);
  return parts
    ? `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute} GET`
    : "—";
}

export function formatBusinessDateTimeInput(value: string | null) {
  if (!value) return "";
  const parts = businessParts(value);
  return parts
    ? `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
    : "";
}
