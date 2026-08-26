import { getTranslations } from "next-intl/server";

export default async function ProductNotFound() {
  const t = await getTranslations("catalog");
  return (
    <main className="system-state" id="main-content">
      <h1>{t("notFound")}</h1>
    </main>
  );
}
