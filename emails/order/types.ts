export type OrderEmailInput = {
  orderReference: string;
  amount: string;
  dueAt: string;
  beneficiary: string;
  bank: string;
  iban: string;
  instructions: string;
};

export type RenderedOrderEmail = {
  subject: string;
  text: string;
  html: string;
};

export function escapeEmailHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function emailHtml(title: string, lines: string[]) {
  return `<main><h1>${escapeEmailHtml(title)}</h1>${lines.map((line) => `<p>${escapeEmailHtml(line)}</p>`).join("")}</main>`;
}
