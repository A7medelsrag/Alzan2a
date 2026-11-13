export const EGYPTIAN_GOVERNORATES = [
  "القاهرة",
  "الجيزة",
  "الإسكندرية",
  "الدقهلية",
  "البحر الأحمر",
  "البحيرة",
  "الفيوم",
  "الغربية",
  "الإسماعيلية",
  "المنوفية",
  "المنيا",
  "القليوبية",
  "الوادي الجديد",
  "السويس",
  "أسوان",
  "أسيوط",
  "بني سويف",
  "بورسعيد",
  "دمياط",
  "الشرقية",
  "جنوب سيناء",
  "كفر الشيخ",
  "مطروح",
  "الأقصر",
  "قنا",
  "شمال سيناء",
  "سوهاج",
] as const;

export type EgyptianGovernorate = (typeof EGYPTIAN_GOVERNORATES)[number];

export function isEgyptianGovernorate(value: string): value is EgyptianGovernorate {
  return (EGYPTIAN_GOVERNORATES as readonly string[]).includes(value.trim());
}

export function calculateShippingFeeCents(governorate: string): number {
  const normalized = governorate.trim();
  switch (normalized) {
    case "القاهرة":
    case "الجيزة":
    case "Cairo":
    case "Giza":
      return 4000; // 40 EGP
    case "الإسكندرية":
    case "Alexandria":
    case "الدقهلية":
    case "الغربية":
    case "المنوفية":
    case "القليوبية":
    case "كفر الشيخ":
    case "دمياط":
    case "الشرقية":
    case "البحيرة":
      return 5000; // 50 EGP
    case "السويس":
    case "بورسعيد":
    case "الإسماعيلية":
    case "Suez":
    case "Port Said":
    case "Ismailia":
      return 5500; // 55 EGP
    case "بني سويف":
    case "الفيوم":
    case "المنيا":
    case "أسيوط":
    case "سوهاج":
    case "قنا":
    case "الأقصر":
    case "أسوان":
      return 6500; // 65 EGP
    case "البحر الأحمر":
    case "الوادي الجديد":
    case "مطروح":
    case "شمال سيناء":
    case "جنوب سيناء":
    case "Red Sea":
    case "Matrouh":
    case "North Sinai":
    case "South Sinai":
    case "New Valley":
      return 8000; // 80 EGP
    default:
      return 5000; // 50 EGP fallback
  }
}
