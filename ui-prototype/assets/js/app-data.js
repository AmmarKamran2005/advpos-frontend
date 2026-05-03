/* ==========================================================================
   VIZO ERP — Application Data (mock for prototype)
   --------------------------------------------------------------------------
   This file holds the menu structure, current user mock, and other static
   data the prototype needs. When we move to Next.js, these become server
   data fetched via tRPC / REST.
   ========================================================================== */

window.VIZO = window.VIZO || {};

/* ---------- Mock Current User ---------- */
VIZO.currentUser = {
  id: 1,
  fullName: 'Umer Memon',
  email: 'umer@vizo.com.pk',
  role: 'SuperAdmin',
  initials: 'UM',
  avatarUrl: null,
  branchId: 1,
  permissions: ['*'], // SuperAdmin has all
};

/* ---------- Branches ---------- */
VIZO.branches = [
  { id: 1, code: 'KHI', name: 'Karachi Head Office', city: 'Karachi' },
  { id: 2, code: 'LHR', name: 'Lahore Branch',       city: 'Lahore'  },
  { id: 3, code: 'ISB', name: 'Islamabad Branch',    city: 'Islamabad' },
];

/* ---------- Mock Notifications ---------- */
VIZO.notifications = [
  { id: 1, type: 'warning', icon: 'alert-triangle', title: '3 orders on credit hold',  body: 'Pending your override decision', time: '2m ago', unread: true  },
  { id: 2, type: 'info',    icon: 'package',        title: 'GRN-KHI-26-0089 received', body: 'From Al-Rasheed Traders, 24 items', time: '15m ago', unread: true  },
  { id: 3, type: 'success', icon: 'banknote',       title: 'Payment received',          body: 'PKR 1,45,000 from Naveed Foods', time: '1h ago',  unread: true  },
  { id: 4, type: 'danger',  icon: 'clock',          title: '7 invoices overdue',        body: 'AR aging 60+ days needs attention', time: '3h ago', unread: false },
  { id: 5, type: 'info',    icon: 'database',       title: 'Backup completed',          body: 'Daily backup successful — 1.2 GB', time: 'Yesterday', unread: false },
];

/* ==========================================================================
   Sidebar Menu Tree
   --------------------------------------------------------------------------
   Each entry: { type, label, icon, href, permission?, children?, badge?, section? }
   - type: 'item' | 'section' | 'group'
   - badge: { text, variant }   variant ∈ success|warning|danger|info|accent
   ========================================================================== */
