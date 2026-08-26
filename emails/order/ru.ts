import { emailHtml, type OrderEmailInput } from "./types";

export function renderRussianOrderEmail(input: OrderEmailInput) {
  const subject = `ÉPOCA заказ ${input.orderReference}`;
  const lines = [
    `Мы получили ваш заказ на сумму ${input.amount}.`,
    `Переведите оплату до ${input.dueAt}.`,
    `Получатель: ${input.beneficiary}`,
    `Банк: ${input.bank}`,
    `IBAN: ${input.iban}`,
    `Назначение: ${input.orderReference}`,
    input.instructions,
  ];
  return { subject, text: lines.join("\n"), html: emailHtml(subject, lines) };
}
