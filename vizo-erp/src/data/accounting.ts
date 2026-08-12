/**
 * Mock accounting data: COA, journal entries, vouchers, expenses
 */

export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

export type Account = {
  id: number;
  code: string;
  name: string;
  parentId: number | null;
  type: AccountType;
  subtype: string;
  isGroup: boolean;
  balance: number;
  currency: string;
};

export const accounts: Account[] = [
  /* ASSETS */
  { id: 1,   code: "1000", name: "Assets",                  parentId: null, type: "ASSET", subtype: "GROUP",     isGroup: true,  balance: 0,        currency: "PKR" },
  { id: 11,  code: "1100", name: "Current Assets",          parentId: 1,    type: "ASSET", subtype: "GROUP",     isGroup: true,  balance: 0,        currency: "PKR" },
  { id: 111, code: "1101", name: "Cash on Hand",            parentId: 11,   type: "ASSET", subtype: "CASH",      isGroup: false, balance: 840000,   currency: "PKR" },
  { id: 112, code: "1102", name: "Cash - Shop 2",           parentId: 11,   type: "ASSET", subtype: "CASH",      isGroup: false, balance: 420000,   currency: "PKR" },
  { id: 114, code: "1110", name: "HBL Bank Account",        parentId: 11,   type: "ASSET", subtype: "BANK",      isGroup: false, balance: 1840000,  currency: "PKR" },
  { id: 115, code: "1111", name: "Meezan Bank Account",     parentId: 11,   type: "ASSET", subtype: "BANK",      isGroup: false, balance: 1240000,  currency: "PKR" },
  { id: 116, code: "1112", name: "UBL Bank Account",        parentId: 11,   type: "ASSET", subtype: "BANK",      isGroup: false, balance: 640000,   currency: "PKR" },
  { id: 117, code: "1120", name: "Easypaisa Wallet",        parentId: 11,   type: "ASSET", subtype: "WALLET",    isGroup: false, balance: 145000,   currency: "PKR" },
  { id: 118, code: "1121", name: "JazzCash Wallet",         parentId: 11,   type: "ASSET", subtype: "WALLET",    isGroup: false, balance: 75000,    currency: "PKR" },
  { id: 119, code: "1130", name: "Accounts Receivable",     parentId: 11,   type: "ASSET", subtype: "AR",        isGroup: false, balance: 18400000, currency: "PKR" },
  { id: 124, code: "1131", name: "COD with Couriers",       parentId: 11,   type: "ASSET", subtype: "AR",        isGroup: false, balance: 452900,   currency: "PKR" },
  { id: 120, code: "1140", name: "Inventory",               parentId: 11,   type: "ASSET", subtype: "INVENTORY", isGroup: false, balance: 16617597, currency: "PKR" },
  { id: 121, code: "1150", name: "Prepaid Expenses",        parentId: 11,   type: "ASSET", subtype: "PREPAID",   isGroup: false, balance: 124000,   currency: "PKR" },
  { id: 12,  code: "1200", name: "Fixed Assets",            parentId: 1,    type: "ASSET", subtype: "GROUP",     isGroup: true,  balance: 0,        currency: "PKR" },
  { id: 122, code: "1201", name: "Office Equipment",        parentId: 12,   type: "ASSET", subtype: "FIXED",     isGroup: false, balance: 1850000,  currency: "PKR" },
  { id: 123, code: "1202", name: "Vehicles",                parentId: 12,   type: "ASSET", subtype: "FIXED",     isGroup: false, balance: 4200000,  currency: "PKR" },

  /* LIABILITIES */
  { id: 2,   code: "2000", name: "Liabilities",             parentId: null, type: "LIABILITY", subtype: "GROUP",   isGroup: true,  balance: 0,        currency: "PKR" },
  { id: 21,  code: "2100", name: "Current Liabilities",     parentId: 2,    type: "LIABILITY", subtype: "GROUP",   isGroup: true,  balance: 0,        currency: "PKR" },
  { id: 211, code: "2101", name: "Accounts Payable",        parentId: 21,   type: "LIABILITY", subtype: "AP",      isGroup: false, balance: 9620000,  currency: "PKR" },
  { id: 212, code: "2102", name: "Stock Received Not Billed", parentId: 21, type: "LIABILITY", subtype: "ACCRUED", isGroup: false, balance: 482000,   currency: "PKR" },
  { id: 213, code: "2110", name: "Output Sales Tax Payable", parentId: 21,  type: "LIABILITY", subtype: "TAX",     isGroup: false, balance: 1245000,  currency: "PKR" },
  { id: 214, code: "2111", name: "Input Sales Tax",         parentId: 21,   type: "LIABILITY", subtype: "TAX",     isGroup: false, balance: 845000,   currency: "PKR" },
  { id: 215, code: "2120", name: "WHT Payable",             parentId: 21,   type: "LIABILITY", subtype: "TAX",     isGroup: false, balance: 124000,   currency: "PKR" },
  { id: 216, code: "2130", name: "Zakat Payable",           parentId: 21,   type: "LIABILITY", subtype: "ZAKAT",   isGroup: false, balance: 0,        currency: "PKR" },

  /* CAPITAL */
  { id: 3,   code: "3000", name: "Capital",                 parentId: null, type: "EQUITY", subtype: "GROUP",    isGroup: true,  balance: 0,        currency: "PKR" },
  { id: 31,  code: "3001", name: "Owner Capital",           parentId: 3,    type: "EQUITY", subtype: "CAPITAL",  isGroup: false, balance: 12000000, currency: "PKR" },
  { id: 32,  code: "3002", name: "Retained Earnings",       parentId: 3,    type: "EQUITY", subtype: "RETAINED", isGroup: false, balance: 8240000,  currency: "PKR" },

  /* REVENUE */
  { id: 4,   code: "4000", name: "Revenue",                 parentId: null, type: "REVENUE", subtype: "GROUP",   isGroup: true,  balance: 0,        currency: "PKR" },
  { id: 41,  code: "4001", name: "Sale",                    parentId: 4,    type: "REVENUE", subtype: "SALES",   isGroup: false, balance: 21800000, currency: "PKR" },
  { id: 42,  code: "4002", name: "Sales Returns",           parentId: 4,    type: "REVENUE", subtype: "RETURNS", isGroup: false, balance: -180000,  currency: "PKR" },
  { id: 43,  code: "4010", name: "Other Income",            parentId: 4,    type: "REVENUE", subtype: "OTHER",   isGroup: false, balance: 24000,    currency: "PKR" },

  /* EXPENSES - mirrors the account list the business already keeps */
  { id: 5,   code: "5000", name: "Expenses",                parentId: null, type: "EXPENSE", subtype: "GROUP",   isGroup: true,  balance: 0,        currency: "PKR" },
  { id: 51,  code: "5001", name: "Cost of Goods Sold",      parentId: 5,    type: "EXPENSE", subtype: "COGS",    isGroup: false, balance: 14500000, currency: "PKR" },
  { id: 52,  code: "5101", name: "Salary Expense",          parentId: 5,    type: "EXPENSE", subtype: "OPEX",    isGroup: false, balance: 10132864, currency: "PKR" },
  { id: 53,  code: "5102", name: "Rent Expense",            parentId: 5,    type: "EXPENSE", subtype: "OPEX",    isGroup: false, balance: 3838730,  currency: "PKR" },
  { id: 59,  code: "5103", name: "Shop Expense",            parentId: 5,    type: "EXPENSE", subtype: "OPEX",    isGroup: false, balance: 7020858,  currency: "PKR" },
  { id: 60,  code: "5104", name: "Shop 2 Expense",          parentId: 5,    type: "EXPENSE", subtype: "OPEX",    isGroup: false, balance: 768806,   currency: "PKR" },
  { id: 61,  code: "5105", name: "Dealer Commission",       parentId: 5,    type: "EXPENSE", subtype: "OPEX",    isGroup: false, balance: 2988663,  currency: "PKR" },
  { id: 62,  code: "5106", name: "Warranty & Claims",       parentId: 5,    type: "EXPENSE", subtype: "OPEX",    isGroup: false, balance: 1313558,  currency: "PKR" },
  { id: 63,  code: "5107", name: "Marketing",               parentId: 5,    type: "EXPENSE", subtype: "OPEX",    isGroup: false, balance: 1665420,  currency: "PKR" },
  { id: 64,  code: "5108", name: "Travelling",              parentId: 5,    type: "EXPENSE", subtype: "OPEX",    isGroup: false, balance: 1317727,  currency: "PKR" },
  { id: 65,  code: "5109", name: "Discount Loss",           parentId: 5,    type: "EXPENSE", subtype: "OPEX",    isGroup: false, balance: 263390,   currency: "PKR" },
  { id: 66,  code: "5110", name: "Online Shop",             parentId: 5,    type: "EXPENSE", subtype: "OPEX",    isGroup: false, balance: 188752,   currency: "PKR" },
  { id: 67,  code: "5111", name: "Food Expense",            parentId: 5,    type: "EXPENSE", subtype: "OPEX",    isGroup: false, balance: 582898,   currency: "PKR" },
  { id: 55,  code: "5112", name: "Vehicle & Fuel",          parentId: 5,    type: "EXPENSE", subtype: "OPEX",    isGroup: false, balance: 320000,   currency: "PKR" },
  { id: 68,  code: "5113", name: "Repairing Expense",       parentId: 5,    type: "EXPENSE", subtype: "OPEX",    isGroup: false, balance: 172570,   currency: "PKR" },
  { id: 69,  code: "5114", name: "Delivery & Courier",      parentId: 5,    type: "EXPENSE", subtype: "OPEX",    isGroup: false, balance: 284600,   currency: "PKR" },
  { id: 54,  code: "5115", name: "Utilities",               parentId: 5,    type: "EXPENSE", subtype: "OPEX",    isGroup: false, balance: 145000,   currency: "PKR" },
  { id: 57,  code: "5116", name: "Bank Charges",            parentId: 5,    type: "EXPENSE", subtype: "FINANCE", isGroup: false, balance: 18000,    currency: "PKR" },
  { id: 70,  code: "5117", name: "Personal",                parentId: 5,    type: "EXPENSE", subtype: "OPEX",    isGroup: false, balance: 13090376, currency: "PKR" },
];

