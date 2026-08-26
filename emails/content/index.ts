import type { AppLocale } from "@/i18n/routing";
import { emailHtml } from "@/emails/order/types";

type Input = { templateKey: string; reference: string };

const copy: Record<
  AppLocale,
  {
    subject: string;
    subscribed: string;
    withdrawn: string;
    scheduleFailed: string;
    reference: string;
  }
> = {
  en: {
    subject: "ÉPOCA update",
    subscribed: "Your optional email subscription is active.",
    withdrawn: "Your email subscription has been withdrawn.",
    scheduleFailed: "A scheduled content operation needs staff review.",
    reference: "Reference",
  },
  ka: {
    subject: "ÉPOCA განახლება",
    subscribed: "არჩევითი ელფოსტის გამოწერა აქტიურია.",
    withdrawn: "ელფოსტის გამოწერა გაუქმებულია.",
    scheduleFailed:
      "დაგეგმილ კონტენტის ოპერაციას თანამშრომლის შემოწმება სჭირდება.",
    reference: "ნომერი",
  },
  de: {
    subject: "ÉPOCA Aktualisierung",
    subscribed: "Ihr optionales E-Mail-Abonnement ist aktiv.",
    withdrawn: "Ihr E-Mail-Abonnement wurde widerrufen.",
    scheduleFailed: "Ein geplanter Inhaltsvorgang muss geprüft werden.",
    reference: "Referenz",
  },
  ru: {
    subject: "Обновление ÉPOCA",
    subscribed: "Необязательная почтовая подписка активна.",
    withdrawn: "Почтовая подписка отозвана.",
    scheduleFailed: "Запланированная операция с контентом требует проверки.",
    reference: "Номер",
  },
};

export function renderContentNotification(locale: AppLocale, input: Input) {
  const value = copy[locale];
  const message =
    input.templateKey === "newsletter-withdrawn"
      ? value.withdrawn
      : input.templateKey === "content-schedule-failed"
        ? value.scheduleFailed
        : value.subscribed;
  const subject = `${value.subject} ${input.reference}`;
  const lines = [message, `${value.reference}: ${input.reference}`];
  return { subject, text: lines.join("\n"), html: emailHtml(subject, lines) };
}
