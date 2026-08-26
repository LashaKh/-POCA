import {
  renderLocalizedReturnEmail,
  type ReturnNotificationInput,
} from "./types";

export function renderEnglishReturnEmail(input: ReturnNotificationInput) {
  return renderLocalizedReturnEmail(
    {
      subject: "ÉPOCA return",
      reference: "Return reference",
      order: "Order reference",
      submitted: "We received your request.",
      information: "We need more information before the review can continue.",
      approved: "Your request has been approved.",
      rejected:
        "Your request was not approved; the reason is in your private status page.",
      inTransit: "Your return is recorded as in transit.",
      received: "The return has been received.",
      inspected: "The return inspection is complete.",
      refunded: "The approved refund has been recorded.",
      closed: "The return request is closed.",
    },
    input,
  );
}
