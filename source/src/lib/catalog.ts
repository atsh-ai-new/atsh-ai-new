export type PackageId = string;
export type IdentityId = "provided" | "logo" | "brand";
export type ContentId = "provided" | "writing";
export type AddonId = "seo" | "booking" | "contact" | "analytics";
export type DomainId = "com" | "eg" | "none";

export type PriceItem = {
  id: string;
  label: string;
  amount: number;
  period?: "شهري" | "سنوي";
};

export const VAT_RATE = 0.14;
export const CURRENCY = "ج.م";

export const packages: Array<{
  id: PackageId;
  name: string;
  short: string;
  description: string;
  price: number | null;
  includedPages: number | null;
  features: string[];
  recommended?: boolean;
}> = [
  { id: "landing", name: "موقع صفحة واحدة", short: "صفحة هبوط", description: "واجهة واضحة تركز على خدمة أو حملة واحدة.", price: 1000, includedPages: 1, features: ["صفحة واحدة", "3 أفكار تصميم", "5 اتجاهات لونية"] },
  { id: "multi", name: "موقع متعدد الصفحات", short: "موقع تعريفي", description: "موقع أعمال متكامل حتى خمس صفحات أساسية.", price: 2500, includedPages: 5, features: ["حتى 5 صفحات", "3 أفكار تصميم", "5 اتجاهات لونية"] },
  { id: "dynamic", name: "موقع بإدارة محتوى", short: "موقع ديناميكي", description: "موقع قابل للتحديث مع لوحة محتوى وقاعدة بيانات.", price: 6000, includedPages: 5, features: ["حتى 5 صفحات", "إدارة المحتوى", "قابل للتوسع التجاري"], recommended: true },
  { id: "enterprise", name: "حل مخصص", short: "مؤسسي", description: "نراجع التكاملات والنطاق ونعد عرضًا مناسبًا للمشروع.", price: null, includedPages: null, features: ["تحليل متطلبات", "تكاملات خاصة", "عرض نطاق مخصص"] }
];

export const identityOptions: Array<{ id: IdentityId; name: string; description: string; price: number }> = [
  { id: "provided", name: "سأستخدم شعاري الحالي", description: "ارفع الملف أو أرسله لاحقًا.", price: 0 },
  { id: "logo", name: "تصميم شعار", description: "تطوير شعار وملفات تسليم أساسية.", price: 800 },
  { id: "brand", name: "هوية بصرية موسعة", description: "شعار وتطبيقات الهوية ودليل استخدام.", price: 3500 }
];

export const addonOptions: Array<{ id: AddonId; name: string; description: string; price: number }> = [
  { id: "seo", name: "تحسين الظهور في البحث", description: "تهيئة الصفحات والخرائط وأدوات القياس.", price: 1200 },
  { id: "booking", name: "حجز المواعيد", description: "عرض المواعيد واستقبال طلبات الحجز.", price: 1800 },
  { id: "contact", name: "نماذج تواصل وخرائط", description: "نموذج تواصل وروابط موقعك الجغرافي.", price: 500 },
  { id: "analytics", name: "تحليلات وتقارير", description: "متابعة الزيارات والتفاعل الأساسي.", price: 600 }
];

export const hostingPrice = 600;
export const maintenancePrice = 3600;
export const bilingualPrice = 900;
export const contentWritingPerPage = 250;

export function formatEgp(amount: number) {
  return `${new Intl.NumberFormat("en-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)} ${CURRENCY}`;
}

export function calculateQuote(input: {
  packageId: PackageId | null;
  identity: IdentityId;
  content: ContentId;
  addons: AddonId[];
  pages: number;
  bilingual: boolean;
  hosting: boolean;
  maintenance: boolean;
  domain: DomainId;
}, packageOverrides?: Array<{ id: string; name: string; price: number | null; description: string }>, optionOverrides?: Array<{ code: string; name: string; price: number; pricingType?: string }>, vatRate = VAT_RATE * 100, extraOptions: Array<{ id: string; name: string; price: number; pricingType: string; unitLabel: string }> = []) {
  const optionData = (code: string) => optionOverrides?.find((item) => item.code === code);
  const optionPrice = (code: string, fallback: number) => optionData(code)?.price ?? fallback;
  const optionLabel = (code: string, fallback: string) => optionData(code)?.name ?? fallback;
  const optionType = (code: string) => optionData(code)?.pricingType;
  const selectedPackage = packages.find((item) => item.id === input.packageId);
  const override = packageOverrides?.find((item) => item.id === input.packageId);
  const packageName = override?.name ?? selectedPackage?.name;
  const packagePrice = override ? override.price : selectedPackage?.price;
  const items: PriceItem[] = [];
  let needsCustomQuote = false;
  if (packagePrice !== null && packagePrice !== undefined) {
    items.push({ id: "package", label: packageName ?? "موقع", amount: packagePrice });
  } else {
    needsCustomQuote = true;
  }

  if (selectedPackage?.includedPages !== null && selectedPackage?.includedPages !== undefined && input.pages > selectedPackage.includedPages) {
    needsCustomQuote = true;
  }
  if (input.bilingual) items.push({ id: "language", label: optionLabel("language", "إضافة اللغة الإنجليزية"), amount: optionPrice("language", bilingualPrice) });

  const identity = identityOptions.find((item) => item.id === input.identity);
  if (identity && identity.price > 0) items.push({ id: "identity", label: optionLabel(identity.id, identity.name), amount: optionPrice(identity.id, identity.price) });
  if (input.content === "writing") {
    const perPage = optionType("writing") === "per_page";
    const price = optionPrice("writing", contentWritingPerPage);
    items.push({ id: "content", label: `${optionLabel("writing", "كتابة المحتوى")} (${input.pages} صفحة)`, amount: perPage ? price * input.pages : price });
  }

  for (const id of input.addons) {
    const option = addonOptions.find((item) => item.id === id);
    if (option) items.push({ id, label: optionLabel(id, option.name), amount: optionPrice(id, option.price) });
  }

  if (input.hosting) items.push({ id: "hosting", label: optionLabel("hosting", "استضافة مُدارة وحماية"), amount: optionPrice("hosting", hostingPrice), period: "سنوي" });
  if (input.domain !== "none" && !input.hosting) needsCustomQuote = true;
  if (input.domain !== "none" && input.hosting) {
    const code = `domain_${input.domain}`;
    items.push({ id: "domain", label: optionLabel(code, `نطاق .${input.domain} (السنة الأولى)`), amount: optionPrice(code, 0), period: "سنوي" });
  }
  if (input.maintenance) items.push({ id: "maintenance", label: optionLabel("maintenance", "صيانة ودعم"), amount: optionPrice("maintenance", maintenancePrice), period: "سنوي" });

  for (const option of extraOptions) {
    const amount = option.pricingType === "per_page" ? option.price * input.pages : option.price;
    const period = option.pricingType === "yearly" ? "سنوي" : option.pricingType === "monthly" ? "شهري" : undefined;
    const label = option.unitLabel ? `${option.name} · ${option.unitLabel === "صفحة" ? `${input.pages} صفحات` : option.unitLabel}` : option.name;
    items.push({ id: `extra-${option.id}`, label, amount, period });
  }

  const recurring = items.filter((item) => item.period === "سنوي").reduce((sum, item) => sum + item.amount, 0);
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const tax = subtotal * (vatRate / 100);
  return { items, subtotal, tax, total: subtotal + tax, recurring, needsCustomQuote };
}
