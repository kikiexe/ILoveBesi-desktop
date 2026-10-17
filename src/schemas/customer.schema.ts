import { z } from "zod";

export const customerSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Kode pelanggan wajib diisi")
    .max(50, "Kode pelanggan maksimal 50 karakter"),
  name: z
    .string()
    .trim()
    .min(1, "Nama pelanggan wajib diisi")
    .max(255, "Nama pelanggan maksimal 255 karakter"),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  credit_limit: z
    .number()
    .nonnegative("Limit kredit tidak boleh bernilai negatif")
    .default(0),
});

export type CustomerInput = z.infer<typeof customerSchema>;
