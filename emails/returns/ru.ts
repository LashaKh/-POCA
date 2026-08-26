import {
  renderLocalizedReturnEmail,
  type ReturnNotificationInput,
} from "./types";

export function renderRussianReturnEmail(input: ReturnNotificationInput) {
  return renderLocalizedReturnEmail(
    {
      subject: "Возврат ÉPOCA",
      reference: "Номер возврата",
      order: "Номер заказа",
      submitted: "Мы получили ваш запрос.",
      information: "Для продолжения проверки нужна дополнительная информация.",
      approved: "Ваш запрос одобрен.",
      rejected:
        "Запрос не одобрен; причина указана на закрытой странице статуса.",
      inTransit: "Возврат отмечен как находящийся в пути.",
      received: "Возврат получен.",
      inspected: "Проверка возврата завершена.",
      refunded: "Одобренный возврат средств зарегистрирован.",
      closed: "Запрос на возврат закрыт.",
    },
    input,
  );
}
