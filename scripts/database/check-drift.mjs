import { spawnSync } from "node:child_process";
import process from "node:process";

const result = spawnSync(
  "node_modules/.bin/supabase",
  ["db", "diff", "--local", "--schema", "public", "--use-migra"],
  { encoding: "utf8" },
);
if (result.status !== 0) {
  process.stderr.write(result.stderr || "Migration drift check failed.\n");
  process.exitCode = result.status ?? 1;
} else {
  let diff = result.stdout;
  try {
    const parsed = JSON.parse(result.stdout);
    if (typeof parsed.diff === "string") diff = parsed.diff;
  } catch {
    // The CLI may emit plain SQL or a structured envelope depending on runtime.
  }
  const meaningful = diff
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("--"));
  if (meaningful.length) {
    process.stderr.write("Migration drift detected.\n");
    process.stderr.write(`${meaningful.slice(0, 40).join("\n")}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write("No local schema drift detected.\n");
  }
}
