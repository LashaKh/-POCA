import { emailHtml, type OrderEmailInput } from "./types";

export function renderGeorgianOrderEmail(input: OrderEmailInput) {
  const subject = `ÉPOCA შეკვეთა ${input.orderReference}`;
  const lines = [
    `თქვენი ${input.amount}-ის შეკვეთა მიღებულია.`,
    `გადარიცხვის ვადა: ${input.dueAt}.`,
    `მიმღები: ${input.beneficiary}`,
    `ბანკი: ${input.bank}`,
    `IBAN: ${input.iban}`,
    `დანიშნულება: ${input.orderReference}`,
    input.instructions,
  ];
  return { subject, text: lines.join("\n"), html: emailHtml(subject, lines) };
}
