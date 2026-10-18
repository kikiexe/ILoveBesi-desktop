import { useState, useEffect, useCallback, useId } from "react";
import { supabase } from "../lib/supabase";
import type { CashierShift } from "../types/pos.types";
import { formatRupiah } from "../utils/currency";
import { formatWibDateTime } from "../utils/date";

interface CashierShiftModalProps {
  isOpen: boolean;
  mode: "OPEN" | "CLOSE";
  activeShift: CashierShift | null;
  onOpenShiftSuccess: (shift: CashierShift) => void;
  onCloseShiftSuccess: () => void;
  onCancelClose?: () => void;
  onLogout: () => void;
}

export default function CashierShiftModal({
  isOpen,
  mode,
  activeShift,
  onOpenShiftSuccess,
  onCloseShiftSuccess,
  onCancelClose,
  onLogout,
}: CashierShiftModalProps) {
  const nameInputId = useId();
  const cashInputId = useId();

  // Mode OPEN states
  const [cashierName, setCashierName] = useState("");
  const [openingCash, setOpeningCash] = useState<number | string>(0);

  // Mode CLOSE states
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [shiftStats, setShiftStats] = useState({
    tunai: 0,
    qris: 0,
    kredit: 0,
    total: 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch sales summary for the current shift in CLOSE mode
  const fetchShiftStats = useCallback(async (shift: CashierShift) => {
    setIsLoadingStats(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase
        .from("sales")
        .select("payment_type, grand_total, shift_id, sale_date")
        .or(`shift_id.eq.${shift.id},and(shift_id.is.null,sale_date.gte.${shift.opened_at})`);

      if (error) throw new Error(error.message);

      let tunai = 0;
      let qris = 0;
      let kredit = 0;

      for (const item of data || []) {
        const val = Number(item.grand_total || 0);
        if (item.payment_type === "QRIS") {
          qris += val;
        } else if (item.payment_type === "KREDIT") {
          kredit += val;
        } else {
          tunai += val;
        }
      }

      setShiftStats({
        tunai,
        qris,
        kredit,
        total: tunai + qris + kredit,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat rekap penjualan shift";
      setErrorMessage(msg);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      if (mode === "OPEN") {
        setCashierName("");
        setOpeningCash(0);
      } else if (mode === "CLOSE" && activeShift) {
        fetchShiftStats(activeShift);
      }
    }
  }, [isOpen, mode, activeShift, fetchShiftStats]);

  // Handle Open Shift submission
  const handleOpenShift = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cashierName.trim()) {
      setErrorMessage("Nama kasir wajib diisi");
      return;
    }

    const cashValue = Number(openingCash);
    if (isNaN(cashValue) || cashValue < 0) {
      setErrorMessage("Uang kasir saat dibuka tidak boleh bernilai negatif");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase
        .from("cashier_shifts")
        .insert({
          cashier_name: cashierName.trim(),
          opening_cash: cashValue,
          status: "OPEN",
        })
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      if (!data) throw new Error("Gagal membuat sesi buka kasir");

      onOpenShiftSuccess(data as CashierShift);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal membuka sesi kasir";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Close Shift submission
  const handleCloseShift = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeShift) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase
        .from("cashier_shifts")
        .update({
          status: "CLOSED",
          closed_at: new Date().toISOString(),
          total_tunai: shiftStats.tunai,
          total_qris: shiftStats.qris,
          total_kredit: shiftStats.kredit,
          total_sales: shiftStats.total,
        })
        .eq("id", activeShift.id);

      if (error) throw new Error(error.message);

      onCloseShiftSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menutup sesi kasir";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [activeShift, shiftStats, onCloseShiftSuccess]);

  // Keyboard shortcut listener for Enter and Escape inside modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (mode === "CLOSE" && onCancelClose) {
          e.preventDefault();
          onCancelClose();
        }
      } else if (e.key === "Enter") {
        if (mode === "CLOSE" && !isSubmitting && !isLoadingStats) {
          e.preventDefault();
          handleCloseShift();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, mode, isSubmitting, isLoadingStats, onCancelClose, handleCloseShift]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
    >
      <div className="w-full max-w-md rounded-md border border-slate-300 bg-white p-6 shadow-2xl">
        {mode === "OPEN" ? (
          <div>
            <div className="mb-4 border-b border-slate-200 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Buka Kasir (Shift Baru)</h2>
              <p className="mt-1 text-xs text-slate-600">
                Masukkan identitas kasir yang bertugas dan modal awal di laci kasir sebelum memulai transaksi.
              </p>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="mb-4 rounded border border-red-300 bg-red-50 p-2.5 text-xs text-red-800"
              >
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleOpenShift} className="space-y-4">
              <div>
                <label htmlFor={nameInputId} className="block text-xs font-bold text-slate-900 mb-1">
                  Nama Kasir Jaga <span className="text-red-700">*</span>
                </label>
                <input
                  id={nameInputId}
                  type="text"
                  autoFocus
                  required
                  placeholder="Ketik nama kasir (contoh: Budi)"
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                  className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                />
              </div>

              <div>
                <label htmlFor={cashInputId} className="block text-xs font-bold text-slate-900 mb-1">
                  Uang Kasir Saat Dibuka / Modal Awal (Rp)
                </label>
                <input
                  id={cashInputId}
                  type="number"
                  min="0"
                  step="any"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-right font-mono text-sm tabular-nums text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                />
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 w-full rounded bg-blue-900 px-4 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                >
                  {isSubmitting ? "Membuka Kasir..." : "Buka Kasir [Enter]"}
                </button>

                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-[11px] text-slate-500">Ganti akun toko terdaftar:</span>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="h-9 rounded px-3 text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                  >
                    Ganti Akun Toko (Logout)
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <div>
            <div className="mb-4 border-b border-slate-200 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Tutup Kasir (Rekap Shift)</h2>
              <p className="mt-1 text-xs text-slate-600">
                Periksa akumulasi hasil penjualan sesi ini sebelum menutup meja kasir.
              </p>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="mb-4 rounded border border-red-300 bg-red-50 p-2.5 text-xs text-red-800"
              >
                {errorMessage}
              </div>
            )}

            <div className="space-y-4">
              <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">Nama Kasir:</span>
                  <strong className="text-slate-900">{activeShift?.cashier_name || "Kasir"}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Waktu Buka:</span>
                  <span className="font-mono text-slate-700">
                    {activeShift ? formatWibDateTime(activeShift.opened_at) : ""} WIB
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-600 font-semibold">Uang Kasir Saat Dibuka:</span>
                  <span className="font-mono font-bold tabular-nums text-slate-900">
                    {formatRupiah(activeShift?.opening_cash || 0)}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Hasil Penjualan Sesi Ini
                </div>

                {isLoadingStats ? (
                  <div className="py-4 text-center text-xs text-slate-600 font-medium">
                    Menghitung rekap penjualan shift...
                  </div>
                ) : (
                  <div className="rounded border border-slate-300 bg-white divide-y divide-slate-200 text-xs">
                    <div className="flex justify-between px-3 py-2">
                      <span className="font-medium text-slate-700">1. Tunai</span>
                      <span className="font-mono font-bold tabular-nums text-right text-slate-900">
                        {formatRupiah(shiftStats.tunai)}
                      </span>
                    </div>

                    <div className="flex justify-between px-3 py-2">
                      <span className="font-medium text-slate-700">2. QRIS</span>
                      <span className="font-mono font-bold tabular-nums text-right text-slate-900">
                        {formatRupiah(shiftStats.qris)}
                      </span>
                    </div>

                    <div className="flex justify-between px-3 py-2">
                      <span className="font-medium text-slate-700">3. Kredit</span>
                      <span className="font-mono font-bold tabular-nums text-right text-slate-900">
                        {formatRupiah(shiftStats.kredit)}
                      </span>
                    </div>

                    <div className="flex justify-between px-3 py-2.5 bg-slate-50 font-bold">
                      <span className="text-blue-900 text-sm">4. Total Penjualan</span>
                      <span className="font-mono text-base font-extrabold tabular-nums text-right text-blue-900">
                        {formatRupiah(shiftStats.total)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  autoFocus={mode === "CLOSE" && !isLoadingStats}
                  disabled={isSubmitting || isLoadingStats}
                  onClick={handleCloseShift}
                  className="h-11 w-full rounded bg-red-700 px-4 text-xs font-bold text-white hover:bg-red-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                >
                  {isSubmitting ? "Menutup Kasir..." : "Tutup Kasir [Enter]"}
                </button>

                <button
                  type="button"
                  onClick={onCancelClose}
                  className="h-10 w-full rounded border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                >
                  Kembali ke Kasir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
