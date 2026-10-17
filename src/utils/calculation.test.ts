import { describe, expect, it } from "vitest";
import type { CartItem } from "../types/pos.types";
import { calculateInvoiceTotals, calculateItemSubtotal } from "./calculation";

describe("calculateItemSubtotal", () => {
  it("menghitung subtotal tanpa diskon secara presisi", () => {
    // 10 BTG * Rp 175.000 = Rp 1.750.000
    const result = calculateItemSubtotal(10, 175000, 0, 0);
    expect(result).toBe(1750000);
  });

  it("menghitung subtotal dengan diskon persentase bulat", () => {
    // 10 BTG * Rp 175.000 diskon 5% = Rp 1.662.500
    const result = calculateItemSubtotal(10, 175000, 5, 0);
    expect(result).toBe(1662500);
  });

  it("menghitung subtotal dengan diskon persentase desimal", () => {
    // 10 BTG * Rp 100.000 diskon 2.5% = Rp 975.000
    const result = calculateItemSubtotal(10, 100000, 2.5, 0);
    expect(result).toBe(975000);
  });

  it("menghitung subtotal dengan penambahan pajak", () => {
    // 10 BTG * Rp 100.000 diskon 0% pajak 11% = Rp 1.110.000
    const result = calculateItemSubtotal(10, 100000, 0, 11);
    expect(result).toBe(1110000);
  });

  it("melindungi dari angka negatif dan persentase di luar rentang", () => {
    // Qty negatif diperlakukan sebagai 0
    expect(calculateItemSubtotal(-5, 100000, 0, 0)).toBe(0);
    // Harga negatif diperlakukan sebagai 0
    expect(calculateItemSubtotal(5, -100000, 0, 0)).toBe(0);
    // Diskon negatif dibatasi minimum 0
    expect(calculateItemSubtotal(10, 100000, -10, 0)).toBe(1000000);
    // Diskon melebihi 100 dibatasi maksimum 100
    expect(calculateItemSubtotal(10, 100000, 150, 0)).toBe(0);
  });
});

describe("calculateInvoiceTotals", () => {
  const sampleItems: CartItem[] = [
    {
      product_id: "p1",
      sku: "HLW-40-12",
      name: "Besi Hollow 40x40",
      dimension: "40x40",
      thickness_mm: 1.2,
      unit: "BTG",
      stock_qty: 50,
      qty: 10,
      unit_price: 175000,
      discount_pct: 0,
      tax_pct: 0,
      subtotal: 1750000,
    },
    {
      product_id: "p2",
      sku: "HLW-20-10",
      name: "Besi Hollow 20x20",
      dimension: "20x20",
      thickness_mm: 1.0,
      unit: "BTG",
      stock_qty: 30,
      qty: 5,
      unit_price: 90000,
      discount_pct: 0,
      tax_pct: 0,
      subtotal: 450000,
    },
  ];

  it("mengakumulasi beberapa baris barang dan memotong diskon nota Rupiah", () => {
    // Subtotal 1.750.000 + 450.000 = 2.200.000, diskon nota 50.000 -> 2.150.000
    const totals = calculateInvoiceTotals(sampleItems, 50000, 0);
    expect(totals.subtotalAmount).toBe(2200000);
    expect(totals.grandTotal).toBe(2150000);
  });

  it("melindungi grand total agar tidak pernah di bawah nol saat diskon nota melebihi subtotal", () => {
    // Subtotal 2.200.000, diskon nota 3.000.000 -> grandTotal tetap 0
    const totals = calculateInvoiceTotals(sampleItems, 3000000, 0);
    expect(totals.subtotalAmount).toBe(2200000);
    expect(totals.grandTotal).toBe(0);
  });

  it("menangani keranjang kosong dengan aman", () => {
    const totals = calculateInvoiceTotals([], 0, 0);
    expect(totals.subtotalAmount).toBe(0);
    expect(totals.grandTotal).toBe(0);
  });
});
