import {
  renderLocalizedQuoteEmail,
  type QuoteNotificationInput,
} from "./types";

export function renderGermanQuoteEmail(input: QuoteNotificationInput) {
  return renderLocalizedQuoteEmail(
    {
      subject: "ÉPOCA Lieferangebot",
      reference: "Angebotsnummer",
      submitted: "Wir haben Ihre Anfrage für ein Lieferangebot erhalten.",
      information:
        "Wir benötigen weitere Angaben, bevor wir diese Route berechnen können.",
      ready: "Ihr Lieferangebot steht zur privaten Prüfung bereit.",
      accepted:
        "Ihre Annahme wurde erfasst. Vor einer Belastung bestätigen wir den nächsten Schritt.",
      declined: "Das Angebot wurde abgelehnt und es erfolgte keine Belastung.",
    },
    input,
  );
}
