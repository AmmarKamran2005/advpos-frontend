/**
 * Items — mobile accessories catalogue.
 *
 * Field set follows the Stock Manager the business already keeps: an item code,
 * one or more barcodes, packing (how many pieces to a packet), minimum and
 * maximum quantities for reorder alerts, and three prices — opening cost,
 * current cost, and retail.
 *
 * NOTE ON "BRAND": in the live catalogue this field records which handset the
 * accessory fits (Samsung, iPhone, China …), not who manufactured it — the
 * goods are all own-brand. Kept under the name the staff use. See plan.md §6.1.
 */

export type Product = {
  id: number;
  sku: string;
  name: string;
  description: string;
  categoryId: number;
  brandId: number;
  /** Pieces in one packet / carton. */
  packing: number;
  /** Reorder alert fires at or below this. */
  minQty: number;
  /** Flagged as overstocked above this. 0 = no ceiling. */
  maxQty: number;
  /** Cost when the item was brought onto the system. */
  openingCost: number;
  costPrice: number;
  salePrice: number;
  taxRatePercent: number;
  hideStock: boolean;
  isActive: boolean;
  /** Total across every location. */
  totalStock: number;
  status: "active" | "low" | "out" | "inactive";
  imageUrl: string | null;
  barcodes: string[];
  createdAt: string;
};

export type Category = {
  id: number;
  name: string;
  parentId: number | null;
  productCount: number;
  isActive: boolean;
};

export type Brand = {
  id: number;
  code: string;
  name: string;
  description: string;
  productCount: number;
  isActive: boolean;
};

export const categories: Category[] = [
  { id: 1,  name: "Accessories",  parentId: null, productCount: 30, isActive: true },
  { id: 2,  name: "Earbuds",      parentId: 1,    productCount: 8,  isActive: true },
  { id: 3,  name: "Handfree",     parentId: 1,    productCount: 6,  isActive: true },
  { id: 4,  name: "Speakers",     parentId: 1,    productCount: 4,  isActive: true },
  { id: 5,  name: "Power",        parentId: null, productCount: 14, isActive: true },
  { id: 6,  name: "Chargers",     parentId: 5,    productCount: 7,  isActive: true },
  { id: 7,  name: "Power Banks",  parentId: 5,    productCount: 5,  isActive: true },
  { id: 8,  name: "Batteries",    parentId: 5,    productCount: 2,  isActive: true },
  { id: 9,  name: "Cables",       parentId: null, productCount: 11, isActive: true },
  { id: 10, name: "Type-C",       parentId: 9,    productCount: 5,  isActive: true },
  { id: 11, name: "Lightning",    parentId: 9,    productCount: 3,  isActive: true },
  { id: 12, name: "Micro-USB",    parentId: 9,    productCount: 3,  isActive: true },
  { id: 13, name: "Bluetooth",    parentId: null, productCount: 6,  isActive: true },
  { id: 14, name: "LED Bulbs",    parentId: null, productCount: 4,  isActive: true },
];

/**
 * Which handset family the item is made for. The two-digit code is the same
 * one that opens the item code — 05 (China) gives 05050906.
 */
export const brands: Brand[] = [
  { id: 1, code: "01", name: "Samsung",   description: "Fits Samsung handsets",          productCount: 4,  isActive: true },
  { id: 2, code: "02", name: "Motorola",  description: "Fits Motorola handsets",         productCount: 0,  isActive: true },
  { id: 3, code: "03", name: "L.G",       description: "Fits LG handsets",               productCount: 0,  isActive: true },
  { id: 4, code: "04", name: "iPhone",    description: "Fits Apple handsets",            productCount: 4,  isActive: true },
  { id: 5, code: "05", name: "China",     description: "Fits China-set handsets",        productCount: 12, isActive: true },
  { id: 6, code: "06", name: "Universal", description: "Works with any handset",         productCount: 10, isActive: true },
];

