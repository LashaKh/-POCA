import { emailHtml, type OrderEmailInput } from "./types";

export function renderGermanOrderEmail(input: OrderEmailInput) {
  const subject = `ÉPOCA Bestellung ${input.orderReference}`;
  const lines = [
    `Wir haben Ihre Bestellung über ${input.amount} erhalten.`,
    `Bitte überweisen Sie bis ${input.dueAt}.`,
    `Empfänger: ${input.beneficiary}`,
    `Bank: ${input.bank}`,
    `IBAN: ${input.iban}`,
    `Verwendungszweck: ${input.orderReference}`,
    input.instructions,
  ];
  return { subject, text: lines.join("\n"), html: emailHtml(subject, lines) };
}
