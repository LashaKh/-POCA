import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const lock = JSON.parse(
  readFileSync(resolve(root, "package-lock.json"), "utf8"),
);
const forbidden = /(^|\W)(AGPL|GPL-(?:1|2|3)|SSPL|BUSL)(?:\W|$)/i;
const reviewedMissing = new Set(["node_modules/combine-errors"]);
const records = [];

for (const [packagePath, metadata] of Object.entries(lock.packages ?? {})) {
  if (!packagePath) continue;
  const name = packagePath.replace(/^.*node_modules\//, "");
  const license =
    typeof metadata.license === "string" ? metadata.license : "UNDECLARED";
  records.push({
    name,
    version: metadata.version ?? "unknown",
    license,
    packagePath,
  });
}

const forbiddenPackages = records.filter((record) =>
  forbidden.test(record.license),
);
const unknownPackages = records.filter(
  (record) =>
    record.license === "UNDECLARED" && !reviewedMissing.has(record.packagePath),
);
if (forbiddenPackages.length || unknownPackages.length) {
  throw new Error(
    `License gate failed: ${forbiddenPackages.length} forbidden, ${unknownPackages.length} undeclared.`,
  );
}

mkdirSync(resolve(root, "artifacts/security"), { recursive: true });
writeFileSync(
  resolve(root, "artifacts/security/licenses.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      packageCount: records.length,
      forbiddenPackages,
      reviewedMetadataExceptions: [...reviewedMissing],
      licenses: [...new Set(records.map((record) => record.license))].sort(),
      packages: records.sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    },
    null,
    2,
  ) + "\n",
);
process.stdout.write(
  `PASS  Licenses — ${records.length} locked packages checked.\n`,
);
