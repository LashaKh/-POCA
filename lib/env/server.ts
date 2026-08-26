import "server-only";

import { parseEnvironment, serverEnvironmentSchema } from "./schema";

export type ServerEnvironment = ReturnType<typeof parseServerEnvironment>;

export function parseServerEnvironment(input: unknown) {
  return parseEnvironment(serverEnvironmentSchema, input);
}

export function getServerEnvironment() {
  return parseServerEnvironment(process.env);
}
