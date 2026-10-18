import type { Database } from "./database.types";

export type CashierProduct = Database["public"]["Views"]["v_cashier_products"]["Row"];
export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type Sale = Database["public"]["Tables"]["sales"]["Row"];
export type SaleItem = Database["public"]["Tables"]["sale_items"]["Row"];
export type ReceivablePayment = Database["public"]["Tables"]["receivable_payments"]["Row"];

export interface CartItem {
  product_id: string;
  sku: string;
  name: string;
  dimension: string;
  thickness_mm: number;
  unit: string;
  stock_qty: number;
  qty: number;
  unit_price: number;
  discount_pct: number;
  tax_pct: number;
  subtotal: number;
}

export interface DraftInvoice {
  customer: Customer | null;
  items: CartItem[];
  discount_amount: number;
  tax_amount: number;
  subtotal_amount: number;
  grand_total: number;
}

export type ActiveModal =
  | null
  | "PAYMENT"
  | "CUSTOMER"
  | "STOCK_LOOKUP"
  | "TODAY_HISTORY"
  | "INSTALLMENT"
  | "CONFIRM_LOGOUT"
  | "CONFIRM_CLEAR";

export type PrintMode = "FAKTUR" | "SURAT_JALAN";

export interface PrintDocumentData {
  mode: PrintMode;
  invoice_number: string;
  sale_date: string;
  customer: {
    code?: string | null;
    name: string;
    phone?: string | null;
    address?: string | null;
  } | null;
  cashier_name: string;
  payment_type: "TUNAI" | "QRIS" | "KREDIT";
  payment_status: "LUNAS" | "BELUM_LUNAS";
  items: {
    sku: string;
    name: string;
    dimension: string;
    thickness_mm: number;
    qty: number;
    unit_price: number;
    discount_pct: number;
    subtotal: number;
  }[];
  subtotal_amount: number;
  discount_amount: number;
  tax_amount: number;
  grand_total: number;
  paid_amount: number;
  remaining_debt: number;
  due_date?: string | null;
  notes?: string | null;
}
