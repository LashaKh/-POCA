import { emailHtml, type OrderEmailInput } from "./types";

export function renderEnglishOrderEmail(input: OrderEmailInput) {
  const subject = `ÉPOCA order ${input.orderReference}`;
  const lines = [
    `We received your order for ${input.amount}.`,
    `Transfer by ${input.dueAt}.`,
    `Beneficiary: ${input.beneficiary}`,
    `Bank: ${input.bank}`,
    `IBAN: ${input.iban}`,
    `Reference: ${input.orderReference}`,
    input.instructions,
  ];
  return { subject, text: lines.join("\n"), html: emailHtml(subject, lines) };
}
