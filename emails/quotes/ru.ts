import {
  renderLocalizedQuoteEmail,
  type QuoteNotificationInput,
} from "./types";

export function renderRussianQuoteEmail(input: QuoteNotificationInput) {
  return renderLocalizedQuoteEmail(
    {
      subject: "Расчёт доставки ÉPOCA",
      reference: "Номер расчёта",
      submitted: "Мы получили запрос на расчёт доставки.",
      information: "Для расчёта этого маршрута нужны дополнительные сведения.",
      ready: "Расчёт доставки готов для просмотра на закрытой странице.",
      accepted:
        "Ваше согласие сохранено. До списания средств мы подтвердим следующий шаг.",
      declined: "Расчёт отклонён, списания средств не было.",
    },
    input,
  );
}
