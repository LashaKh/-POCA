import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { relative, resolve } from "node:path";

const root = process.cwd();
const output = resolve(root, "artifacts/security");
mkdirSync(output, { recursive: true });

const sbomCommand = spawnSync(
  "npm",
  ["sbom", "--omit=dev", "--sbom-format", "cyclonedx"],
  {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  },
);

function packageLockSbom() {
  const lock = JSON.parse(
    readFileSync(resolve(root, "package-lock.json"), "utf8"),
  );
  const components = Object.entries(lock.packages ?? {})
    .filter(([packagePath, metadata]) => packagePath && !metadata.dev)
    .map(([packagePath, metadata]) => {
      const name = packagePath.replace(/^.*node_modules\//, "");
      const version = metadata.version ?? "unknown";
      const purl = `pkg:npm/${encodeURIComponent(name)}@${encodeURIComponent(version)}`;
      return {
        type: "library",
        "bom-ref": purl,
        name,
        version,
        purl,
        licenses:
          typeof metadata.license === "string"
            ? [{ expression: metadata.license }]
            : undefined,
        properties: [
          { name: "epoca:package-lock-path", value: packagePath },
          { name: "epoca:optional", value: String(Boolean(metadata.optional)) },
        ],
      };
    });
  return {
    bomFormat: "CycloneDX",
    specVersion: "1.6",
    serialNumber: `urn:uuid:${randomUUID()}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: {
        components: [
          {
            type: "application",
            name: "epoca-package-lock-sbom",
            version: "1",
          },
        ],
      },
      component: {
        type: "application",
        "bom-ref": "pkg:npm/epoca-online-shop@0.1.0",
        name: "epoca-online-shop",
        version: "0.1.0",
      },
      properties: [
        {
          name: "epoca:generation-note",
          value:
            "Generated from the locked production graph because npm omitted a platform-specific optional Sharp runtime.",
        },
      ],
    },
    components,
  };
}

let sbomDocument;
if (sbomCommand.status === 0 && sbomCommand.stdout.trim()) {
  sbomDocument = JSON.parse(sbomCommand.stdout);
} else {
  sbomDocument = packageLockSbom();
}
writeFileSync(
  resolve(output, "sbom.cyclonedx.json"),
  JSON.stringify(sbomDocument, null, 2) + "\n",
);

const providerEgress = {
  generatedAt: new Date().toISOString(),
  defaultProductionPosture: "disabled-until-verified",
  providers: [
    {
      provider: "Supabase",
      purpose: "database, auth, private/public object storage",
      destination: "configured project origin",
      data: "shop records and scoped media",
      modeEnvironment: "NEXT_PUBLIC_SUPABASE_URL",
    },
    {
      provider: "Netlify",
      purpose: "hosting, functions, schedules",
      destination: "configured Netlify site",
      data: "HTTP requests and privacy-safe logs",
      modeEnvironment: "DEPLOY_ENV/SITE_URL",
    },
    {
      provider: "TBC",
      purpose: "hosted payment and signed callbacks",
      destination: "TBC API base URL",
      data: "order reference, amount, currency; no card data",
      modeEnvironment: "PAYMENT_PROVIDER_MODE",
    },
    {
      provider: "Resend",
      purpose: "transactional email and signed delivery events",
      destination: "https://api.resend.com",
      data: "recipient, locale, minimum notification payload",
      modeEnvironment: "EMAIL_PROVIDER_MODE",
    },
    {
      provider: "OpenAI",
      purpose: "optional staff-reviewed catalog assistance",
      destination: "OpenAI API",
      data: "approved product/media context; suggestions are never auto-published",
      modeEnvironment: "ASSISTANCE_PROVIDER_MODE",
    },
    {
      provider: "PostHog",
      purpose: "optional consent-gated named analytics",
      destination: "configured PostHog origin",
      data: "allowlisted event names and non-PII properties",
      modeEnvironment: "ANALYTICS_PROVIDER_MODE",
    },
    {
      provider: "Sentry",
      purpose: "optional scrubbed error monitoring",
      destination: "DSN-derived origin",
      data: "safe error code, release, correlation reference; PII off",
      modeEnvironment: "MONITORING_PROVIDER_MODE",
    },
  ],
};
writeFileSync(
  resolve(output, "provider-egress.json"),
  JSON.stringify(providerEgress, null, 2) + "\n",
);

function filesUnder(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((name) => {
    const target = resolve(directory, name);
    return statSync(target).isDirectory() ? filesUnder(target) : [target];
  });
}

const subjects = [
  resolve(root, "package-lock.json"),
  ...filesUnder(resolve(root, "supabase/migrations")),
  resolve(output, "sbom.cyclonedx.json"),
  resolve(output, "provider-egress.json"),
  resolve(output, "licenses.json"),
  resolve(output, "epoca-source.tgz"),
  resolve(root, ".next/build-manifest.json"),
  resolve(root, ".next/routes-manifest.json"),
].filter(existsSync);

const checksums = subjects
  .sort()
  .map((target) => {
    const digest = createHash("sha256")
      .update(readFileSync(target))
      .digest("hex");
    return `${digest}  ${relative(root, target)}`;
  })
  .join("\n");
writeFileSync(resolve(output, "checksums.sha256"), checksums + "\n");
writeFileSync(
  resolve(output, "manifest.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      node: process.version,
      checksums: checksums.split("\n").length,
      signing:
        "GitHub Actions signs provenance and SBOM attestations with short-lived Sigstore certificates; local output is checksum-verifiable only.",
    },
    null,
    2,
  ) + "\n",
);
process.stdout.write(
  `PASS  Security artifacts — ${subjects.length} subjects checksummed.\n`,
);
