import {
  renderLocalizedReturnEmail,
  type ReturnNotificationInput,
} from "./types";

export function renderGeorgianReturnEmail(input: ReturnNotificationInput) {
  return renderLocalizedReturnEmail(
    {
      subject: "ÉPOCA დაბრუნება",
      reference: "დაბრუნების ნომერი",
      order: "შეკვეთის ნომერი",
      submitted: "თქვენი მოთხოვნა მივიღეთ.",
      information: "განხილვის გასაგრძელებლად დამატებითი ინფორმაცია გვჭირდება.",
      approved: "თქვენი მოთხოვნა დამტკიცებულია.",
      rejected:
        "მოთხოვნა არ დამტკიცდა; მიზეზი იხილეთ დახურულ სტატუსის გვერდზე.",
      inTransit: "დაბრუნება მონიშნულია როგორც გზაში მყოფი.",
      received: "დაბრუნება მიღებულია.",
      inspected: "დაბრუნების შემოწმება დასრულებულია.",
      refunded: "დამტკიცებული თანხის დაბრუნება ჩაწერილია.",
      closed: "დაბრუნების მოთხოვნა დახურულია.",
    },
    input,
  );
}
