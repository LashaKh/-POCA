import { emailHtml } from "@/emails/order/types";

export type QuoteNotificationInput = {
  templateKey: string;
  quoteReference: string;
  amount?: string;
};

export type QuoteEmailCopy = {
  subject: string;
  reference: string;
  submitted: string;
  information: string;
  ready: string;
  accepted: string;
  declined: string;
};

export function renderLocalizedQuoteEmail(
  copy: QuoteEmailCopy,
  input: QuoteNotificationInput,
) {
  const message =
    {
      "quote-submitted": copy.submitted,
      "quote-needs-information": copy.information,
      "quote-ready": copy.ready,
      "quote-accepted": copy.accepted,
      "quote-declined": copy.declined,
    }[input.templateKey] ?? copy.submitted;
  const subject = `${copy.subject} ${input.quoteReference}`;
  const lines = [message, `${copy.reference}: ${input.quoteReference}`];
  if (input.amount) lines.push(input.amount);
  return { subject, text: lines.join("\n"), html: emailHtml(subject, lines) };
}
