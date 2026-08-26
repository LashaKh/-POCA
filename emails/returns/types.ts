import { emailHtml } from "@/emails/order/types";

export type ReturnNotificationInput = {
  templateKey: string;
  orderReference: string;
  returnReference: string;
  refundAmount?: string;
};

export type ReturnEmailCopy = {
  subject: string;
  reference: string;
  order: string;
  submitted: string;
  information: string;
  approved: string;
  rejected: string;
  inTransit: string;
  received: string;
  inspected: string;
  refunded: string;
  closed: string;
};

export function renderLocalizedReturnEmail(
  copy: ReturnEmailCopy,
  input: ReturnNotificationInput,
) {
  const message =
    {
      "return-submitted": copy.submitted,
      "return-needs-information": copy.information,
      "return-approved": copy.approved,
      "return-rejected": copy.rejected,
      "return-in-transit": copy.inTransit,
      "return-received": copy.received,
      "return-inspected": copy.inspected,
      "return-refunded": copy.refunded,
      "return-closed": copy.closed,
    }[input.templateKey] ?? copy.submitted;
  const subject = `${copy.subject} ${input.returnReference}`;
  const lines = [
    message,
    `${copy.reference}: ${input.returnReference}`,
    `${copy.order}: ${input.orderReference}`,
  ];
  if (input.refundAmount) lines.push(input.refundAmount);
  return { subject, text: lines.join("\n"), html: emailHtml(subject, lines) };
}
