import { parseEnvironment, publicEnvironmentSchema } from "./schema";

export type PublicEnvironment = ReturnType<typeof parsePublicEnvironment>;

export function parsePublicEnvironment(input: unknown) {
  return parseEnvironment(publicEnvironmentSchema, input);
}

export function getPublicEnvironment() {
  return parsePublicEnvironment({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  });
}