const make = (
  id: number,
  sku: string,
  name: string,
  categoryId: number,
  brandId: number,
  costPrice: number,
  salePrice: number,
  totalStock: number,
  minQty: number,
  packing: number,
  description = ""
): Product => {
  const status: Product["status"] =
    totalStock === 0 ? "out" : totalStock <= minQty ? "low" : "active";
  return {
    id,
    sku,
    name,
    description,
    categoryId,
    brandId,
    packing,
    minQty,
    maxQty: minQty * 12,
    openingCost: Math.round(costPrice * 0.94),
    costPrice,
    salePrice,
    taxRatePercent: 18,
    hideStock: false,
    isActive: true,
    totalStock,
    status,
    imageUrl: null,
    barcodes: [`${600000000000 + id}`],
    createdAt: "2025-09-15",
  };
};

export const products: Product[] = [
  /* Earbuds */
  make(1,  "05050781", "VIZO Titan T9 Wireless Earbuds — Black",     2, 6, 580,  980,   1240, 200, 10, "TWS earbuds with ENC, 30-hour playtime"),
  make(2,  "05050776", "VIZO Titan T9 Wireless Earbuds — White",     2, 6, 580,  980,   980,  200, 10, "TWS earbuds with ENC, 30-hour playtime"),
  make(3,  "05050777", "VIZO Titan T15 Pro ANC Earbuds",             2, 6, 1480, 2480,  340,  100, 6,  "Active noise cancellation, hi-res audio"),
  make(4,  "05050779", "VIZO Titan AirPro Earbuds",                  2, 4, 720,  1280,  540,  150, 10, "Half-in-ear design, premium sound"),
  /* Handfree */
  make(5,  "05050863", "VIZO Kung Fu X2 Neckband",                   3, 6, 620,  1050,  860,  150, 12, "Neckband handfree, magnetic buds"),
  make(6,  "05050871", "VIZO Blaze Pro V65 Handfree",                3, 5, 145,  285,   1860, 300, 20, "Type-C wired handfree, premium build"),

  /* Power Banks */
  make(7,  "05050841", "VIZO PowerX 10000mAh Power Bank — Black",    7, 6, 1280, 2180,  680,  100, 8,  "10000mAh, dual output, fast charging"),
  make(8,  "05050842", "VIZO PowerX 20000mAh Power Bank — Black",    7, 6, 2280, 3680,  340,  80,  6,  "20000mAh, PD 22.5W, three outputs"),
  make(9,  "05050843", "VIZO PowerX MagSafe 5000mAh Wireless",       7, 4, 1980, 3280,  120,  50,  6,  "Magnetic wireless charging, 5000mAh"),
  /* Chargers */
  make(10, "05050893", "VIZO Hyper PD VPD45W Charger",               6, 6, 180,  340,   3240, 500, 24, "45W PD wall charger"),
  /* Batteries */
  make(11, "05050745", "VIZO 29DI Itel Battery",                     8, 5, 350,  620,   547,  120, 20, "Replacement battery, Itel handsets"),
  make(12, "05050785", "VIZO G530 Samsung Battery",                  8, 1, 260,  480,   1224, 200, 20, "Replacement battery, Samsung G530"),
  make(13, "05050774", "VIZO I10 Battery",                           8, 4, 271,  520,   -1,   100, 20, "Replacement battery — stock discrepancy, needs counting"),
  make(14, "05050751", "VIZO I251 Battery",                          8, 4, 222,  430,   368,  100, 20, "Replacement battery, iPhone 5-series"),

  /* Speakers */
  make(15, "05050810", "VIZO VSP Bluetooth Speaker Mini — Red",      4, 6, 380,  680,   840,  150, 12, "Portable Bluetooth speaker, 5W"),
  make(16, "05050811", "VIZO VSP Bluetooth Speaker Mini — Blue",     4, 6, 380,  680,   720,  150, 12, "Portable Bluetooth speaker, 5W"),
  make(17, "05050812", "VIZO VSP Pro X1 Soundbar 30W",               4, 6, 2480, 4280,  148,  40,  4,  "30W soundbar with subwoofer"),
  make(18, "05050813", "VIZO VSP Cube Y Yellow Mini Speaker",        4, 6, 480,  880,   24,   80,  12, "Compact cube design, 8W output"),

  /* Cables */
  make(19, "05050885", "VIZO Linko VC101 Type-C Cable",              10, 5, 95,  195,   1840, 400, 24, "Braided Type-C cable, 5A"),
  make(20, "05050886", "VIZO Maxo VC202 Micro V8 Cable",             12, 5, 65,  140,   2480, 500, 24, "Standard Micro-USB cable"),
  make(21, "05050887", "VIZO Lightning Cable 1.5m (MFi)",            11, 4, 285, 580,   620,  200, 20, "MFi-certified Lightning cable"),
  make(22, "05050888", "VIZO Type-C Data Cable 3.0m",                10, 5, 145, 295,   980,  300, 24, "Long Type-C cable, braided"),
  make(23, "05050889", "VIZO OTG Adapter Type-C",                    10, 6, 145, 295,   0,    100, 20, "OTG adapter, Type-C to USB-A"),

  /* Chargers */
  make(24, "05050901", "VIZO VOLT 65W GaN Type-C Charger (PD)",      6, 6, 1480, 2480,  410,  100, 10, "Universal GaN charger, 65W PD"),
  make(25, "05050902", "VIZO VOLT 30W Dual Port Charger",            6, 6, 580,  980,   780,  200, 12, "USB-A + Type-C, fast charging"),
  make(26, "05050904", "VIZO VOLT Car Charger 45W",                  6, 6, 480,  840,   340,  100, 12, "Dual-port car charger, PD 45W"),
  make(27, "05050906", "VIZO Clamp V6000 Charger 2026",              6, 5, 230,  420,   1578, 250, 20, "Wall charger with clamp holder"),

  /* Bluetooth */
  make(28, "05050895", "VIZO Glasspods VR7070 Bluetooth",            13, 5, 1800, 2900,  186,  60,  6,  "Bluetooth audio glasses"),
  make(29, "05050896", "VIZO Bluetooth FM Transmitter for Car",      13, 6, 380,  720,   85,   40,  10, "Car FM transmitter, hands-free"),

  /* LED */
  make(30, "05050920", "VIZO LED Bulb 9W (Cool White)",              14, 6, 145, 285,   0,    100, 20, "Energy-saving LED bulb 9W"),
  make(31, "05050921", "VIZO LED Bulb 12W (Cool White)",             14, 6, 195, 380,   12,   80,  20, "Energy-saving LED bulb 12W"),

  /* Slow / dead stock for demo */
  make(32, "05050903", "VIZO Keychain Gifting",                      1,  6, 0,   0,     -975, 0,   50, "Promotional giveaway — needs stock correction"),
  make(33, "05050930", "VIZO Titan Handfree Classic — Discontinued", 3,  5, 65,  140,   180,  0,   20, "Discontinued model"),
];

