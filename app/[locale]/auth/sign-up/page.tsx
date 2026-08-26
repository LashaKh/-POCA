import { getTranslations } from "next-intl/server";

import { CustomerSignUpForm } from "@/components/auth/customer-sign-up-form";
import { isSafeReturnPath } from "@/features/auth/context";
import { isAppLocale } from "@/i18n/routing";

export default async function CustomerSignUpPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isAppLocale(locale)) return null;
  const t = await getTranslations({ locale, namespace: "auth" });
  const returnTo =
    query.returnTo && isSafeReturnPath(query.returnTo)
      ? query.returnTo
      : "/account";
  return (
    <main className="system-state" id="main-content">
      <h1>{t("signUpTitle")}</h1>
      <p>{t("signUpBody")}</p>
      <CustomerSignUpForm
        locale={locale}
        returnTo={returnTo}
        labels={{
          name: t("displayName"),
          email: t("email"),
          password: t("newPassword"),
          confirmation: t("confirmPassword"),
          terms: t("signUpTerms"),
          marketing: t("signUpMarketing"),
          submit: t("signUp"),
          generic: t("signUpGeneric"),
          failed: t("signUpInvalid"),
          signIn: t("alreadyRegistered"),
        }}
      />
    </main>
  );
}