/* JOURNAL ENTRIES */
export type JEStatus = "DRAFT" | "POSTED" | "REVERSED";
export type JE = {
  id: number;
  entryNo: string;
  entryDate: string;
  entryType: string;
  reference: string;
  location: string;
  narration: string;
  totalDebit: number;
  totalCredit: number;
  status: JEStatus;
  postedBy?: string;
  createdBy: string;
};

export const journalEntries: JE[] = [
  { id: 1,  entryNo: "JE-26-1042", entryDate: "2026-04-30", entryType: "SALE",      reference: "INV-26-0142", location: "Order Department",   narration: "Sales invoice posting",                  totalDebit: 145000, totalCredit: 145000, status: "POSTED",   postedBy: "System", createdBy: "System" },
  { id: 2,  entryNo: "JE-26-1041", entryDate: "2026-04-30", entryType: "RECEIPT",   reference: "VCH-26-0089", location: "Order Department",   narration: "Bank receipt — Hafeez Center #28",       totalDebit: 100000, totalCredit: 100000, status: "POSTED",   postedBy: "Hassan Raza", createdBy: "Hassan Raza" },
  { id: 3,  entryNo: "JE-26-1040", entryDate: "2026-04-29", entryType: "PURCHASE",  reference: "GRN-26-0089", location: "Order Department",   narration: "GRN posting — Shenzhen Electronics",     totalDebit: 482000, totalCredit: 482000, status: "POSTED",   postedBy: "System", createdBy: "System" },
  { id: 4,  entryNo: "JE-26-1039", entryDate: "2026-04-29", entryType: "PAYMENT",   reference: "VCH-26-0088", location: "Order Department",   narration: "Bank payment — Pak Accessories",          totalDebit: 320000, totalCredit: 320000, status: "POSTED",   postedBy: "Hassan Raza", createdBy: "Hassan Raza" },
  { id: 5,  entryNo: "JE-26-1038", entryDate: "2026-04-28", entryType: "EXPENSE",   reference: "EXP-26-0024", location: "Order Department",   narration: "Office rent — April 2026",                totalDebit: 120000, totalCredit: 120000, status: "POSTED",   postedBy: "Hassan Raza", createdBy: "Hassan Raza" },
  { id: 6,  entryNo: "JE-26-1037", entryDate: "2026-04-28", entryType: "JOURNAL",   reference: "—",                location: "Order Department",   narration: "Adjustment — bank reconciliation",        totalDebit: 4200,   totalCredit: 4200,   status: "POSTED",   postedBy: "Hassan Raza", createdBy: "Hassan Raza" },
  { id: 7,  entryNo: "JE-26-1036", entryDate: "2026-04-27", entryType: "TRANSFER",  reference: "TRF-26-0012", location: "Order Department",   narration: "Stock transfer Warehouse → Shop 2 (in transit)",  totalDebit: 245000, totalCredit: 245000, status: "POSTED",   postedBy: "System", createdBy: "System" },
  { id: 8,  entryNo: "JE-26-1043", entryDate: "2026-05-01", entryType: "JOURNAL",   reference: "—",                location: "Order Department",   narration: "Depreciation — vehicles April",           totalDebit: 35000,  totalCredit: 35000,  status: "DRAFT",                          createdBy: "Hassan Raza" },
];

