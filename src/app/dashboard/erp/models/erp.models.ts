// ── Fiscal Year ──
export interface ErpFiscalYear {
  id: number;
  clubId: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt?: string;
}

// ── Account (Chart of Accounts) ──
export interface ErpAccount {
  id: number;
  clubId: number;
  accountNumber: string;
  name: string;
  parentId?: number;
  accountType: string;   // Receivable, Payable, Bank, Cash, Income, Expense, Equity, FixedAsset
  rootType: string;      // Asset, Liability, Equity, Income, Expense
  isGroup: boolean;
  currency: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  children?: ErpAccount[];
}

// ── Cost Center ──
export interface ErpCostCenter {
  id: number;
  clubId: number;
  name: string;
  parentId?: number;
  isGroup: boolean;
  sortOrder: number;
  temporada?: string | null;
  teamId?: number | null;
  createdAt?: string;
  children?: ErpCostCenter[];
}

// ── Journal Entry ──
export interface ErpJournalEntry {
  id: number;
  clubId: number;
  fiscalYearId?: number;
  postingDate: string;
  entryType: string;    // Opening, Standard, Adjustment, Closing
  totalDebit: number;
  totalCredit: number;
  status: string;       // Draft, Posted, Cancelled
  remarks?: string;
  referenceType?: string;
  referenceId?: number;
  createdBy?: number;
  createdAt?: string;
  items?: ErpJournalEntryItem[];
}

export interface ErpJournalEntryItem {
  id?: number;
  entryId?: number;
  accountId: number;
  costCenterId?: number;
  debitAmount: number;
  creditAmount: number;
  partyType?: string;   // Customer, Supplier, Employee
  partyId?: number;
  remarks?: string;
  accountName?: string;
}

// ── Customer ──
export interface ErpCustomer {
  id: number;
  clubId: number;
  name: string;
  customerType: string; // Sponsor, Member, Federation, Other
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentTermsDays: number;
  notes?: string;
  isActive: boolean;
  createdAt?: string;
}

// ── Supplier ──
export interface ErpSupplier {
  id: number;
  clubId: number;
  name: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  category: string;    // Equipment, Medical, Transport, Services, Food, Other
  paymentTermsDays: number;
  notes?: string;
  isActive: boolean;
  createdAt?: string;
}

// ── Sales Invoice ──
export interface ErpSalesInvoice {
  id: number;
  clubId: number;
  invoiceNumber: string;
  customerId?: number;
  customerName?: string;
  postingDate: string;
  dueDate?: string;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  paidAmount: number;
  currency: string;
  status: string;      // Draft, Submitted, PartiallyPaid, Paid, Overdue, Cancelled
  costCenterId?: number;
  notes?: string;
  createdBy?: number;
  createdAt?: string;
  items?: ErpSalesInvoiceItem[];
}

export interface ErpSalesInvoiceItem {
  id?: number;
  invoiceId?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate: number;
  taxAmount: number;
  accountId?: number;
  sortOrder?: number;
}

// ── Purchase Invoice ──
export interface ErpPurchaseInvoice {
  id: number;
  clubId: number;
  invoiceNumber: string;
  supplierId?: number;
  supplierName?: string;
  postingDate: string;
  dueDate?: string;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  paidAmount: number;
  currency: string;
  status: string;
  costCenterId?: number;
  notes?: string;
  createdBy?: number;
  createdAt?: string;
  items?: ErpPurchaseInvoiceItem[];
}

export interface ErpPurchaseInvoiceItem {
  id?: number;
  invoiceId?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate: number;
  taxAmount: number;
  accountId?: number;
  sortOrder?: number;
}

// ── Payment ──
export interface ErpPayment {
  id: number;
  clubId: number;
  paymentType: string;  // Receive, Pay
  postingDate: string;
  partyType?: string;
  partyId?: number;
  partyName?: string;
  paidAmount: number;
  paymentMethod: string; // Cash, BankTransfer, Card, Check, Stripe
  bankAccountId?: number;
  referenceNumber?: string;
  referenceDocType?: string; // SalesInvoice, PurchaseInvoice
  referenceDocId?: number;
  costCenterId?: number | null;
  status: string;       // Draft, Submitted, Cancelled
  remarks?: string;
  createdBy?: number;
  createdAt?: string;
}

// ── Budget ──
export interface ErpBudget {
  id: number;
  clubId: number;
  fiscalYearId?: number;
  name: string;
  status: string;       // Draft, Active, Closed
  createdBy?: number;
  createdAt?: string;
  items?: ErpBudgetItem[];
}

export interface ErpBudgetItem {
  id?: number;
  budgetId?: number;
  accountId: number;
  costCenterId?: number;
  budgetAmount: number;
  actualAmount: number;
  accountName?: string;
}

// ── Report types ──
export interface ErpDashboardKpis {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  pendingSalesInvoices: number;
  pendingPurchaseInvoices: number;
  overdueCount: number;
}

export interface ErpProfitLossReport {
  income: { accountId: number; accountNumber: string; accountName: string; amount: number }[];
  expense: { accountId: number; accountNumber: string; accountName: string; amount: number }[];
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  from: string;
  to: string;
}

export interface ErpTrialBalanceRow {
  accountId: number;
  accountNumber: string;
  accountName: string;
  debit: number;
  credit: number;
  balance: number;
}

// ── Income by Cost Center ──
export interface ErpIncomeByCCRow {
  costCenterId: number | null;
  costCenterName: string;
  totalIncome: number;
  percentage: number;
}

export interface ErpIncomeByCCReport {
  rows: ErpIncomeByCCRow[];
  grandTotal: number;
}

export const ERP_INVOICE_STATUSES = ['Draft', 'Submitted', 'PartiallyPaid', 'Paid', 'Overdue', 'Cancelled'] as const;
export const ERP_INVOICE_STATUS_LABELS: Record<string, string> = {
  Draft: 'Borrador',
  Submitted: 'Enviada',
  PartiallyPaid: 'Pago parcial',
  Paid: 'Pagada',
  Overdue: 'Vencida',
  Cancelled: 'Anulada'
};

export const ERP_PAYMENT_METHODS = ['Cash', 'BankTransfer', 'Card', 'Check', 'Stripe'] as const;

export const ERP_CUSTOMER_TYPES = ['Sponsor', 'Member', 'Federation', 'Club', 'Institution', 'PlayerFamily', 'Media', 'Partner', 'Other'] as const;
export const ERP_CUSTOMER_TYPE_LABELS: Record<string, string> = {
  Sponsor: 'Patrocinador',
  Member: 'Socio / Abonado',
  Federation: 'Federación',
  Club: 'Club',
  Institution: 'Institución / Ayuntamiento',
  PlayerFamily: 'Familia de jugador',
  Media: 'Medios de comunicación',
  Partner: 'Colaborador',
  Other: 'Otro'
};

export const ERP_SUPPLIER_CATEGORIES = ['Equipamiento', 'Médico / Sanitario', 'Transporte', 'Servicios', 'Alimentación', 'Instalaciones', 'Tecnología', 'Formación', 'Marketing', 'Otros'] as const;
