import { readdir } from "node:fs/promises";
import process from "node:process";

const files = (await readdir("supabase/migrations"))
  .filter((file) => file.endsWith(".sql"))
  .sort();
const invalid = files.filter((file) => !/^\d{12}_[a-z0-9_]+\.sql$/.test(file));
const versions = files.map((file) => file.slice(0, 12));
const duplicateVersions = versions.filter(
  (version, index) => versions.indexOf(version) !== index,
);
const ordered = files.every(
  (file, index) => index === 0 || files[index - 1].localeCompare(file) < 0,
);

if (invalid.length || duplicateVersions.length || !ordered) {
  process.stderr.write(
    `Migration contract failed: invalid=${invalid.join(",") || "none"}; duplicate=${[...new Set(duplicateVersions)].join(",") || "none"}; ordered=${ordered}.\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Migration contract passed: ${files.length} unique, ordered migrations through ${versions.at(-1)}.\n`,
  );
}