export const JE_STATUS_VARIANT: Record<JEStatus, "success" | "muted" | "danger"> = {
  DRAFT:    "muted",
  POSTED:   "success",
  REVERSED: "danger",
};

/* VOUCHERS */
export type VoucherType = "CR" | "CP" | "BR" | "BP" | "WR" | "WP" | "JV";
export type Voucher = {
  id: number;
  voucherNo: string;
  type: VoucherType;
  typeName: string;
  date: string;
  location: string;
  partyType: "CUSTOMER" | "SUPPLIER" | "ACCOUNT" | "EMPLOYEE";
  partyName: string;
  amount: number;
  paymentMethod: "CASH" | "BANK" | "EASYPAISA" | "JAZZCASH" | "CHEQUE";
  paymentProvider?: string;
  reference: string;
  narration: string;
  status: "DRAFT" | "POSTED" | "RECONCILED" | "CANCELLED";
  createdBy: string;
};

const VOUCHER_TYPES: Record<VoucherType, string> = {
  CR: "Cash Receipt",
  CP: "Cash Payment",
  BR: "Bank Receipt",
  BP: "Bank Payment",
  WR: "Wallet Receipt",
  WP: "Wallet Payment",
  JV: "Journal Voucher",
};

export const vouchers: Voucher[] = [
  { id: 1, voucherNo: "VCH-26-0089", type: "BR", typeName: VOUCHER_TYPES.BR, date: "2026-04-30", location: "Order Department", partyType: "CUSTOMER", partyName: "Hafeez Center Shop #28",   amount: 100000, paymentMethod: "BANK",      paymentProvider: "Meezan Bank", reference: "TXN-7748392",  narration: "Payment against INV-128",         status: "POSTED", createdBy: "Hassan Raza" },
  { id: 2, voucherNo: "VCH-26-0088", type: "BP", typeName: VOUCHER_TYPES.BP, date: "2026-04-29", location: "Order Department", partyType: "SUPPLIER", partyName: "Pak Accessories Imports",  amount: 320000, paymentMethod: "BANK",      paymentProvider: "HBL Bank",    reference: "CHQ-001245",   narration: "Payment for PI-040",              status: "POSTED", createdBy: "Hassan Raza" },
  { id: 3, voucherNo: "VCH-26-0087", type: "CR", typeName: VOUCHER_TYPES.CR, date: "2026-04-29", location: "Order Department", partyType: "CUSTOMER", partyName: "Saddar Mobile Plaza",      amount: 32750,  paymentMethod: "CASH",                                       reference: "—",            narration: "Cash receipt over counter",        status: "POSTED", createdBy: "Hassan Raza" },
  { id: 4, voucherNo: "VCH-26-0086", type: "WR", typeName: VOUCHER_TYPES.WR, date: "2026-04-28", location: "Order Department", partyType: "CUSTOMER", partyName: "Quetta Cellular",          amount: 12400,  paymentMethod: "JAZZCASH",  paymentProvider: "JazzCash",    reference: "JC-998877665", narration: "JazzCash payment",                 status: "POSTED", createdBy: "Hassan Raza" },
  { id: 5, voucherNo: "VCH-26-0034", type: "WR", typeName: VOUCHER_TYPES.WR, date: "2026-04-29", location: "Shop 2",  partyType: "CUSTOMER", partyName: "Mobile Mart Multan",       amount: 24600,  paymentMethod: "EASYPAISA", paymentProvider: "Easypaisa",   reference: "EP-554433221", narration: "Easypaisa payment",                status: "POSTED", createdBy: "Sara Khan" },
  { id: 6, voucherNo: "VCH-26-0090", type: "JV", typeName: VOUCHER_TYPES.JV, date: "2026-05-01", location: "Order Department", partyType: "ACCOUNT",  partyName: "Multiple",                  amount: 35000,  paymentMethod: "CASH",                                       reference: "—",            narration: "Depreciation entry — April vehicles", status: "DRAFT",                createdBy: "Hassan Raza" },
];

