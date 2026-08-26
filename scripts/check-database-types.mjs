import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const generatedPath = resolve(root, "lib/supabase/database.types.ts");
const supabaseCli = resolve(root, "node_modules/.bin/supabase");

function normalize(value) {
  const typeStart = value.indexOf("export type Json");

  if (typeStart === -1) {
    throw new Error(
      "Supabase type output did not contain the expected Json type.",
    );
  }

  return `${value.slice(typeStart).trim()}\n`;
}

const generated = execFileSync(
  supabaseCli,
  ["gen", "types", "typescript", "--local", "--schema", "public"],
  {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  },
);

const committed = readFileSync(generatedPath, "utf8");
const normalizedGenerated = normalize(generated);

if (process.argv.includes("--write")) {
  writeFileSync(generatedPath, normalizedGenerated, "utf8");
  process.stdout.write(`Updated ${generatedPath}.\n`);
  process.exit(0);
}

if (normalizedGenerated !== normalize(committed)) {
  throw new Error(
    "Committed database types do not match local migrations. Regenerate and review lib/supabase/database.types.ts.",
  );
}

process.stdout.write("Database types match local migrations.\n");
