"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

export default function LocalizedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("systemStates");
  useEffect(() => {
    console.error("A localized page failed safely.", { digest: error.digest });
  }, [error.digest]);
  return (
    <main className="system-state" id="main-content">
      <p className="eyebrow">ÉPOCA</p>
      <h1>{t("errorTitle")}</h1>
      <p>{t("errorBody")}</p>
      <button className="button" type="button" onClick={reset}>
        {t("retry")}
      </button>
    </main>
  );
}
