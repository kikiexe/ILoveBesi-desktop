import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { formatRupiah } from "../utils/currency";
import { formatWibDateTime } from "../utils/date";
import { payReceivableSchema } from "../schemas/receivable.schema";

interface InstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UnpaidSaleRow {
  id: string;
  invoice_number: string;
  sale_date: string;
  grand_total: number;
  paid_amount: number;
  remaining_debt: number;
  due_date: string | null;
  customer_id: string | null;
  customers: {
    code: string;
    name: string;
    phone: string | null;
  } | null;
}

interface PaymentHistoryItem {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  notes: string | null;
}

export default function InstallmentModal({
  isOpen,
  onClose,
}: InstallmentModalProps) {
  const [unpaidSales, setUnpaidSales] = useState<UnpaidSaleRow[]>([]);
  const [selectedSale, setSelectedSale] = useState<UnpaidSaleRow | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form input
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<"TUNAI" | "TRANSFER">("TUNAI");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchUnpaidSales = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          id,
          invoice_number,
          sale_date,
          grand_total,
          paid_amount,
          remaining_debt,
          due_date,
          customer_id,
          customers (
            code,
            name,
            phone
          )
        `)
        .eq("payment_status", "BELUM_LUNAS")
        .order("sale_date", { ascending: false });

      if (error) throw new Error(error.message);
      setUnpaidSales((data as unknown as UnpaidSaleRow[]) || []);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Gagal memuat daftar piutang belum lunas";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPaymentHistory = async (saleId: string) => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("receivable_payments")
        .select("id, payment_date, amount, payment_method, notes")
        .eq("sale_id", saleId)
        .order("payment_date", { ascending: true });

      if (error) throw new Error(error.message);
      setPaymentHistory(data || []);
    } catch {
      setPaymentHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUnpaidSales();
      setSelectedSale(null);
      setPaymentHistory([]);
      setPayAmount(0);
      setNotes("");
      setSubmitError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, fetchUnpaidSales]);

  if (!isOpen) return null;

  const handleSelectSale = (sale: UnpaidSaleRow) => {
    setSelectedSale(sale);
    setPayAmount(sale.remaining_debt); // Default to full remaining balance
    setSubmitError(null);
    setSuccessMessage(null);
    fetchPaymentHistory(sale.id);
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return;

    setSubmitError(null);
    setSuccessMessage(null);

    const validation = payReceivableSchema.safeParse({
      sale_id: selectedSale.id,
      amount: payAmount,
      payment_method: payMethod,
      notes: notes || undefined,
    });

    if (!validation.success) {
      setSubmitError(validation.error.errors[0]?.message || "Input cicilan tidak valid");
      return;
    }

    if (payAmount > selectedSale.remaining_debt) {
      setSubmitError(
        `Nominal bayar (${formatRupiah(payAmount)}) melebihi sisa piutang (${formatRupiah(selectedSale.remaining_debt)})`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc("rpc_pay_receivable", {
        p_sale_id: selectedSale.id,
        p_amount: payAmount,
        p_payment_method: payMethod,
        p_notes: notes.trim() || undefined,
      });

      if (error) throw new Error(error.message);

      setSuccessMessage(
        `Pembayaran cicilan sebesar ${formatRupiah(payAmount)} berhasil dicatat!`
      );

      // Refresh list and history
      await fetchUnpaidSales();
      await fetchPaymentHistory(selectedSale.id);

      // Update selected sale view
      const updatedRemaining = selectedSale.remaining_debt - payAmount;
      if (updatedRemaining <= 0) {
        setSelectedSale(null);
      } else {
        setSelectedSale({
          ...selectedSale,
          remaining_debt: updatedRemaining,
          paid_amount: selectedSale.paid_amount + payAmount,
        });
        setPayAmount(updatedRemaining);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Gagal memproses pembayaran cicilan piutang";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSales = unpaidSales.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const custName = s.customers?.name?.toLowerCase() || "";
    return s.invoice_number.toLowerCase().includes(q) || custName.includes(q);
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div className="flex h-[620px] w-full max-w-5xl flex-col rounded-md border border-slate-300 bg-white shadow-xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              [F11] Terima Pembayaran Cicilan Piutang
            </h2>
            <p className="text-xs text-slate-700">
              Pilih faktur jatuh tempo pelanggan untuk mencatat penerimaan uang tunai / transfer
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

        {/* Konten 2 Panel: Kiri (Daftar Faktur Belum Lunas), Kanan (Detail & Form Bayar) */}
        <div className="grid flex-1 grid-cols-12 overflow-hidden">
          {/* Panel Kiri: 5 Kolom */}
          <div className="col-span-5 flex flex-col border-r border-slate-200 p-4">
            <div className="mb-3">
              <input
                type="text"
                autoFocus
                placeholder="Cari faktur atau pelanggan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded border border-slate-300 px-3 text-xs text-slate-900 placeholder-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
              />
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="mb-2 rounded border border-red-300 bg-red-100 p-2 text-xs font-bold text-red-800"
              >
                {errorMessage}
              </div>
            )}

            {isLoading && (
              <div className="flex flex-1 items-center justify-center text-xs font-bold text-slate-700">
                Memuat daftar piutang...
              </div>
            )}

            {!isLoading && filteredSales.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center rounded border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-xs font-bold text-slate-900">
                  Tidak Ada Piutang Belum Lunas
                </p>
                <p className="mt-1 text-[11px] text-slate-700">
                  Semua transaksi kredit telah lunas atau belum ada faktur kredit.
                </p>
              </div>
            )}

            {!isLoading && filteredSales.length > 0 && (
              <div className="flex-1 overflow-y-auto rounded border border-slate-300 divide-y divide-slate-200">
                {filteredSales.map((s) => {
                  const isSelected = selectedSale?.id === s.id;

                  return (
                    <div
                      key={s.id}
                      onClick={() => handleSelectSale(s)}
                      className={`cursor-pointer p-3 transition-colors ${
                        isSelected
                          ? "bg-blue-100/70 border-l-4 border-l-blue-900"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {s.invoice_number}
                        </span>
                        <span className="text-[11px] text-slate-700 font-mono">
                          {formatWibDateTime(s.sale_date)}
                        </span>
                      </div>
                      <div className="mt-1 font-bold text-xs text-slate-900">
                        {s.customers ? s.customers.name : "UMUM"}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-slate-700">Sisa Tagihan:</span>
                        <span className="font-mono font-extrabold text-red-700 tabular-nums">
                          {formatRupiah(s.remaining_debt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Panel Kanan: 7 Kolom */}
          <div className="col-span-7 flex flex-col justify-between overflow-y-auto p-5">
            {!selectedSale ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded border border-dashed border-slate-300 p-8 text-center">
                <p className="text-sm font-bold text-slate-700">
                  Pilih Salah Satu Faktur di Panel Kiri
                </p>
                <p className="mt-1 text-xs text-slate-700">
                  Klik faktur piutang untuk melihat rincian sisa tagihan dan mencatat pembayaran cicilan.
                </p>
              </div>
            ) : (
              <form onSubmit={handleProcessPayment} className="space-y-4">
                {/* Rincian Faktur Terpilih */}
                <div className="rounded-md border border-slate-300 bg-slate-50 p-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div>
                      <span className="text-xs text-slate-700">No Faktur: </span>
                      <strong className="font-mono text-sm text-slate-900">
                        {selectedSale.invoice_number}
                      </strong>
                    </div>
                    <div>
                      <span className="text-xs text-slate-700">Pelanggan: </span>
                      <strong className="text-sm text-slate-900">
                        {selectedSale.customers?.name || "UMUM"}
                      </strong>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded bg-white p-2 border border-slate-200">
                      <div className="text-[11px] text-slate-700">Total Nota</div>
                      <div className="font-mono text-xs font-bold tabular-nums text-slate-900">
                        {formatRupiah(selectedSale.grand_total)}
                      </div>
                    </div>
                    <div className="rounded bg-white p-2 border border-slate-200">
                      <div className="text-[11px] text-slate-700">Sudah Dibayar</div>
                      <div className="font-mono text-xs font-bold tabular-nums text-green-800">
                        {formatRupiah(selectedSale.paid_amount)}
                      </div>
                    </div>
                    <div className="rounded bg-red-50 p-2 border border-red-200">
                      <div className="text-[11px] font-bold text-red-800">Sisa Piutang</div>
                      <div className="font-mono text-sm font-extrabold tabular-nums text-red-800">
                        {formatRupiah(selectedSale.remaining_debt)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Input Pembayaran */}
                <div className="space-y-3">
                  {submitError && (
                    <div
                      role="alert"
                      className="rounded border border-red-300 bg-red-100 p-2.5 text-xs font-bold text-red-800"
                    >
                      {submitError}
                    </div>
                  )}

                  {successMessage && (
                    <div
                      role="alert"
                      className="rounded border border-green-300 bg-green-100 p-2.5 text-xs font-bold text-green-800"
                    >
                      {successMessage}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor="pay-amount-input"
                        className="block text-xs font-bold text-slate-900"
                      >
                        Nominal Bayar Cicilan (Rp)
                      </label>
                      <button
                        type="button"
                        onClick={() => setPayAmount(selectedSale.remaining_debt)}
                        className="h-10 rounded border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-900 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                      >
                        Isi Penuh ({formatRupiah(selectedSale.remaining_debt)})
                      </button>
                    </div>
                    <input
                      id="pay-amount-input"
                      type="number"
                      min="1"
                      max={selectedSale.remaining_debt}
                      step="1000"
                      required
                      value={payAmount}
                      onChange={(e) =>
                        setPayAmount(Math.max(0, parseFloat(e.target.value) || 0))
                      }
                      className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-right font-mono text-sm font-extrabold tabular-nums text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="pay-method-select"
                        className="block text-xs font-bold text-slate-900"
                      >
                        Metode Pembayaran
                      </label>
                      <select
                        id="pay-method-select"
                        value={payMethod}
                        onChange={(e) =>
                          setPayMethod(e.target.value as "TUNAI" | "TRANSFER")
                        }
                        className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-2 text-xs font-bold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                      >
                        <option value="TUNAI">TUNAI (Kasir)</option>
                        <option value="TRANSFER">TRANSFER (Bank Toko)</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="pay-notes-input"
                        className="block text-xs font-bold text-slate-900"
                      >
                        Catatan Bukti / Keterangan
                      </label>
                      <input
                        id="pay-notes-input"
                        type="text"
                        placeholder="Contoh: Titipan transfer mandiri"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Histori Pembayaran Sebelumnya */}
                <div className="border-t border-slate-200 pt-3">
                  <div className="text-xs font-bold text-slate-700 mb-2">
                    Riwayat Pembayaran Sebelumnya:
                  </div>
                  {isLoadingHistory ? (
                    <div className="text-xs text-slate-700">Memuat riwayat...</div>
                  ) : paymentHistory.length === 0 ? (
                    <div className="text-xs text-slate-700 italic">
                      Belum ada catatan cicilan untuk faktur ini.
                    </div>
                  ) : (
                    <div className="max-h-28 overflow-y-auto rounded border border-slate-200">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-100 text-slate-700">
                          <tr>
                            <th className="px-2 py-1">Tanggal</th>
                            <th className="px-2 py-1">Metode</th>
                            <th className="px-2 py-1 text-right">Nominal</th>
                            <th className="px-2 py-1">Catatan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paymentHistory.map((p) => (
                            <tr key={p.id}>
                              <td className="px-2 py-1 font-mono">
                                {formatWibDateTime(p.payment_date)}
                              </td>
                              <td className="px-2 py-1 font-bold">
                                {p.payment_method}
                              </td>
                              <td className="px-2 py-1 text-right font-mono tabular-nums text-green-800">
                                {formatRupiah(p.amount)}
                              </td>
                              <td className="px-2 py-1 text-slate-700">
                                {p.notes || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
                  <button
                    type="submit"
                    disabled={isSubmitting || payAmount <= 0}
                    className="h-10 rounded bg-blue-900 px-6 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                  >
                    {isSubmitting ? "Menyimpan..." : "Simpan Pembayaran Cicilan [Enter]"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
