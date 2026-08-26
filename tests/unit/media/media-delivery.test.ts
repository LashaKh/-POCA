import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const consumers = [
  "components/storefront/responsive-product-image.tsx",
  "components/admin/ingestion/crop-editor.tsx",
  "components/auth/mfa-workspace.tsx",
] as const;

describe("media delivery consumers", () => {
  it("keeps every raw or optimized image consumer in the reviewed inventory", () => {
    const discovered: string[] = [];
    for (const root of ["app", "components"]) {
      const walk = (directory: string) => {
        for (const entry of fs.readdirSync(directory, {
          withFileTypes: true,
        })) {
          const target = path.join(directory, entry.name);
          if (entry.isDirectory()) walk(target);
          else if (entry.name.endsWith(".tsx")) {
            const source = fs.readFileSync(target, "utf8");
            if (source.includes("<Image") || source.includes("<img")) {
              discovered.push(target);
            }
          }
        }
      };
      walk(root);
    }
    expect(discovered.sort()).toEqual([...consumers].sort());
  });

  it("reserves image space and protects public failures", () => {
    const responsive = fs.readFileSync(consumers[0], "utf8");
    expect(responsive).toContain("width={width}");
    expect(responsive).toContain("height={height}");
    expect(responsive).toContain("sizes={sizes}");
    expect(responsive).toContain("onError={() => setFailedSrc(src)}");
    const crop = fs.readFileSync(consumers[1], "utf8");
    expect(crop).toContain("never the public original");
    expect(crop).toContain('loading="lazy"');
  });
});
