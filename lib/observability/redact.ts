const forbiddenKeys = new Set([
  "address",
  "authorization",
  "cardnumber",
  "cookie",
  "cvv",
  "email",
  "message",
  "password",
  "payload",
  "prompt",
  "secret",
  "token",
]);

export function redactForLog(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[depth-limited]";
  if (value === null || typeof value === "boolean" || typeof value === "number")
    return value;
  if (typeof value === "string")
    return value.length <= 240 ? value : `${value.slice(0, 237)}...`;
  if (value instanceof Error)
    return { name: value.name, message: "[redacted-error]" };
  if (Array.isArray(value))
    return value.slice(0, 20).map((item) => redactForLog(item, depth + 1));
  if (typeof value !== "object") return String(value);

  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value).slice(0, 40)) {
    result[key] = forbiddenKeys.has(key.toLowerCase())
      ? "[redacted]"
      : redactForLog(child, depth + 1);
  }
  return result;
}
