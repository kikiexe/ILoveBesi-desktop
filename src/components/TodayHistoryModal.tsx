import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { getWibTodayRange, formatWibDateTime } from "../utils/date";
import { formatRupiah } from "../utils/currency";
import type { PrintDocumentData, PrintMode, CashierProduct } from "../types/pos.types";

interface TodayHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: CashierProduct[];
  onTriggerPrint: (docData: PrintDocumentData) => void;
}

interface SaleRowWithRelations {
  id: string;
  invoice_number: string;
  sale_date: string;
  payment_type: "TUNAI" | "QRIS" | "KREDIT" | string;
  payment_status: "LUNAS" | "BELUM_LUNAS";
  subtotal_amount: number;
  discount_amount: number;
  tax_amount: number;
  grand_total: number;
  paid_amount: number;
  remaining_debt: number;
  due_date: string | null;
  notes: string | null;
  cashier_name?: string | null;
  customers: {
    code: string;
    name: string;
    phone: string | null;
    address: string | null;
  } | null;
  sale_items: {
    id: string;
    product_id: string;
    qty: number;
    unit_price: number;
    discount_pct: number;
    subtotal: number;
  }[];
}

export default function TodayHistoryModal({
  isOpen,
  onClose,
  products,
  onTriggerPrint,
}: TodayHistoryModalProps) {
  const [sales, setSales] = useState<SaleRowWithRelations[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchTodaySales = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { startIso, endIso } = getWibTodayRange();

      // Avoid joining public.products directly because RLS blocks cashier role
      const { data, error } = await supabase
        .from("sales")
        .select(`
          id,
          invoice_number,
          sale_date,
          cashier_name,
          payment_type,
          payment_status,
          subtotal_amount,
          discount_amount,
          tax_amount,
          grand_total,
          paid_amount,
          remaining_debt,
          due_date,
          notes,
          customers (
            code,
            name,
            phone,
            address
          ),
          sale_items (
            id,
            product_id,
            qty,
            unit_price,
            discount_pct,
            subtotal
          )
        `)
        .gte("sale_date", startIso)
        .lte("sale_date", endIso)
        .order("sale_date", { ascending: false });

      if (error) throw new Error(error.message);
      setSales((data as unknown as SaleRowWithRelations[]) || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat histori transaksi hari ini";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchTodaySales();
      setSearchQuery("");
    }
  }, [isOpen, fetchTodaySales]);

  if (!isOpen) return null;

  const filteredSales = sales.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const custName = s.customers?.name?.toLowerCase() || "umum";
    return s.invoice_number.toLowerCase().includes(q) || custName.includes(q);
  });

  const handlePrint = (sale: SaleRowWithRelations, mode: PrintMode) => {
    const docData: PrintDocumentData = {
      mode,
      invoice_number: sale.invoice_number,
      sale_date: sale.sale_date,
      customer: sale.customers
        ? {
            code: sale.customers.code,
            name: sale.customers.name,
            phone: sale.customers.phone,
            address: sale.customers.address,
          }
        : null,
      cashier_name: sale.cashier_name || "Kasir",
      payment_type:
        sale.payment_type === "QRIS" || (sale.notes && sale.notes.includes("[QRIS]"))
          ? "QRIS"
          : (sale.payment_type as "TUNAI" | "QRIS" | "KREDIT"),
      payment_status: sale.payment_status as "LUNAS" | "BELUM_LUNAS",
      items: sale.sale_items.map((it) => {
        // In-memory lookup against v_cashier_products to avoid products RLS restriction
        const prod = products.find((p) => p.id === it.product_id);
        return {
          sku: prod?.sku || "-",
          name: prod?.name || "-",
          dimension: prod?.dimension || "-",
          thickness_mm: Number(prod?.thickness_mm || 0),
          qty: it.qty,
          unit_price: it.unit_price,
          discount_pct: it.discount_pct,
          subtotal: it.subtotal,
        };
      }),
      subtotal_amount: sale.subtotal_amount,
      discount_amount: sale.discount_amount,
      tax_amount: sale.tax_amount,
      grand_total: sale.grand_total,
      paid_amount: sale.paid_amount,
      remaining_debt: sale.remaining_debt,
      due_date: sale.due_date,
      notes: sale.notes,
    };

    onTriggerPrint(docData);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div className="flex h-[600px] w-full max-w-5xl flex-col rounded-md border border-slate-300 bg-white shadow-xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              [F10] Histori Transaksi Hari Ini (WIB)
            </h2>
            <p className="text-xs text-slate-700">
              Daftar seluruh transaksi yang telah disimpan hari ini beserta opsi cetak ulang
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
          >
            [Esc] Tutup
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 p-4">
          <input
            type="text"
            autoFocus
            placeholder="Cari nomor faktur atau nama pelanggan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 flex-1 rounded border border-slate-300 bg-white px-3 text-xs text-slate-900 placeholder-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
          />
          <button
            type="button"
            onClick={fetchTodaySales}
            className="h-10 rounded border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
          >
            Segarkan Data
          </button>
        </div>

        {/* Konten Tabel */}
        <div className="flex flex-1 flex-col overflow-hidden p-4">
          {/* Error State */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-3 rounded border border-red-300 bg-red-100 p-3 text-xs font-semibold text-red-800"
            >
              <div className="flex items-center justify-between">
                <span>{errorMessage}</span>
                <button
                  type="button"
                  onClick={fetchTodaySales}
                  className="h-10 rounded bg-red-800 px-3 text-xs font-bold text-white hover:bg-red-900"
                >
                  Muat Ulang
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-1 items-center justify-center text-xs font-bold text-slate-700">
              Memuat histori transaksi hari ini...
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !errorMessage && filteredSales.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center rounded border border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm font-bold text-slate-900">
                Belum Ada Transaksi Hari Ini
              </p>
              <p className="mt-1 text-xs text-slate-700">
                Transaksi baru yang Anda proses dan simpan akan otomatis muncul di tabel ini.
              </p>
            </div>
          )}

          {/* Table List */}
          {!isLoading && !errorMessage && filteredSales.length > 0 && (
            <div className="flex-1 overflow-y-auto rounded border border-slate-300">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-slate-300 bg-slate-100 text-[11px] font-bold text-slate-700">
                  <tr>
                    <th className="px-3 py-2">No Faktur</th>
                    <th className="px-3 py-2">Waktu WIB</th>
                    <th className="px-3 py-2">Pelanggan</th>
                    <th className="px-3 py-2 text-center">Tipe</th>
                    <th className="px-3 py-2 text-right">Grand Total</th>
                    <th className="px-3 py-2 text-center">Status</th>
                    <th className="px-3 py-2 text-center">Cetak Ulang</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredSales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono font-bold text-slate-900">
                        {s.invoice_number}
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-700">
                        {formatWibDateTime(s.sale_date)}
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-900">
                        {s.customers ? s.customers.name : "UMUM"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${
                            s.payment_type === "QRIS" || (s.notes && s.notes.includes("[QRIS]"))
                              ? "bg-blue-50 text-blue-900 border border-blue-300"
                              : s.payment_type === "TUNAI"
                              ? "bg-slate-100 text-slate-800 border border-slate-200"
                              : "bg-blue-100 text-blue-900 border border-blue-200"
                          }`}
                        >
                          {s.payment_type === "QRIS" || (s.notes && s.notes.includes("[QRIS]"))
                            ? "QRIS"
                            : s.payment_type}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold tabular-nums text-slate-900">
                        {formatRupiah(s.grand_total)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                            s.payment_status === "LUNAS"
                              ? "bg-green-100 text-green-800 border border-green-200"
                              : "bg-red-100 text-red-800 border border-red-200"
                          }`}
                        >
                          {s.payment_status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handlePrint(s, "STRUK")}
                            className="h-10 rounded bg-blue-900 px-2.5 text-xs font-bold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                          >
                            Struk
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrint(s, "FAKTUR")}
                            className="h-10 rounded border border-slate-300 bg-white px-2.5 text-xs font-bold text-blue-900 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                          >
                            Faktur
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrint(s, "SURAT_JALAN")}
                            className="h-10 rounded border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                          >
                            Surat Jalan
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
