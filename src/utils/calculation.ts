import type { CartItem } from "../types/pos.types";

/**
 * Calculates item subtotal identical to database RPC logic:
 * ROUND((qty * unitPrice) * (1 - (discountPct / 100)) * (1 + (taxPct / 100)), 2)
 */
export function calculateItemSubtotal(
  qty: number,
  unitPrice: number,
  discountPct = 0,
  taxPct = 0
): number {
  const safeQty = Math.max(0, qty);
  const safePrice = Math.max(0, unitPrice);
  const safeDisc = Math.min(100, Math.max(0, discountPct));
  const safeTax = Math.max(0, taxPct);

  const base = safeQty * safePrice;
  const afterDiscount = base * (1 - safeDisc / 100);
  const afterTax = afterDiscount * (1 + safeTax / 100);

  return Math.round(afterTax * 100) / 100;
}

/**
 * Calculates invoice subtotal and grand total
 */
export function calculateInvoiceTotals(
  items: CartItem[],
  discountAmount = 0,
  taxAmount = 0
): { subtotalAmount: number; grandTotal: number } {
  const subtotalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
  const safeDiscount = Math.max(0, discountAmount);
  const safeTax = Math.max(0, taxAmount);

  const rawGrandTotal = subtotalAmount - safeDiscount + safeTax;
  const grandTotal = Math.max(0, Math.round(rawGrandTotal * 100) / 100);

  return {
    subtotalAmount: Math.round(subtotalAmount * 100) / 100,
    grandTotal,
  };
}