/* EXPENSES */
export const expenses = [
  { id: 1, expenseNo: "EXP-26-0024", date: "2026-04-28", category: "Office Rent",       account: "Office Rent",         amount: 120000, vendor: "Kohinoor Properties",     paidVia: "BANK" as const, status: "POSTED" as const, location: "Order Department" },
  { id: 2, expenseNo: "EXP-26-0023", date: "2026-04-27", category: "Utilities (KE)",    account: "Utilities",            amount: 45000,  vendor: "K-Electric",              paidVia: "BANK" as const, status: "POSTED" as const, location: "Order Department" },
  { id: 3, expenseNo: "EXP-26-0022", date: "2026-04-26", category: "Internet",          account: "Utilities",            amount: 18000,  vendor: "Stormfiber",              paidVia: "BANK" as const, status: "POSTED" as const, location: "Order Department" },
  { id: 4, expenseNo: "EXP-26-0021", date: "2026-04-24", category: "Vehicle Fuel",      account: "Vehicle & Fuel",       amount: 28500,  vendor: "Shell Pakistan",          paidVia: "CASH" as const, status: "POSTED" as const, location: "Order Department" },
  { id: 5, expenseNo: "EXP-26-0014", date: "2026-04-22", category: "Marketing",          account: "Marketing & Advertising", amount: 84000, vendor: "Daraz Sponsored Ads",     paidVia: "BANK" as const, status: "POSTED" as const, location: "Shop 2"  },
  { id: 6, expenseNo: "EXP-26-0025", date: "2026-04-30", category: "SMS Service",        account: "SMS / Communication",  amount: 12000,  vendor: "Jazz BizSMS",             paidVia: "BANK" as const, status: "DRAFT" as const,  location: "Order Department" },
];
