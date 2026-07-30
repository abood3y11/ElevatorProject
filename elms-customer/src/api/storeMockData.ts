import { sparePartImageCatalog } from "./sparePartImageCatalog";
import {
  StoreCategory,
  StoreCheckoutData,
  StoreHomeData,
  StoreOrder,
  StorePaymentMethod,
  StoreProduct,
} from "../types/models";

const categoryMeta: Record<string, Omit<StoreCategory, "itemCount">> = {
  doors: {
    id: "doors",
    name: "الأبواب",
    description: "أقفال، حساسات، بكرات، سيور، ومكونات تشغيل الباب",
    icon: "swap-horizontal",
    accentColor: "#0EA5A4",
  },
  drives: {
    id: "drives",
    name: "الدرايف والمحركات",
    description: "إنفرترات، درايفات، محركات، فرامل، وكونتاكتورات",
    icon: "flash",
    accentColor: "#2563EB",
  },
  control: {
    id: "control",
    name: "لوحات التحكم",
    description: "كروت تحكم، كروت طلبات، مبينات، ومؤقتات",
    icon: "grid",
    accentColor: "#F59E0B",
  },
  safety: {
    id: "safety",
    name: "السلامة والطوارئ",
    description: "بطاريات، براشوت، حساسات، مفاتيح، ومغناطيسات أمان",
    icon: "shield-checkmark",
    accentColor: "#DC2626",
  },
  mechanical: {
    id: "mechanical",
    name: "الميكانيكا",
    description: "حبال جر، حشوات، كراسي كبينة، وممتصات صدمات",
    icon: "construct",
    accentColor: "#7C3AED",
  },
  electrical: {
    id: "electrical",
    name: "الكهرباء والملحقات",
    description: "إنتركوم، شواحن، ريليه، موصلات، ومستلزمات تشغيل",
    icon: "hardware-chip",
    accentColor: "#0891B2",
  },
};

const categoryOrder = ["doors", "drives", "control", "safety", "mechanical", "electrical"];

function countCategory(categoryId: string) {
  return sparePartImageCatalog.filter((item) => item.categoryId === categoryId).length;
}

function categoryName(categoryId: string) {
  return categoryMeta[categoryId]?.name ?? "قطع غيار";
}

function makePrice(index: number, categoryId: string) {
  const baseByCategory: Record<string, number> = {
    doors: 420,
    drives: 1850,
    control: 760,
    safety: 520,
    mechanical: 240,
    electrical: 190,
  };
  const base = baseByCategory[categoryId] ?? 250;
  return base + ((index * 137) % 2200);
}

function brandFromName(name: string) {
  const knownBrands = [
    "GEFRAN",
    "Vega",
    "Sky",
    "Sky65x",
    "ARL300",
    "LS",
    "Decoder",
    "FUJI",
    "Schneider",
  ];
  const normalized = name.toLowerCase();
  const brand = knownBrands.find((item) => normalized.includes(item.toLowerCase()));
  return brand ?? "ELMS Spare Parts";
}

function makeProduct(item: (typeof sparePartImageCatalog)[number], index: number): StoreProduct {
  const price = makePrice(index, item.categoryId);
  const hasDiscount = index % 3 === 0;

  return {
    id: item.id,
    categoryId: item.categoryId,
    name: item.name,
    subtitle: `${categoryName(item.categoryId)} أصلية جاهزة للطلب والفحص قبل الشحن`,
    brand: brandFromName(item.name),
    sku: item.id,
    icon: item.icon,
    image: item.image,
    imageUrl: item.imageUrl,
    accentColor: item.accentColor,
    price,
    originalPrice: hasDiscount ? Math.round(price * 1.16) : undefined,
    rating: 4.4 + ((index % 6) / 10),
    reviewCount: 18 + ((index * 11) % 190),
    stockLabel: index % 5 === 0 ? "كمية محدودة" : "متوفر في مستودع الرياض",
    deliveryLabel: index % 4 === 0 ? "توصيل خلال 24 ساعة" : "توصيل خلال 48 ساعة",
    summary:
      "صورة القطعة مرفقة بوضوح لتسهيل المطابقة قبل الطلب. يمكن ربط الشراء برقم المصعد أو موقع العميل لتقليل أخطاء التوريد.",
    compatibleWith: ["Otis", "KONE", "Schindler", "Fuji", "Mitsubishi"].slice(0, 2 + (index % 3)),
    badges: [
      { id: "photo", label: "صورة حقيقية", tone: "info" },
      { id: "checked", label: "فحص قبل الشحن", tone: "accent" },
      ...(hasDiscount ? [{ id: "deal", label: "عرض خاص", tone: "warn" as const }] : []),
    ],
    specs: [
      { label: "التصنيف", value: categoryName(item.categoryId) },
      { label: "العلامة", value: brandFromName(item.name) },
      { label: "رمز القطعة", value: item.id },
      { label: "التوفر", value: index % 5 === 0 ? "كمية محدودة" : "متوفر" },
    ],
  };
}

