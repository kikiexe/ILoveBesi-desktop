import { z } from "zod";

export const saleItemSchema = z.object({
  product_id: z.string().uuid("ID produk tidak valid"),
  qty: z.number().int("Kuantitas harus bilangan bulat").positive("Kuantitas harus lebih dari 0"),
  unit_price: z.number().nonnegative("Harga satuan tidak boleh negatif"),
  discount_pct: z.number().min(0).max(100).default(0),
  tax_pct: z.number().min(0).default(0),
});

export const createSaleSchema = z
  .object({
    payment_type: z.enum(["TUNAI", "QRIS", "KREDIT"]),
    customer_id: z.string().uuid().optional(),
    discount_amount: z.number().nonnegative().default(0),
    tax_amount: z.number().nonnegative().default(0),
    paid_amount: z.number().nonnegative().default(0),
    due_date: z.string().optional(),
    notes: z.string().optional(),
    items: z.array(saleItemSchema).min(1, "Minimal harus ada 1 barang dalam transaksi"),
  })
  .refine(
    (data) => {
      if (data.payment_type === "KREDIT" && !data.customer_id) {
        return false;
      }
      return true;
    },
    {
      message: "Transaksi kredit wajib memilih pelanggan",
      path: ["customer_id"],
    }
  );

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
