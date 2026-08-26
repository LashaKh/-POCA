import { execFileSync, spawn } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";

const statusOutput = execFileSync(
  fileURLToPath(new URL("../node_modules/.bin/supabase", import.meta.url)),
  ["status", "-o", "env"],
  { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
);

const localValues = Object.fromEntries(
  statusOutput
    .split("\n")
    .filter((line) => line.includes("="))
    .map((line) => {
      const separator = line.indexOf("=");
      const name = line.slice(0, separator);
      const serialized = line.slice(separator + 1);
      return [name, JSON.parse(serialized)];
    }),
);

for (const required of ["API_URL", "PUBLISHABLE_KEY", "SERVICE_ROLE_KEY"]) {
  if (!localValues[required]) {
    throw new Error(
      `Local Supabase did not report ${required}. Run npm run db:start first.`,
    );
  }
}

const nextCommand =
  process.env.EPOCA_NEXT_MODE === "build"
    ? "build"
    : process.env.EPOCA_NEXT_MODE === "start"
      ? "start"
      : "dev";

const child = spawn(
  process.execPath,
  [
    fileURLToPath(
      new URL("../node_modules/next/dist/bin/next", import.meta.url),
    ),
    nextCommand,
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DEPLOY_ENV: "local",
      NEXT_PUBLIC_SUPABASE_URL: localValues.API_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: localValues.PUBLISHABLE_KEY,
      SUPABASE_SERVICE_ROLE_KEY: localValues.SERVICE_ROLE_KEY,
      SITE_URL:
        process.env.SITE_URL ??
        `http://127.0.0.1:${process.env.PORT ?? "3000"}`,
      PAYMENT_PROVIDER_MODE: "fixture",
      EMAIL_PROVIDER_MODE: "fixture",
      ASSISTANCE_PROVIDER_MODE: "disabled",
      ANALYTICS_PROVIDER_MODE: "disabled",
      MONITORING_PROVIDER_MODE: "disabled",
    },
  },
);

child.on("error", (error) => {
  console.error("Could not start the local Next.js process.", {
    code: "code" in error ? error.code : "SPAWN_FAILED",
  });
  process.exitCode = 1;
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