export const mockStoreCategories: StoreCategory[] = categoryOrder.map((id) => ({
  ...categoryMeta[id],
  itemCount: countCategory(id),
}));

export const mockStoreProducts: StoreProduct[] = sparePartImageCatalog.map(makeProduct);

export const mockStorePaymentMethods: StorePaymentMethod[] = [
  {
    id: "pm-mada",
    label: "بطاقة مدى",
    subtitle: "**** 4021",
    type: "mada",
    isDefault: true,
  },
  {
    id: "pm-visa",
    label: "بطاقة Visa",
    subtitle: "**** 8890",
    type: "visa",
    isDefault: false,
  },
  {
    id: "pm-apple-pay",
    label: "Apple Pay",
    subtitle: "دفع سريع مع التوثيق",
    type: "apple_pay",
    isDefault: false,
  },
  {
    id: "pm-invoice",
    label: "فاتورة إلى الشركة",
    subtitle: "اعتماد مالي خلال 24 ساعة",
    type: "invoice",
    isDefault: false,
  },
];

const orderProducts = [mockStoreProducts[0], mockStoreProducts[8], mockStoreProducts[24]].filter(Boolean);

export const mockStoreOrder: StoreOrder = {
  id: "order-2048",
  number: "ELMS-SP-2048",
  status: "in_transit",
  paymentStatus: "paid",
  placedAt: "2026-04-05T10:30:00Z",
  etaDate: "2026-04-10T09:00:00Z",
  deliveryWindow: "09:00 ص - 12:00 م",
  addressLabel: "موقع البرج A",
  addressDetails: "الرياض، حي العليا، استلام بواسطة مشرف الصيانة",
  courierName: "ELMS Logistics",
  trackingCode: "TRK-883-2048",
  progress: 74,
  items: orderProducts.map((product, index) => ({
    productId: product.id,
    productName: product.name,
    productSubtitle: product.subtitle,
    icon: product.icon,
    image: product.image,
    imageUrl: product.imageUrl,
    accentColor: product.accentColor,
    quantity: index + 1,
    unitPrice: product.price,
  })),
  subtotal: orderProducts.reduce((sum, product, index) => sum + product.price * (index + 1), 0),
  shipping: 110,
  tax: 0,
  total: 0,
  steps: [
    {
      id: "step-1",
      label: "تم إنشاء الطلب",
      description: "جرى اعتماد الطلب وإرسال نسخة الفاتورة إلى بريد العميل.",
      timestamp: "2026-04-05T10:35:00Z",
      state: "completed",
    },
    {
      id: "step-2",
      label: "تجهيز القطع",
      description: "تم فحص الصور والقطع واعتمادها من مستودع الرياض.",
      timestamp: "2026-04-06T08:20:00Z",
      state: "completed",
    },
    {
      id: "step-3",
      label: "في الطريق إلى الموقع",
      description: "الشحنة خرجت مع مندوب ELMS وسيتم التواصل قبل الوصول.",
      timestamp: "2026-04-09T06:45:00Z",
      state: "current",
    },
    {
      id: "step-4",
      label: "تسليم الموقع",
      description: "انتظار تأكيد الاستلام من فريق المبنى.",
      timestamp: "2026-04-10T09:00:00Z",
      state: "upcoming",
    },
  ],
};

mockStoreOrder.tax = Math.round((mockStoreOrder.subtotal + mockStoreOrder.shipping) * 0.15);
mockStoreOrder.total = mockStoreOrder.subtotal + mockStoreOrder.shipping + mockStoreOrder.tax;

export const mockStoreHomeData: StoreHomeData = {
  categories: mockStoreCategories,
  featuredProducts: mockStoreProducts,
  quickReorderProducts: [mockStoreProducts[0], mockStoreProducts[12], mockStoreProducts[36], mockStoreProducts[72]].filter(Boolean),
  activeOrder: mockStoreOrder,
};

export function getMockStoreProductById(productId: string): StoreProduct {
  return mockStoreProducts.find((product) => product.id === productId) ?? mockStoreProducts[0];
}

export function getMockStoreCheckout(productId: string): StoreCheckoutData {
  const product = getMockStoreProductById(productId);
  const subtotal = product.price;
  const shipping = product.price >= 3000 ? 0 : 49;
  const tax = Math.round((subtotal + shipping) * 0.15);

  return {
    product,
    quantity: 1,
    address: {
      id: "addr-01",
      title: "عنوان التشغيل الرئيسي",
      receiverName: "إبراهيم القحطاني",
      phone: "050 999 2211",
      line1: "برج الأبراج المتقدمة، شارع العليا العام",
      area: "الرياض - العليا",
      estimatedWindow: "غدا 09:00 ص - 12:00 م",
    },
    paymentMethods: mockStorePaymentMethods,
    subtotal,
    shipping,
    tax,
    total: subtotal + shipping + tax,
    note: "يمكن إصدار فاتورة ضريبية وربط الطلب مع رقم المصعد أو رقم البلاغ.",
    trackingOrderId: mockStoreOrder.id,
  };
}
