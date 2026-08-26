import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { MfaWorkspace } from "@/components/auth/mfa-workspace";
import { isSafeReturnPath } from "@/features/auth/context";
import { isAppLocale } from "@/i18n/routing";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function MfaPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isAppLocale(locale)) return null;
  const client = await createServerSupabaseClient();
  const [user, factors, t] = await Promise.all([
    client.auth.getUser(),
    client.auth.mfa.listFactors(),
    getTranslations({ locale, namespace: "auth" }),
  ]);
  if (!user.data.user) redirect(`/${locale}/auth/sign-in`);
  const returnTo =
    query.returnTo && isSafeReturnPath(query.returnTo)
      ? query.returnTo
      : "/admin";
  return (
    <main className="system-state" id="main-content">
      <MfaWorkspace
        locale={locale}
        returnTo={returnTo}
        verifiedFactorIds={(factors.data?.totp ?? [])
          .filter((factor) => factor.status === "verified")
          .map((factor) => factor.id)}
        labels={{
          title: t("mfaTitle"),
          body: t("mfaBody"),
          enroll: t("mfaEnroll"),
          scan: t("mfaScan"),
          manual: t("mfaManual"),
          code: t("mfaCode"),
          verify: t("mfaVerify"),
          failed: t("mfaFailed"),
        }}
      />
    </main>
  );
}
