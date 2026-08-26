import type { AppLocale } from "@/i18n/routing";

import type { ContentBlock } from "./schema";

type ServiceKey =
  | "about"
  | "faq"
  | "delivery"
  | "returns"
  | "privacy"
  | "cookie"
  | "terms";

const copy: Record<
  AppLocale,
  Record<ServiceKey, { title: string; summary: string; paragraphs: string[] }>
> = {
  en: {
    about: {
      title: "About ÉPOCA",
      summary: "A considered online collection of rugs, operated from Georgia.",
      paragraphs: [
        "ÉPOCA presents rugs through verified product records, careful imagery and practical buying information.",
        "The online shop is based in Georgia and is designed to serve local and international buyers. Product facts, stock and delivery eligibility are checked before an order is accepted.",
      ],
    },
    faq: {
      title: "Frequently asked questions",
      summary: "Clear answers about products, ordering and support.",
      paragraphs: [
        "Every published product page shows the currently verified dimensions, materials, condition, price and availability.",
        "Checkout is available where a configured delivery route exists. For unsupported or unusual destinations, request a manual quote without committing to a charge.",
        "Use the contact form for product, delivery or order questions. It provides a private reference for follow-up.",
      ],
    },
    delivery: {
      title: "Delivery",
      summary:
        "Georgia first, with configured worldwide delivery and manual quotes where needed.",
      paragraphs: [
        "Available methods, prices and estimates are calculated from the delivery address and current cart. An estimate is not a guaranteed arrival date.",
        "International duties, import taxes and customs handling depend on the destination and selected service. The checkout shows the current configured responsibility; ask for confirmation if it is marked as pending legal review.",
      ],
    },
    returns: {
      title: "Returns and cancellations",
      summary:
        "Requests are assessed against the policy version captured with the order.",
      paragraphs: [
        "Eligible buyers can open a cancellation or return request from the private order or account journey. The system records a reference, evidence and the staff decision timeline.",
        "Do not send a rug back until ÉPOCA provides return instructions. Eligibility, deadlines, return transport and refund handling depend on the approved policy and the order facts.",
      ],
    },
    privacy: {
      title: "Privacy notice",
      summary: "How ÉPOCA handles information needed to operate the shop.",
      paragraphs: [
        "ÉPOCA processes contact, delivery, order and payment-status information to provide requested services, prevent abuse and meet operational or legal duties.",
        "Optional preferences, analytics and newsletter choices are recorded separately and can be refused or withdrawn. Essential security, cart and checkout functions do not depend on optional consent.",
        "Use the account privacy controls or contact form to request access, correction, export or deletion review. Some restricted transaction evidence may need to be retained for an approved legal period.",
      ],
    },
    cookie: {
      title: "Cookie notice",
      summary: "Essential browser storage is separate from optional choices.",
      paragraphs: [
        "Essential cookies protect sessions, remember the cart and keep private order or support references accessible in the same browser.",
        "Preference and analytics storage is optional. You can refuse or withdraw it in Privacy choices without losing access to shopping or support.",
      ],
    },
    terms: {
      title: "Terms of service",
      summary: "Operational terms for using the ÉPOCA shop.",
      paragraphs: [
        "Product availability, pricing and delivery eligibility are confirmed by the authoritative checkout before an order is accepted. A cart or quote does not reserve a product unless the checkout states that a reservation is active.",
        "Bank-transfer orders remain pending until funds are reconciled. Hosted payments are enabled only when the configured provider is production-ready.",
        "Applicable cancellation, return, customs and privacy terms are the approved versions captured for the transaction.",
      ],
    },
  },
  ka: {
    about: {
      title: "ÉPOCA-ს შესახებ",
      summary:
        "საქართველოდან მართული, გააზრებულად შერჩეული ხალიჩების ონლაინ კოლექცია.",
      paragraphs: [
        "ÉPOCA ხალიჩებს წარმოადგენს გადამოწმებული პროდუქტის ჩანაწერებით, ზუსტი ფოტოებითა და პრაქტიკული შესყიდვის ინფორმაციით.",
        "ონლაინ მაღაზია დაფუძნებულია საქართველოში და ემსახურება ადგილობრივ და საერთაშორისო მყიდველებს. შეკვეთის მიღებამდე მოწმდება პროდუქტის მონაცემები, მარაგი და მიწოდების შესაძლებლობა.",
      ],
    },
    faq: {
      title: "ხშირად დასმული კითხვები",
      summary: "პასუხები პროდუქტებზე, შეკვეთასა და მხარდაჭერაზე.",
      paragraphs: [
        "ყველა გამოქვეყნებულ გვერდზე ნაჩვენებია მიმდინარე გადამოწმებული ზომები, მასალა, მდგომარეობა, ფასი და ხელმისაწვდომობა.",
        "შეკვეთა შესაძლებელია იქ, სადაც მიწოდების მარშრუტი კონფიგურირებულია. სხვა ან რთული მისამართისთვის მოითხოვეთ ინდივიდუალური შეთავაზება თანხის გადახდის ვალდებულების გარეშე.",
        "პროდუქტის, მიწოდების ან შეკვეთის საკითხებზე გამოიყენეთ პირადი საკონტაქტო ფორმა.",
      ],
    },
    delivery: {
      title: "მიწოდება",
      summary:
        "საქართველო პირველ ეტაპზე, კონფიგურირებული მსოფლიო მიწოდებითა და ინდივიდუალური შეთავაზებით.",
      paragraphs: [
        "მეთოდი, ფასი და ვადა გამოითვლება მისამართისა და კალათის მიხედვით. მითითებული ვადა გარანტირებული ჩამოსვლის თარიღი არ არის.",
        "საერთაშორისო საბაჟო გადასახადები და იმპორტის წესები დამოკიდებულია ქვეყანასა და სერვისზე. თუ პასუხისმგებლობა იურიდიული შემოწმების მოლოდინშია, წინასწარ მოითხოვეთ დადასტურება.",
      ],
    },
    returns: {
      title: "დაბრუნება და გაუქმება",
      summary: "მოთხოვნა ფასდება შეკვეთასთან შენახული პოლიტიკის ვერსიით.",
      paragraphs: [
        "უფლებამოსილ მყიდველს შეუძლია პირადი შეკვეთიდან გახსნას გაუქმების ან დაბრუნების მოთხოვნა და მიიღოს თვალთვალის ნომერი.",
        "ხალიჩა არ გამოაგზავნოთ ÉPOCA-ს ინსტრუქციის მიღებამდე. ვადა, ტრანსპორტირება და თანხის დაბრუნება დამოკიდებულია დამტკიცებულ წესსა და შეკვეთის ფაქტებზე.",
      ],
    },
    privacy: {
      title: "კონფიდენციალურობა",
      summary: "როგორ ვიყენებთ მაღაზიის მუშაობისთვის საჭირო ინფორმაციას.",
      paragraphs: [
        "ÉPOCA ამუშავებს საკონტაქტო, მიწოდების, შეკვეთისა და გადახდის სტატუსის მონაცემებს მოთხოვნილი სერვისის, უსაფრთხოებისა და კანონით საჭირო ოპერირებისთვის.",
        "არჩევითი პარამეტრები, ანალიტიკა და გამოწერა ცალ-ცალკე იწერება და მათი უარყოფა ან გაუქმება შესაძლებელია.",
        "წვდომის, შესწორების, ექსპორტის ან წაშლის განხილვისთვის გამოიყენეთ ანგარიშის კონტროლი ან საკონტაქტო ფორმა.",
      ],
    },
    cookie: {
      title: "Cookie-ფაილები",
      summary:
        "აუცილებელი ბრაუზერის შენახვა განცალკევებულია არჩევითი პარამეტრებისგან.",
      paragraphs: [
        "აუცილებელი cookie-ფაილები იცავს სესიას, კალათას და ამავე ბრაუზერში პირად შეკვეთის ან მხარდაჭერის ნომრებს.",
        "პარამეტრები და ანალიტიკა არჩევითია და მათი უარყოფა შესაძლებელია მაღაზიის ფუნქციის დაკარგვის გარეშე.",
      ],
    },
    terms: {
      title: "მომსახურების პირობები",
      summary: "ÉPOCA-ს ონლაინ მაღაზიის საოპერაციო პირობები.",
      paragraphs: [
        "პროდუქტის მარაგს, ფასსა და მიწოდებას შეკვეთის მიღებამდე საბოლოოდ ამოწმებს კალკულაცია. კალათა ან შეთავაზება პროდუქტს არ ჯავშნის, თუ აქტიური რეზერვაცია პირდაპირ არ არის მითითებული.",
        "საბანკო გადარიცხვის შეკვეთა თანხის დადასტურებამდე მოლოდინშია. ონლაინ გადახდა ჩაირთვება მხოლოდ მზადყოფნაში მყოფ პროვაიდერზე.",
        "ოპერაციაზე ვრცელდება შეკვეთასთან შენახული დამტკიცებული პირობების ვერსია.",
      ],
    },
  },
  de: {
    about: {
      title: "Über ÉPOCA",
      summary:
        "Eine sorgfältig kuratierte Online-Teppichkollektion aus Georgien.",
      paragraphs: [
        "ÉPOCA präsentiert Teppiche mit geprüften Produktdaten, sorgfältigen Bildern und praktischen Kaufinformationen.",
        "Der Shop wird aus Georgien betrieben und richtet sich an lokale und internationale Käufer. Produktdaten, Bestand und Lieferfähigkeit werden vor Annahme einer Bestellung geprüft.",
      ],
    },
    faq: {
      title: "Häufige Fragen",
      summary: "Antworten zu Produkten, Bestellungen und Support.",
      paragraphs: [
        "Jede veröffentlichte Produktseite zeigt die aktuell geprüften Maße, Materialien, den Zustand, Preis und Bestand.",
        "Die Kasse steht für konfigurierte Lieferwege bereit. Für ungewöhnliche Ziele kann unverbindlich ein manuelles Angebot angefordert werden.",
        "Für Produkt-, Liefer- oder Bestellfragen steht das private Kontaktformular mit Referenznummer bereit.",
      ],
    },
    delivery: {
      title: "Lieferung",
      summary:
        "Georgien zuerst, weltweite konfigurierte Lieferung und manuelle Angebote bei Bedarf.",
      paragraphs: [
        "Methoden, Preise und Schätzungen werden anhand der Adresse und des Warenkorbs berechnet. Eine Schätzung ist kein garantiertes Ankunftsdatum.",
        "Einfuhrabgaben und Zollabwicklung hängen vom Zielland und Dienst ab. Ist die Verantwortung als rechtlich ungeprüft markiert, bitten Sie vorab um Bestätigung.",
      ],
    },
    returns: {
      title: "Rückgabe und Stornierung",
      summary:
        "Anträge werden nach der mit der Bestellung gespeicherten Richtlinie geprüft.",
      paragraphs: [
        "Berechtigte Käufer können im privaten Bestell- oder Kontobereich einen Antrag mit Referenz und Verlauf eröffnen.",
        "Senden Sie keinen Teppich zurück, bevor ÉPOCA Anweisungen erteilt. Fristen, Transport und Erstattung richten sich nach freigegebener Richtlinie und Bestelldaten.",
      ],
    },
    privacy: {
      title: "Datenschutzhinweis",
      summary: "Umgang mit den für den Shopbetrieb nötigen Informationen.",
      paragraphs: [
        "ÉPOCA verarbeitet Kontakt-, Liefer-, Bestell- und Zahlungsstatusdaten für angeforderte Dienste, Sicherheit und rechtliche Pflichten.",
        "Optionale Einstellungen, Analysen und Newsletter werden getrennt erfasst und können abgelehnt oder widerrufen werden.",
        "Anfragen zu Auskunft, Berichtigung, Export oder Löschung können im Konto oder per Kontaktformular gestellt werden.",
      ],
    },
    cookie: {
      title: "Cookie-Hinweis",
      summary:
        "Notwendige Speicherung ist von optionalen Entscheidungen getrennt.",
      paragraphs: [
        "Notwendige Cookies schützen Sitzungen, Warenkorb und private Bestell- oder Supportreferenzen in diesem Browser.",
        "Einstellungen und Analysen sind optional und lassen sich ohne Verlust der Shopfunktionen ablehnen.",
      ],
    },
    terms: {
      title: "Nutzungsbedingungen",
      summary: "Betriebliche Bedingungen für den ÉPOCA-Shop.",
      paragraphs: [
        "Bestand, Preis und Lieferfähigkeit werden vor Annahme durch die verbindliche Kasse bestätigt. Warenkorb oder Angebot reservieren nichts, sofern keine aktive Reservierung angezeigt wird.",
        "Überweisungsbestellungen bleiben bis zum Zahlungsabgleich offen. Online-Zahlungen werden nur mit produktionsbereitem Anbieter aktiviert.",
        "Es gelten die mit der Transaktion gespeicherten freigegebenen Bedingungen.",
      ],
    },
  },
  ru: {
    about: {
      title: "Об ÉPOCA",
      summary: "Тщательно собранная онлайн-коллекция ковров из Грузии.",
      paragraphs: [
        "ÉPOCA представляет ковры с проверенными карточками, аккуратными изображениями и практической информацией для покупки.",
        "Магазин работает из Грузии для местных и международных покупателей. До приёма заказа проверяются данные товара, запас и возможность доставки.",
      ],
    },
    faq: {
      title: "Частые вопросы",
      summary: "Ответы о товарах, заказах и поддержке.",
      paragraphs: [
        "На каждой опубликованной странице указаны актуальные проверенные размеры, материалы, состояние, цена и наличие.",
        "Оформление доступно для настроенных маршрутов. Для необычного адреса можно запросить индивидуальное предложение без обязательства оплаты.",
        "Вопросы о товаре, доставке или заказе отправляйте через закрытую форму с номером обращения.",
      ],
    },
    delivery: {
      title: "Доставка",
      summary:
        "Сначала Грузия, настроенная доставка по миру и индивидуальные расчёты.",
      paragraphs: [
        "Способ, цена и срок рассчитываются по адресу и корзине. Оценка срока не является гарантированной датой прибытия.",
        "Пошлины и таможенное оформление зависят от страны и службы. Если ответственность ожидает юридической проверки, запросите подтверждение.",
      ],
    },
    returns: {
      title: "Возвраты и отмены",
      summary: "Запрос оценивается по версии правил, сохранённой с заказом.",
      paragraphs: [
        "Покупатель может открыть подходящий запрос в закрытой странице заказа или аккаунта и получить номер и историю решений.",
        "Не отправляйте ковёр до получения инструкций ÉPOCA. Сроки, перевозка и возврат денег зависят от утверждённых правил и данных заказа.",
      ],
    },
    privacy: {
      title: "Конфиденциальность",
      summary: "Как ÉPOCA обрабатывает сведения для работы магазина.",
      paragraphs: [
        "ÉPOCA использует контактные, доставочные, заказные и платёжные статусы для запрошенных услуг, защиты и правовых обязанностей.",
        "Необязательные настройки, аналитика и рассылка учитываются отдельно; их можно отклонить или отозвать.",
        "Запросы на доступ, исправление, экспорт или удаление подаются в аккаунте или форме связи.",
      ],
    },
    cookie: {
      title: "Cookie-файлы",
      summary: "Необходимое хранение отделено от необязательного выбора.",
      paragraphs: [
        "Необходимые cookie защищают сессию, корзину и закрытые номера заказов или поддержки в этом браузере.",
        "Настройки и аналитика необязательны и отключаются без потери доступа к магазину.",
      ],
    },
    terms: {
      title: "Условия использования",
      summary: "Рабочие условия онлайн-магазина ÉPOCA.",
      paragraphs: [
        "Наличие, цена и доставка окончательно подтверждаются оформлением до принятия заказа. Корзина или предложение не резервируют товар без явного статуса активного резерва.",
        "Заказ с банковским переводом ожидает сверки средств. Онлайн-оплата включается только у готового к работе провайдера.",
        "К операции применяются утверждённые версии условий, сохранённые с заказом.",
      ],
    },
  },
};

export function getFallbackServiceContent(key: ServiceKey, locale: AppLocale) {
  const value = copy[locale][key];
  const blocks: ContentBlock[] = value.paragraphs.map((text) => ({
    type: "paragraph",
    text,
  }));
  return { ...value, blocks };
}

export async function getContentLabels(locale: AppLocale) {
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return messages.content as Record<string, string>;
}
