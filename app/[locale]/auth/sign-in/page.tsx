import { getTranslations } from "next-intl/server";

import { SignInForm } from "@/components/auth/sign-in-form";
import { isSafeReturnPath } from "@/features/auth/context";
import { isAppLocale } from "@/i18n/routing";

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  const [t, query] = await Promise.all([
    getTranslations({ locale, namespace: "auth" }),
    searchParams,
  ]);
  const returnTo =
    query.returnTo && isSafeReturnPath(query.returnTo)
      ? query.returnTo
      : "/account";

  return (
    <main className="system-state" id="main-content">
      <h1>{t("signInTitle")}</h1>
      <p>{t("signInBody")}</p>
      <SignInForm
        locale={locale}
        returnTo={returnTo}
        labels={{
          email: t("email"),
          password: t("password"),
          submit: t("signIn"),
          failed: t("invalidCredentials"),
        }}
      />
    </main>
  );
}