VIZO.menu = [
  { type: 'item', label: 'Dashboard', icon: 'layout-dashboard', href: '/dashboard', match: 'dashboard' },

  { type: 'section', label: 'Sales & Customers' },
  { type: 'group', label: 'Sales', icon: 'shopping-cart', match: 'sales',
    children: [
      { label: 'Orders',         href: '/sales/orders',        match: 'sales.orders' },
      { label: 'Invoices',       href: '/sales/invoices',      match: 'sales.invoices' },
      { label: 'Sales Returns',  href: '/sales/returns',       match: 'sales.returns' },
      { label: 'Credit Holds',   href: '/sales/credit-holds',  match: 'sales.credit-holds', badge: { text: '3', variant: 'warning' } },
    ],
  },
  { type: 'group', label: 'Parties', icon: 'users', match: 'parties',
    children: [
      { label: 'All Parties',     href: '/parties',           match: 'parties.all' },
      { label: 'Customers',       href: '/parties/customers', match: 'parties.customers' },
      { label: 'Suppliers',       href: '/parties/suppliers', match: 'parties.suppliers' },
      { label: 'Customer Visits', href: '/parties/visits',    match: 'parties.visits' },
    ],
  },

  { type: 'section', label: 'Purchases' },
  { type: 'group', label: 'Purchases', icon: 'truck', match: 'purchases',
    children: [
      { label: 'Purchase Orders',    href: '/purchases/orders',   match: 'purchases.orders' },
      { label: 'Goods Receipts',     href: '/purchases/grns',     match: 'purchases.grns', badge: { text: '2', variant: 'info' } },
      { label: 'Purchase Invoices',  href: '/purchases/invoices', match: 'purchases.invoices' },
      { label: 'Purchase Returns',   href: '/purchases/returns',  match: 'purchases.returns' },
    ],
  },

  { type: 'section', label: 'Inventory' },
  { type: 'group', label: 'Inventory', icon: 'package', match: 'inventory',
    children: [
      { label: 'Products',          href: '/inventory/products',     match: 'inventory.products' },
      { label: 'Categories',        href: '/inventory/categories',   match: 'inventory.categories' },
      { label: 'Brands',            href: '/inventory/brands',       match: 'inventory.brands' },
      { label: 'Units of Measure',  href: '/inventory/uom',          match: 'inventory.uom' },
      { label: 'Stock Levels',      href: '/inventory/stock-levels', match: 'inventory.stock-levels' },
      { label: 'Stock Movements',   href: '/inventory/movements',    match: 'inventory.movements' },
      { label: 'Stock Adjustments', href: '/inventory/adjustments',  match: 'inventory.adjustments' },
      { label: 'Stock Transfers',   href: '/inventory/transfers',    match: 'inventory.transfers' },
      { label: 'Warehouses',        href: '/inventory/warehouses',   match: 'inventory.warehouses' },
    ],
  },

  { type: 'section', label: 'Accounting' },
  { type: 'group', label: 'Accounting', icon: 'book-open', match: 'accounting',
    children: [
      { label: 'Chart of Accounts', href: '/accounting/coa',              match: 'accounting.coa' },
      { label: 'Journal Entries',   href: '/accounting/journal-entries',  match: 'accounting.je' },
      { label: 'Vouchers',          href: '/accounting/vouchers',         match: 'accounting.vouchers' },
      { label: 'Expenses',          href: '/accounting/expenses',         match: 'accounting.expenses' },
      { label: 'General Ledger',    href: '/accounting/ledger',           match: 'accounting.ledger' },
      { label: 'Trial Balance',     href: '/accounting/trial-balance',    match: 'accounting.tb' },
      { label: 'Profit & Loss',     href: '/accounting/profit-loss',      match: 'accounting.pl' },
      { label: 'Balance Sheet',     href: '/accounting/balance-sheet',    match: 'accounting.bs' },
      { label: 'Cash Flow',         href: '/accounting/cash-flow',        match: 'accounting.cf' },
      { label: 'Period Close',      href: '/accounting/period-close',     match: 'accounting.pc' },
    ],
  },
  { type: 'group', label: 'Zakat', icon: 'moon', match: 'zakat',
    children: [
      { label: 'Periods',      href: '/zakat/periods',      match: 'zakat.periods' },
      { label: 'Calculations', href: '/zakat/calculations', match: 'zakat.calc' },
    ],
  },

  { type: 'section', label: 'Insights' },
  { type: 'group', label: 'Reports', icon: 'bar-chart-3', match: 'reports',
    children: [
      { label: 'Report Library',   href: '/reports',                  match: 'reports.lib' },
      { label: 'Sales Reports',    href: '/reports/sales-summary',    match: 'reports.sales' },
      { label: 'Purchase Reports', href: '/reports/purchase-summary', match: 'reports.purch' },
      { label: 'Inventory Reports',href: '/reports/inventory-valuation', match: 'reports.inv' },
      { label: 'AR Aging',         href: '/reports/aging/customer',   match: 'reports.ar-aging' },
      { label: 'AP Aging',         href: '/reports/aging/supplier',   match: 'reports.ap-aging' },
      { label: 'Top Customers',    href: '/reports/top-customers',    match: 'reports.top-cust' },
      { label: 'Slow Moving',      href: '/reports/slow-moving',      match: 'reports.slow' },
      { label: 'Dead Stock',       href: '/reports/dead-stock',       match: 'reports.dead' },
      { label: 'Sales Trends',     href: '/reports/sales-trends',     match: 'reports.trends' },
    ],
  },
  { type: 'item', label: 'AI Assistant', icon: 'sparkles', href: '/ai-assistant', match: 'ai', badge: { text: 'NEW', variant: 'accent' } },

  { type: 'section', label: 'Communication' },
  { type: 'group', label: 'SMS / Notifications', icon: 'message-square', match: 'sms',
    children: [
      { label: 'SMS History', href: '/notifications/sms',       match: 'sms.history' },
      { label: 'Templates',   href: '/notifications/templates', match: 'sms.templates' },
      { label: 'Gateways',    href: '/notifications/gateways',  match: 'sms.gateways' },
    ],
  },

  { type: 'section', label: 'Administration' },
  { type: 'group', label: 'Administration', icon: 'shield', match: 'admin',
    children: [
      { label: 'Users',              href: '/admin/users',     match: 'admin.users' },
      { label: 'Roles & Permissions',href: '/admin/roles',     match: 'admin.roles' },
      { label: 'Branches',           href: '/admin/branches',  match: 'admin.branches' },
      { label: 'Audit Log',          href: '/admin/audit-log', match: 'admin.audit' },
      { label: 'Backup & Restore',   href: '/admin/backup',    match: 'admin.backup' },
      { label: 'System Settings',    href: '/admin/settings',  match: 'admin.settings' },
      { label: 'LLM Usage & Cost',   href: '/admin/llm-usage', match: 'admin.llm' },
    ],
  },
];

/* ---------- Quick Create Menu ---------- */
VIZO.quickCreate = [
  { label: 'New Order',          icon: 'shopping-cart', href: '/sales/orders/new',          shortcut: 'O' },
  { label: 'New Invoice',        icon: 'file-text',     href: '/sales/invoices/new',        shortcut: 'I' },
  { label: 'New Purchase Order', icon: 'truck',         href: '/purchases/orders/new',      shortcut: 'P' },
  { label: 'New GRN',            icon: 'package',       href: '/purchases/grns/new',        shortcut: 'G' },
  { label: 'New Voucher',        icon: 'banknote',      href: '/accounting/vouchers/new',   shortcut: 'V' },
  { label: 'New Party',          icon: 'user-plus',     href: '/parties/new',               shortcut: 'C' },
  { label: 'New Product',        icon: 'box',           href: '/inventory/products/new',    shortcut: 'R' },
];
