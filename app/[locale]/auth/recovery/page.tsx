import { getTranslations } from "next-intl/server";

import { RecoveryForm } from "@/components/auth/recovery-form";
import { isAppLocale } from "@/i18n/routing";

export default async function RecoveryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isAppLocale(locale)) return null;
  const update = query.mode === "update";
  const t = await getTranslations({ locale, namespace: "auth" });
  return (
    <main className="system-state" id="main-content">
      <h1>{update ? t("recoveryUpdateTitle") : t("recoveryTitle")}</h1>
      <p>{update ? t("recoveryUpdateBody") : t("recoveryBody")}</p>
      <RecoveryForm
        locale={locale}
        update={update}
        labels={{
          email: t("email"),
          password: t("newPassword"),
          confirmation: t("confirmPassword"),
          submit: update ? t("recoveryUpdate") : t("recoveryRequest"),
          generic: t("recoveryGeneric"),
          failed: t("recoveryInvalid"),
        }}
      />
    </main>
  );
}
