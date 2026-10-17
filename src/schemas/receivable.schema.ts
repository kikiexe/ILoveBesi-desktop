import { z } from "zod";

export const payReceivableSchema = z.object({
  sale_id: z.string().uuid("ID faktur tidak valid"),
  amount: z.number().positive("Nominal pembayaran harus lebih besar dari 0"),
  payment_method: z.enum(["TUNAI", "TRANSFER"]).default("TUNAI"),
  notes: z.string().optional(),
});

export type PayReceivableInput = z.infer<typeof payReceivableSchema>;
