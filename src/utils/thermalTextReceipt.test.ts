import { describe, it, expect } from "vitest";
import { formatThermalTextReceipt } from "./thermalTextReceipt";
import type { PrintDocumentData } from "../types/pos.types";
import { DEFAULT_POS_SETTINGS } from "../types/settings.types";

describe("formatThermalTextReceipt", () => {
  const dummyDoc: PrintDocumentData = {
    mode: "STRUK",
    invoice_number: "NF-2610230001",
    sale_date: "2026-10-23T14:30:00.000Z",
    customer: {
      code: "CUST-01",
      name: "Budi Santoso",
      phone: "0812345678",
      address: "Jl. Besi",
    },
    cashier_name: "Kasir 1",
    payment_type: "TUNAI",
    payment_status: "LUNAS",
    items: [
      {
        sku: "BS-40",
        name: "Hollow Galvanis 40x40 1.2mm",
        dimension: "40x40",
        thickness_mm: 1.2,
        unit: "BTG",
        qty: 5,
        unit_price: 100000,
        discount_pct: 0,
        subtotal: 500000,
        include_ppn: true,
      },
    ],
    subtotal_amount: 500000,
    discount_amount: 0,
    tax_amount: 49550,
    grand_total: 500000,
    paid_amount: 500000,
    remaining_debt: 0,
    settings: {
      ...DEFAULT_POS_SETTINGS,
      paperWidth: "80mm",
    },
  };

  it("formats 80mm receipt with correct lines and totals", () => {
    const text = formatThermalTextReceipt(dummyDoc);
    expect(text).toContain("ILUVBESI POS");
    expect(text).toContain("NF-2610230001");
    expect(text).toContain("Hollow Galvanis 40x40 1.2mm");
    expect(text).toContain("500.000");
    expect(text).toContain("BUKTI TRANSAKSI KASIR");
  });

  it("adjusts width to 32 characters for 58mm paper", () => {
    const text58 = formatThermalTextReceipt({
      ...dummyDoc,
      settings: {
        ...DEFAULT_POS_SETTINGS,
        paperWidth: "58mm",
      },
    });
    const lines = text58.split("\n");
    const divider = lines.find((l) => l.startsWith("---"));
    expect(divider?.length).toBe(32);
  });
});
