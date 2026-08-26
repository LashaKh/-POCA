import {
  renderLocalizedQuoteEmail,
  type QuoteNotificationInput,
} from "./types";

export function renderGeorgianQuoteEmail(input: QuoteNotificationInput) {
  return renderLocalizedQuoteEmail(
    {
      subject: "ÉPOCA-ს მიწოდების შეთავაზება",
      reference: "შეთავაზების ნომერი",
      submitted: "მიწოდების შეთავაზების მოთხოვნა მივიღეთ.",
      information: "მარშრუტის დასათვლელად დამატებითი ინფორმაცია გვჭირდება.",
      ready: "მიწოდების შეთავაზება მზადაა პირად გვერდზე სანახავად.",
      accepted:
        "თქვენი თანხმობა დაფიქსირდა. თანხის ჩამოჭრამდე შემდეგ ნაბიჯს დაგიდასტურებთ.",
      declined: "შეთავაზება უარყოფილია და თანხა არ ჩამოგეჭრათ.",
    },
    input,
  );
}