export function getProduct(id: number) {
  return products.find((p) => p.id === id);
}

export function getCategory(id: number) {
  return categories.find((c) => c.id === id);
}

export function getBrand(id: number) {
  return brands.find((b) => b.id === id);
}

/** How many full packets the quantity makes, and the loose remainder. */
export function toPackets(qty: number, packing: number) {
  if (packing <= 1) return { packets: qty, loose: 0 };
  return { packets: Math.floor(qty / packing), loose: qty % packing };
}

/**
 * How much of an item sits at one location.
 *
 * Derived, not stored — the mock has a single total per item and this splits
 * it the same way every render so the numbers never jump between screens.
 * When the backend lands this becomes a real per-location balance.
 */
export function stockAt(productId: number, locationCode: string): number {
  const p = getProduct(productId);
  if (!p || p.totalStock <= 0) return 0;

  /* Claim stock is counted separately and is never sellable. */
  if (locationCode === "LOC-04") return 0;

  const share: Record<string, number> = {
    "LOC-01": 0.5, // warehouse holds the bulk
    "LOC-02": 0.3, // order department keeps a working stock
    "LOC-03": 0.2, // shop keeps the least
  };
  return Math.floor(p.totalStock * (share[locationCode] ?? 0));
}

/** Every location that currently has some of this item, best first. */
export function stockSpread(productId: number) {
  return ["LOC-01", "LOC-02", "LOC-03"]
    .map((code) => ({ code, qty: stockAt(productId, code) }))
    .filter((x) => x.qty > 0)
    .sort((a, b) => b.qty - a.qty);
}
