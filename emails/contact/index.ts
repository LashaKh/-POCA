import type { AppLocale } from "@/i18n/routing";
import { emailHtml } from "@/emails/order/types";

type Input = { templateKey: string; contactReference: string };

const copy: Record<
  AppLocale,
  {
    subject: string;
    received: string;
    failed: string;
    staff: string;
    reference: string;
  }
> = {
  en: {
    subject: "ÉPOCA message",
    received:
      "We received your private message and will respond through the provided contact address.",
    failed:
      "We could not deliver the message notification. Your reference remains valid; check its status or contact us again.",
    staff: "A new private support message is ready in Administration.",
    reference: "Message reference",
  },
  ka: {
    subject: "ÉPOCA შეტყობინება",
    received:
      "თქვენი პირადი შეტყობინება მივიღეთ და მითითებულ მისამართზე გიპასუხებთ.",
    failed:
      "შეტყობინების შეტყობინება ვერ გაიგზავნა. ნომერი მოქმედია; შეამოწმეთ სტატუსი ან ხელახლა დაგვიკავშირდით.",
    staff: "ადმინისტრაციაში ახალი პირადი მხარდაჭერის შეტყობინებაა.",
    reference: "შეტყობინების ნომერი",
  },
  de: {
    subject: "ÉPOCA Nachricht",
    received:
      "Wir haben Ihre private Nachricht erhalten und antworten über die angegebene Kontaktadresse.",
    failed:
      "Die Benachrichtigung konnte nicht zugestellt werden. Ihre Referenz bleibt gültig; prüfen Sie den Status oder kontaktieren Sie uns erneut.",
    staff:
      "Eine neue private Supportnachricht ist in der Administration verfügbar.",
    reference: "Nachrichtenreferenz",
  },
  ru: {
    subject: "Сообщение ÉPOCA",
    received: "Мы получили закрытое сообщение и ответим по указанному адресу.",
    failed:
      "Уведомление не доставлено. Номер остаётся действительным; проверьте статус или свяжитесь снова.",
    staff: "В административной панели доступно новое закрытое обращение.",
    reference: "Номер сообщения",
  },
};

export function renderContactNotification(locale: AppLocale, input: Input) {
  const value = copy[locale];
  const message =
    input.templateKey === "contact-staff-alert"
      ? value.staff
      : input.templateKey === "contact-failed"
        ? value.failed
        : value.received;
  const subject = `${value.subject} ${input.contactReference}`;
  const lines = [message, `${value.reference}: ${input.contactReference}`];
  return { subject, text: lines.join("\n"), html: emailHtml(subject, lines) };
}
