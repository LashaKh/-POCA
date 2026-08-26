"use client";

import { useEffect } from "react";

const copy = {
  ka: {
    title: "ÉPOCA დროებით მიუწვდომელია",
    body: "თქვენი ინფორმაცია უსაფრთხოდაა. გთხოვთ, ხელახლა სცადოთ.",
    retry: "ხელახლა ცდა",
  },
  en: {
    title: "ÉPOCA is temporarily unavailable",
    body: "Your information is safe. Please try again.",
    retry: "Try again",
  },
  de: {
    title: "ÉPOCA ist vorübergehend nicht verfügbar",
    body: "Ihre Angaben sind sicher. Bitte versuchen Sie es erneut.",
    retry: "Erneut versuchen",
  },
  ru: {
    title: "ÉPOCA временно недоступна",
    body: "Ваши данные в безопасности. Попробуйте ещё раз.",
    retry: "Повторить",
  },
} as const;

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const language =
    typeof navigator === "undefined"
      ? "en"
      : navigator.language.toLowerCase().split("-")[0];
  const locale =
    language === "ka" || language === "de" || language === "ru"
      ? language
      : "en";
  const text = copy[locale];
  useEffect(() => {
    console.error("The application shell failed safely.", {
      digest: error.digest,
    });
  }, [error.digest]);
  return (
    <html lang={locale}>
      <body>
        <main className="system-state" id="main-content">
          <p className="eyebrow">ÉPOCA</p>
          <h1>{text.title}</h1>
          <p>{text.body}</p>
          <button className="button" type="button" onClick={reset}>
            {text.retry}
          </button>
        </main>
      </body>
    </html>
  );
}
