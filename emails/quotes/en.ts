import {
  renderLocalizedQuoteEmail,
  type QuoteNotificationInput,
} from "./types";

export function renderEnglishQuoteEmail(input: QuoteNotificationInput) {
  return renderLocalizedQuoteEmail(
    {
      subject: "ÉPOCA delivery quote",
      reference: "Quote reference",
      submitted: "We received your delivery quote request.",
      information: "We need more information before we can price this route.",
      ready: "Your delivery quote is ready for private review.",
      accepted:
        "Your quote acceptance has been recorded. We will confirm the next step before any charge.",
      declined: "Your quote was declined and no charge was made.",
    },
    input,
  );
}
