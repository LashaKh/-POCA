import {
  renderLocalizedReturnEmail,
  type ReturnNotificationInput,
} from "./types";

export function renderGermanReturnEmail(input: ReturnNotificationInput) {
  return renderLocalizedReturnEmail(
    {
      subject: "ÉPOCA Rückgabe",
      reference: "Rückgabereferenz",
      order: "Bestellreferenz",
      submitted: "Wir haben Ihren Antrag erhalten.",
      information:
        "Für die weitere Prüfung benötigen wir zusätzliche Informationen.",
      approved: "Ihr Antrag wurde genehmigt.",
      rejected:
        "Ihr Antrag wurde nicht genehmigt; den Grund finden Sie auf der privaten Statusseite.",
      inTransit: "Ihre Rückgabe ist als unterwegs erfasst.",
      received: "Die Rückgabe ist eingegangen.",
      inspected: "Die Prüfung der Rückgabe ist abgeschlossen.",
      refunded: "Die genehmigte Erstattung wurde erfasst.",
      closed: "Der Rückgabeantrag ist geschlossen.",
    },
    input,
  );
}
