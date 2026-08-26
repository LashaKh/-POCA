import type { AppLocale } from "@/i18n/routing";

import { emailHtml, type RenderedOrderEmail } from "./types";

export type OrderNotificationInput = {
  templateKey: string;
  orderReference: string;
  amount?: string;
  paymentStatus?: string;
  carrier?: string;
  trackingReference?: string;
  trackingUrl?: string;
  refundAmount?: string;
};

type Copy = {
  subject: string;
  accepted: string;
  paymentPending: string;
  paymentConfirmed: string;
  paymentUpdate: string;
  shipped: string;
  delivered: string;
  cancelled: string;
  refunded: string;
  staffAlert: string;
  reference: string;
};

const copy: Record<AppLocale, Copy> = {
  en: {
    subject: "ÉPOCA order",
    accepted: "We received your order.",
    paymentPending: "Your secure payment is awaiting bank confirmation.",
    paymentConfirmed:
      "Your payment is confirmed and the order is ready for preparation.",
    paymentUpdate:
      "Your payment status changed. Check the order page for the authoritative status.",
    shipped: "Your carpet has shipped.",
    delivered: "The shipment has been marked delivered.",
    cancelled: "Your order has been cancelled.",
    refunded: "A refund has been confirmed.",
    staffAlert: "An order operation needs staff attention.",
    reference: "Order reference",
  },
  ka: {
    subject: "ÉPOCA შეკვეთა",
    accepted: "თქვენი შეკვეთა მივიღეთ.",
    paymentPending: "უსაფრთხო გადახდა ბანკის დადასტურებას ელოდება.",
    paymentConfirmed: "გადახდა დადასტურებულია და შეკვეთა მოსამზადებლად მზადაა.",
    paymentUpdate:
      "გადახდის სტატუსი შეიცვალა. ზუსტი სტატუსი იხილეთ შეკვეთის გვერდზე.",
    shipped: "თქვენი ხალიჩა გაიგზავნა.",
    delivered: "გზავნილი მონიშნულია როგორც ჩაბარებული.",
    cancelled: "თქვენი შეკვეთა გაუქმდა.",
    refunded: "თანხის დაბრუნება დადასტურდა.",
    staffAlert: "შეკვეთის ოპერაციას თანამშრომლის ყურადღება სჭირდება.",
    reference: "შეკვეთის ნომერი",
  },
  de: {
    subject: "ÉPOCA Bestellung",
    accepted: "Wir haben Ihre Bestellung erhalten.",
    paymentPending: "Ihre sichere Zahlung wartet auf die Bestätigung der Bank.",
    paymentConfirmed:
      "Ihre Zahlung ist bestätigt; die Bestellung kann vorbereitet werden.",
    paymentUpdate:
      "Ihr Zahlungsstatus hat sich geändert. Den verbindlichen Stand finden Sie auf der Bestellseite.",
    shipped: "Ihr Teppich wurde versandt.",
    delivered: "Die Sendung wurde als zugestellt markiert.",
    cancelled: "Ihre Bestellung wurde storniert.",
    refunded: "Eine Erstattung wurde bestätigt.",
    staffAlert: "Ein Bestellvorgang erfordert Aufmerksamkeit.",
    reference: "Bestellreferenz",
  },
  ru: {
    subject: "Заказ ÉPOCA",
    accepted: "Мы получили ваш заказ.",
    paymentPending: "Безопасная оплата ожидает подтверждения банка.",
    paymentConfirmed: "Оплата подтверждена, заказ готов к подготовке.",
    paymentUpdate:
      "Статус оплаты изменился. Актуальный статус указан на странице заказа.",
    shipped: "Ваш ковёр отправлен.",
    delivered: "Отправление отмечено как доставленное.",
    cancelled: "Ваш заказ отменён.",
    refunded: "Возврат средств подтверждён.",
    staffAlert: "Операция с заказом требует внимания сотрудника.",
    reference: "Номер заказа",
  },
};

function messageForTemplate(value: Copy, templateKey: string) {
  if (templateKey === "order-payment-pending") return value.paymentPending;
  if (templateKey === "order-payment-confirmed") return value.paymentConfirmed;
  if (templateKey === "order-payment-update") return value.paymentUpdate;
  if (templateKey === "order-shipped") return value.shipped;
  if (templateKey === "order-delivered") return value.delivered;
  if (templateKey === "order-cancelled") return value.cancelled;
  if (templateKey === "order-refunded") return value.refunded;
  if (templateKey === "order-staff-alert") return value.staffAlert;
  return value.accepted;
}

export function renderOrderNotification(
  locale: AppLocale,
  input: OrderNotificationInput,
): RenderedOrderEmail {
  const value = copy[locale];
  const subject = `${value.subject} ${input.orderReference}`;
  const lines = [
    messageForTemplate(value, input.templateKey),
    `${value.reference}: ${input.orderReference}`,
  ];
  if (input.amount) lines.push(input.amount);
  if (input.refundAmount) lines.push(input.refundAmount);
  if (input.carrier) lines.push(input.carrier);
  if (input.trackingReference) lines.push(input.trackingReference);
  if (input.trackingUrl) lines.push(input.trackingUrl);
  return { subject, text: lines.join("\n"), html: emailHtml(subject, lines) };
}
