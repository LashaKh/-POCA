import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

import { getFallbackServiceContent } from "../../features/content/service-copy.ts";

const supabaseBinary = fileURLToPath(
  new URL("../../node_modules/.bin/supabase", import.meta.url),
);
const statusOutput = execFileSync(supabaseBinary, ["status", "-o", "env"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"],
});
const localValues = Object.fromEntries(
  statusOutput
    .split("\n")
    .filter((line) => line.includes("="))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), JSON.parse(line.slice(separator + 1))];
    }),
);

const apiUrl = localValues.API_URL;
const serviceRoleKey = localValues.SERVICE_ROLE_KEY;
if (!apiUrl || !serviceRoleKey) {
  throw new Error("Start local Supabase before loading ÉPOCA page copy.");
}
const hostname = new URL(apiUrl).hostname;
if (hostname !== "127.0.0.1" && hostname !== "localhost") {
  throw new Error(
    "The local content loader refuses to write to a hosted project.",
  );
}

const client = createClient(apiUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const locales = ["ka", "en", "de", "ru"];
const publishedAt = "2026-08-26T00:00:00.000Z";
const entryIds = {
  homepage: "00000000-0000-4000-8000-000000000800",
  about: "00000000-0000-4000-8000-000000000801",
  faq: "00000000-0000-4000-8000-000000000802",
  delivery: "00000000-0000-4000-8000-000000000803",
  returns: "00000000-0000-4000-8000-000000000804",
  privacy: "00000000-0000-4000-8000-000000000805",
  cookie: "00000000-0000-4000-8000-000000000806",
  terms: "00000000-0000-4000-8000-000000000807",
};

const homepageCopy = {
  en: {
    title: "Carpets worth looking at twice.",
    summary:
      "ÉPOCA presents distinctive carpets as clear, comparable records—so the object can lead and the facts can support the decision.",
    blocks: [
      { type: "heading", level: 2, text: "A collection you can read" },
      {
        type: "paragraph",
        text: "Each carpet is treated as an individual record. We publish reviewed dimensions, materials, condition, price and availability alongside photographs chosen to show colour, texture and scale as clearly as possible.",
      },
      { type: "heading", level: 2, text: "How the index works" },
      {
        type: "list",
        style: "numbered",
        items: [
          "Narrow the collection by colour, material, dimensions or price.",
          "Read the verified product record and compare the full image set.",
          "Confirm the available delivery route and return terms before payment.",
        ],
      },
      {
        type: "heading",
        level: 2,
        text: "From Georgia, with practical worldwide delivery",
      },
      {
        type: "paragraph",
        text: "Enter a delivery address to see the currently configured route and estimate. If a destination needs individual handling, request a manual quote before payment. Estimates and customs responsibilities remain explicit rather than assumed.",
      },
      {
        type: "callout",
        tone: "info",
        title: "Local preview",
        text: "The current photographs are licensed interface samples and the product records are demonstration data. They are not ÉPOCA inventory or offers for sale. Replace them in Administration before launch.",
      },
    ],
  },
  ka: {
    title: "ხალიჩები, რომელთა მეორედ ნახვაც ღირს.",
    summary:
      "ÉPOCA გამორჩეულ ხალიჩებს მკაფიო, შესადარებელი ჩანაწერების სახით წარმოგიდგენთ — მთავარი ნივთია, ფაქტები კი გადაწყვეტილებას ამყარებს.",
    blocks: [
      {
        type: "heading",
        level: 2,
        text: "კოლექცია, რომლის წაკითხვაც შეიძლება",
      },
      {
        type: "paragraph",
        text: "თითოეულ ხალიჩას ცალკე ჩანაწერად ვუდგებით. ვაქვეყნებთ გადამოწმებულ ზომებს, მასალას, მდგომარეობას, ფასსა და ხელმისაწვდომობას, ფოტოებთან ერთად, რომლებიც ფერს, ტექსტურასა და მასშტაბს მაქსიმალურად ნათლად აჩვენებს.",
      },
      { type: "heading", level: 2, text: "როგორ მუშაობს ინდექსი" },
      {
        type: "list",
        style: "numbered",
        items: [
          "შეამცირეთ არჩევანი ფერის, მასალის, ზომის ან ფასის მიხედვით.",
          "წაიკითხეთ გადამოწმებული ჩანაწერი და შეადარეთ ფოტოები.",
          "გადახდამდე დაადასტურეთ მიწოდების მარშრუტი და დაბრუნების პირობები.",
        ],
      },
      {
        type: "heading",
        level: 2,
        text: "საქართველოდან — პრაქტიკული მსოფლიო მიწოდებით",
      },
      {
        type: "paragraph",
        text: "მიუთითეთ მისამართი და იხილეთ მოქმედი მარშრუტი და სავარაუდო ღირებულება. თუ დანიშნულება ინდივიდუალურ დამუშავებას მოითხოვს, გადახდამდე მოითხოვეთ შეთავაზება. ვადები და საბაჟო პასუხისმგებლობა ყოველთვის მკაფიოდ არის მითითებული.",
      },
      {
        type: "callout",
        tone: "info",
        title: "ლოკალური პრევიუ",
        text: "მიმდინარე ფოტოები ლიცენზირებული ინტერფეისის ნიმუშებია, პროდუქტის ჩანაწერები კი — სადემონსტრაციო მონაცემები. ისინი ÉPOCA-ს მარაგი ან გასაყიდი შეთავაზება არ არის. გაშვებამდე ჩაანაცვლეთ ადმინისტრაციიდან.",
      },
    ],
  },
  de: {
    title: "Teppiche, die einen zweiten Blick verdienen.",
    summary:
      "ÉPOCA zeigt besondere Teppiche als klare, vergleichbare Datensätze—damit das Objekt führt und die Fakten die Entscheidung tragen.",
    blocks: [
      { type: "heading", level: 2, text: "Eine Kollektion zum Lesen" },
      {
        type: "paragraph",
        text: "Jeder Teppich wird als eigener Datensatz behandelt. Wir veröffentlichen geprüfte Maße, Materialien, Zustand, Preis und Verfügbarkeit zusammen mit Bildern, die Farbe, Textur und Maßstab möglichst deutlich zeigen.",
      },
      { type: "heading", level: 2, text: "So funktioniert der Index" },
      {
        type: "list",
        style: "numbered",
        items: [
          "Grenzen Sie die Auswahl nach Farbe, Material, Maßen oder Preis ein.",
          "Lesen Sie den geprüften Produktdatensatz und vergleichen Sie alle Bilder.",
          "Bestätigen Sie Lieferweg und Rückgabebedingungen vor der Zahlung.",
        ],
      },
      {
        type: "heading",
        level: 2,
        text: "Aus Georgien, mit praktischer weltweiter Lieferung",
      },
      {
        type: "paragraph",
        text: "Geben Sie eine Lieferadresse ein, um den aktuell eingerichteten Weg und eine Schätzung zu sehen. Erfordert ein Ziel individuelle Bearbeitung, fordern Sie vor der Zahlung ein Angebot an. Schätzungen und Zollverantwortung werden ausdrücklich benannt.",
      },
      {
        type: "callout",
        tone: "info",
        title: "Lokale Vorschau",
        text: "Die aktuellen Fotos sind lizenzierte Oberflächenmuster, die Produktdatensätze sind Demodaten. Sie sind weder ÉPOCA-Bestand noch Verkaufsangebote. Ersetzen Sie sie vor dem Start in der Administration.",
      },
    ],
  },
  ru: {
    title: "Ковры, на которые стоит взглянуть дважды.",
    summary:
      "ÉPOCA показывает особенные ковры как ясные и сопоставимые записи: предмет остаётся главным, а факты помогают принять решение.",
    blocks: [
      { type: "heading", level: 2, text: "Коллекция, которую можно читать" },
      {
        type: "paragraph",
        text: "Каждый ковёр оформляется как отдельная запись. Мы публикуем проверенные размеры, материалы, состояние, цену и наличие вместе с фотографиями, которые как можно точнее показывают цвет, фактуру и масштаб.",
      },
      { type: "heading", level: 2, text: "Как работает индекс" },
      {
        type: "list",
        style: "numbered",
        items: [
          "Сузьте выбор по цвету, материалу, размеру или цене.",
          "Изучите проверенную карточку и сравните все фотографии.",
          "До оплаты подтвердите доступную доставку и условия возврата.",
        ],
      },
      {
        type: "heading",
        level: 2,
        text: "Из Грузии — с практичной доставкой по миру",
      },
      {
        type: "paragraph",
        text: "Укажите адрес, чтобы увидеть доступный маршрут и расчёт. Если направление требует индивидуальной обработки, запросите предложение до оплаты. Сроки и ответственность за таможенные платежи указываются явно.",
      },
      {
        type: "callout",
        tone: "info",
        title: "Локальный предпросмотр",
        text: "Текущие фотографии — лицензированные образцы для интерфейса, а карточки товаров — демонстрационные данные. Это не ассортимент ÉPOCA и не предложения о продаже. Замените их в разделе администрирования до запуска.",
      },
    ],
  },
};

async function assertResult(result, operation) {
  if (result.error) throw new Error(`${operation}: ${result.error.message}`);
  return result.data;
}

const contentEntries = [
  {
    id: entryIds.homepage,
    entry_key: "homepage-main",
    content_type: "homepage",
    legal_status: "not_applicable",
  },
  ...["about", "faq", "delivery", "returns", "privacy", "cookie", "terms"].map(
    (key) => ({
      id: entryIds[key],
      entry_key: key,
      content_type: key,
      legal_status: [
        "delivery",
        "returns",
        "privacy",
        "cookie",
        "terms",
      ].includes(key)
        ? "draft_unapproved"
        : "not_applicable",
    }),
  ),
].map((entry) => ({
  ...entry,
  status: "published",
  fallback_policy: "strict",
  published_at: publishedAt,
}));

await assertResult(
  await client.from("content_entries").upsert(contentEntries, {
    onConflict: "entry_key",
  }),
  "content entries",
);

const translations = [];
for (const locale of locales) {
  const home = homepageCopy[locale];
  translations.push({
    content_entry_id: entryIds.homepage,
    locale,
    slug: `homepage-main-${locale}`,
    title: home.title,
    summary: home.summary,
    blocks: home.blocks,
    meta_title: `${home.title} — ÉPOCA`,
    meta_description: home.summary,
    review_status: "approved",
  });
  for (const key of [
    "about",
    "faq",
    "delivery",
    "returns",
    "privacy",
    "cookie",
    "terms",
  ]) {
    const value = getFallbackServiceContent(key, locale);
    translations.push({
      content_entry_id: entryIds[key],
      locale,
      slug: `${key}-${locale}`,
      title: value.title,
      summary: value.summary,
      blocks: value.blocks,
      meta_title: `${value.title} — ÉPOCA`,
      meta_description: value.summary,
      review_status: "approved",
    });
  }
}
await assertResult(
  await client.from("content_translations").upsert(translations, {
    onConflict: "content_entry_id,locale",
  }),
  "content translations",
);

const menus = await assertResult(
  await client.from("content_menus").select("id,menu_key"),
  "content menus",
);
for (const menu of menus) {
  await assertResult(
    await client
      .from("content_menus")
      .update({ status: "published", published_at: publishedAt, version: 1 })
      .eq("id", menu.id),
    `${menu.menu_key} menu`,
  );
  await assertResult(
    await client.from("content_menu_items").delete().eq("menu_id", menu.id),
    `${menu.menu_key} menu cleanup`,
  );
}

const menuIds = Object.fromEntries(
  menus.map((menu) => [menu.menu_key, menu.id]),
);
const labels = {
  collection: {
    ka: "კოლექცია",
    en: "Collection",
    de: "Kollektion",
    ru: "Коллекция",
  },
  journal: { ka: "ჟურნალი", en: "Journal", de: "Journal", ru: "Журнал" },
  about: { ka: "ჩვენ შესახებ", en: "About", de: "Über ÉPOCA", ru: "Об ÉPOCA" },
  contact: { ka: "კონტაქტი", en: "Contact", de: "Kontakt", ru: "Контакты" },
  delivery: { ka: "მიწოდება", en: "Delivery", de: "Lieferung", ru: "Доставка" },
  returns: {
    ka: "დაბრუნება",
    en: "Returns and cancellations",
    de: "Rückgabe",
    ru: "Возвраты",
  },
  privacy: {
    ka: "კონფიდენციალურობა",
    en: "Privacy notice",
    de: "Datenschutz",
    ru: "Конфиденциальность",
  },
  cookie: {
    ka: "Cookie-ფაილები",
    en: "Cookie notice",
    de: "Cookie-Hinweis",
    ru: "Cookie-файлы",
  },
  terms: {
    ka: "მომსახურების პირობები",
    en: "Terms of service",
    de: "Nutzungsbedingungen",
    ru: "Условия использования",
  },
};
const headerItems = [
  ["collection", "/search"],
  ["journal", "/journal"],
  ["about", "/about"],
  ["contact", "/contact"],
];
const footerItems = [
  ["about", "/about"],
  ["delivery", "/delivery"],
  ["returns", "/returns"],
  ["privacy", "/privacy"],
  ["cookie", "/cookie"],
  ["terms", "/terms"],
  ["contact", "/contact"],
];
const menuItems = [
  ...headerItems.map((item) => ["header", ...item]),
  ...footerItems.map((item) => ["footer", ...item]),
].map(([menuKey, itemKey, destinationPath], index) => ({
  menu_id: menuIds[menuKey],
  item_key: itemKey,
  destination_path: destinationPath,
  labels_i18n: labels[itemKey],
  position: index * 10,
  enabled: true,
}));
await assertResult(
  await client.from("content_menu_items").insert(menuItems),
  "menu items",
);

console.log(
  `Loaded ${contentEntries.length} editable pages, ${translations.length} translations and ${menuItems.length} navigation items into local Supabase.`,
);
