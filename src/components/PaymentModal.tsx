import React, { useState, useEffect } from "react";
import type { Customer, CartItem, PrintDocumentData } from "../types/pos.types";
import type { PosSettings } from "../types/settings.types";
import { supabase } from "../lib/supabase";
import { formatRupiah } from "../utils/currency";
import { getDefaultDueDateString } from "../utils/date";
import { createSaleSchema } from "../schemas/sale.schema";
import { generateReceiptPdf, generateInvoicePdf } from "../utils/pdfReceipt";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  customer: Customer | null;
  cashierName: string;
  initialSubtotal: number;
  settings?: PosSettings;
  onOpenCustomerModal: () => void;
  onSaleCompleted: () => void;
  onTriggerPrint: (docData: PrintDocumentData) => void;
}

interface SavedSaleResult {
  sale_id: string;
  invoice_number: string;
  sale_date: string;
  payment_type: "TUNAI" | "QRIS" | "KREDIT";
  payment_status: "LUNAS" | "BELUM_LUNAS";
  grand_total: number;
  paid_amount: number;
  remaining_debt: number;
  due_date?: string | null;
  notes?: string | null;
}

interface SavedSaleSnapshot {
  result: SavedSaleResult;
  items: CartItem[];
  customer: Customer | null;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
}

export type PpnOption = "NON_PPN" | "INCLUDE_PPN" | "EXCLUDE_PPN";

export default function PaymentModal({
  isOpen,
  onClose,
  items,
  customer,
  cashierName,
  initialSubtotal,
  settings,
  onOpenCustomerModal,
  onSaleCompleted,
  onTriggerPrint,
}: PaymentModalProps) {
  const [paymentType, setPaymentType] = useState<"TUNAI" | "QRIS" | "KREDIT">("TUNAI");
  const [showPpnOnReceipt, setShowPpnOnReceipt] = useState<boolean>(true);
  const [qrisRef, setQrisRef] = useState<string>("");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [downPayment, setDownPayment] = useState<number>(0);
  const [dueDate, setDueDate] = useState<string>(getDefaultDueDateString(30));
  const [notes, setNotes] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedSale, setSavedSale] = useState<SavedSaleResult | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<SavedSaleSnapshot | null>(null);

  // Recalculate totals with Item-Level PPN handling (prices are inclusive of PPN)
  const ppnEligibleSubtotal = items
    .filter((it) => it.include_ppn)
    .reduce((sum, it) => sum + it.subtotal, 0);

  // Apply discount proportionally to eligible items
  const discountFactor = initialSubtotal > 0 ? Math.max(0, 1 - discountAmount / initialSubtotal) : 1;
  const netPpnEligibleSubtotal = ppnEligibleSubtotal * discountFactor;
  const calculatedTaxAmount = netPpnEligibleSubtotal > 0
    ? Math.round(netPpnEligibleSubtotal - netPpnEligibleSubtotal / 1.11)
    : 0;

  const taxAmount = showPpnOnReceipt ? calculatedTaxAmount : 0;
  const grandTotal = Math.max(0, initialSubtotal - discountAmount);
  const changeAmount = Math.max(0, cashReceived - grandTotal);
  const remainingDebt = Math.max(0, grandTotal - downPayment);

  // Re-initialize form exclusively when modal opens
  useEffect(() => {
    if (isOpen) {
      setPaymentType("TUNAI");
      setShowPpnOnReceipt(
        settings?.defaultShowPpn !== false && items.some((it) => it.include_ppn)
      );
      setQrisRef("");
      setDiscountAmount(0);
      setCashReceived(initialSubtotal);
      setDownPayment(0);
      setDueDate(getDefaultDueDateString(30));
      setNotes("");
      setErrorMessage(null);
      setSavedSale(null);
      setSavedSnapshot(null);
    }
  }, [isOpen, initialSubtotal, items, settings?.defaultShowPpn]);

  // Keep cashReceived updated when total changes if using exact cash
  useEffect(() => {
    if (paymentType === "TUNAI") {
      setCashReceived(grandTotal);
    }
  }, [grandTotal, paymentType]);

  if (!isOpen) return null;

  const handleUangPas = () => {
    setCashReceived(grandTotal);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (items.length === 0) {
      setErrorMessage("Tidak ada barang untuk dijual");
      return;
    }

    if (paymentType === "KREDIT" && !customer) {
      setErrorMessage("Transaksi KREDIT wajib memilih data pelanggan");
      return;
    }

    if (paymentType === "TUNAI" && cashReceived < grandTotal) {
      setErrorMessage(
        `Uang diterima (${formatRupiah(cashReceived)}) kurang dari total tagihan (${formatRupiah(grandTotal)})`
      );
      return;
    }

    if (paymentType === "KREDIT" && downPayment >= grandTotal) {
      setErrorMessage(
        "DP pada transaksi kredit tidak boleh sama dengan atau melebihi total tagihan"
      );
      return;
    }

    // Validate payload with Zod
    const payloadItems = items.map((it) => ({
      product_id: it.product_id,
      qty: it.qty,
      unit_price: it.unit_price,
      discount_pct: it.discount_pct,
      tax_pct: it.tax_pct,
    }));

    const effectiveNotes =
      paymentType === "QRIS" && qrisRef.trim()
        ? `[QRIS Ref: ${qrisRef.trim()}] ${notes.trim()}`.trim()
        : paymentType === "QRIS"
        ? `[QRIS] ${notes.trim()}`.trim()
        : notes.trim();

    const validation = createSaleSchema.safeParse({
      payment_type: paymentType,
      customer_id: customer?.id || undefined,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      paid_amount: paymentType === "KREDIT" ? downPayment : grandTotal,
      due_date: paymentType === "KREDIT" ? dueDate : undefined,
      notes: effectiveNotes || undefined,
      items: payloadItems,
    });

    if (!validation.success) {
      setErrorMessage(validation.error.errors[0]?.message || "Input tidak valid");
      return;
    }

    setIsSubmitting(true);
    try {
      let res: SavedSaleResult;
      const { data, error } = await supabase.rpc("rpc_create_sale", {
        p_payment_type: paymentType,
        p_customer_id: customer?.id || undefined,
        p_discount_amount: discountAmount,
        p_tax_amount: taxAmount,
        p_paid_amount: paymentType === "KREDIT" ? downPayment : grandTotal,
        p_due_date: paymentType === "KREDIT" ? dueDate : undefined,
        p_notes: effectiveNotes || undefined,
        p_items: payloadItems,
      });

      if (error) {
        // Fallback jika constraint DB cloud belum menjalankan migrasi QRIS
        if (paymentType === "QRIS" && error.message.toLowerCase().includes("tidak valid")) {
          const fallbackNotes = effectiveNotes.startsWith("[QRIS]")
            ? effectiveNotes
            : `[QRIS] ${effectiveNotes}`.trim();
          const { data: fbData, error: fbError } = await supabase.rpc("rpc_create_sale", {
            p_payment_type: "TUNAI",
            p_customer_id: customer?.id || undefined,
            p_discount_amount: discountAmount,
            p_tax_amount: taxAmount,
            p_paid_amount: grandTotal,
            p_due_date: undefined,
            p_notes: fallbackNotes || undefined,
            p_items: payloadItems,
          });
          if (fbError) throw new Error(fbError.message);
          res = {
            ...(fbData as unknown as SavedSaleResult),
            payment_type: "QRIS",
          };
        } else {
          throw new Error(error.message);
        }
      } else {
        res = data as unknown as SavedSaleResult;
      }

      // Preserve snapshot before onSaleCompleted empties active cart items in App state
      setSavedSnapshot({
        result: res,
        items: [...items],
        customer,
        subtotalAmount: initialSubtotal,
        discountAmount,
        taxAmount,
      });

      setSavedSale(res);
      onSaleCompleted();

      if (settings?.autoPrintReceipt) {
        onTriggerPrint({
          mode: "STRUK",
          invoice_number: res.invoice_number,
          sale_date: res.sale_date,
          customer: customer
            ? {
                code: customer.code,
                name: customer.name,
                phone: customer.phone,
                address: customer.address,
              }
            : null,
          cashier_name: cashierName,
          payment_type: res.payment_type,
          payment_status: res.payment_status,
          items: items.map((it) => ({
            sku: it.sku,
            name: it.name,
            dimension: it.dimension,
            thickness_mm: it.thickness_mm,
            unit: it.unit,
            qty: it.qty,
            unit_price: it.unit_price,
            discount_pct: it.discount_pct,
            subtotal: it.subtotal,
            include_ppn: it.include_ppn,
          })),
          subtotal_amount: initialSubtotal,
          discount_amount: discountAmount,
          tax_amount: taxAmount,
          grand_total: res.grand_total,
          paid_amount: res.paid_amount,
          remaining_debt: res.remaining_debt,
          due_date: res.due_date,
          notes: res.notes,
          settings,
        });
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Gagal memproses transaksi penjualan";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDocData = (mode: "FAKTUR" | "SURAT_JALAN" | "STRUK"): PrintDocumentData | null => {
    if (!savedSnapshot) return null;

    return {
      mode,
      invoice_number: savedSnapshot.result.invoice_number,
      sale_date: savedSnapshot.result.sale_date,
      customer: savedSnapshot.customer
        ? {
            code: savedSnapshot.customer.code,
            name: savedSnapshot.customer.name,
            phone: savedSnapshot.customer.phone,
            address: savedSnapshot.customer.address,
          }
        : null,
      cashier_name: cashierName,
      payment_type: savedSnapshot.result.payment_type,
      payment_status: savedSnapshot.result.payment_status,
      items: savedSnapshot.items.map((it) => ({
        sku: it.sku,
        name: it.name,
        dimension: it.dimension,
        thickness_mm: it.thickness_mm,
        unit: it.unit,
        qty: it.qty,
        unit_price: it.unit_price,
        discount_pct: it.discount_pct,
        subtotal: it.subtotal,
        include_ppn: it.include_ppn,
      })),
      subtotal_amount: savedSnapshot.subtotalAmount,
      discount_amount: savedSnapshot.discountAmount,
      tax_amount: savedSnapshot.taxAmount,
      grand_total: savedSnapshot.result.grand_total,
      paid_amount: savedSnapshot.result.paid_amount,
      remaining_debt: savedSnapshot.result.remaining_debt,
      due_date: savedSnapshot.result.due_date,
      notes: savedSnapshot.result.notes,
      settings,
    };
  };

  const handlePrintDocument = (mode: "FAKTUR" | "SURAT_JALAN" | "STRUK") => {
    const docData = getDocData(mode);
    if (docData) onTriggerPrint(docData);
  };

  const handleDownloadReceiptPdf = () => {
    const docData = getDocData("STRUK");
    if (docData) generateReceiptPdf(docData);
  };

  const handleDownloadInvoicePdf = () => {
    const docData = getDocData("FAKTUR");
    if (docData) generateInvoicePdf(docData);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div className="flex w-full max-w-xl flex-col rounded-md border border-slate-300 bg-white shadow-xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              [F7] Proses Pembayaran & Simpan Nota
            </h2>
            <p className="text-xs text-slate-700">
              Pilih metode bayar Tunai atau Kredit, hitung kembalian / sisa piutang
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

        {/* State Berhasil Simpan */}
        {savedSale ? (
          <div className="p-6 text-center">
            <div className="rounded-md border border-green-300 bg-green-50 p-5">
              <span className="rounded bg-green-800 px-2.5 py-0.5 text-xs font-bold text-white uppercase">
                Sukses Tersimpan
              </span>
              <h3 className="mt-3 text-xl font-mono font-bold text-slate-900">
                {savedSale.invoice_number}
              </h3>
              <p className="mt-1 text-xs text-slate-700">
                Transaksi penjualan berhasil diproses ke database dan stok berkurang otomatis.
              </p>

              <div className="mt-4 flex items-center justify-around rounded bg-white p-3 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-700">Total: </span>
                  <strong className="font-mono text-sm tabular-nums text-slate-900">
                    {formatRupiah(savedSale.grand_total)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-700">Status: </span>
                  <strong className="font-bold text-slate-900">
                    {savedSale.payment_status}
                  </strong>
                </div>
                {savedSale.payment_type === "TUNAI" && (
                  <div>
                    <span className="text-slate-700">Kembalian: </span>
                    <strong className="font-mono text-sm tabular-nums text-green-800">
                      {formatRupiah(changeAmount)}
                    </strong>
                  </div>
                )}
                {savedSale.payment_type === "QRIS" && (
                  <div>
                    <span className="text-slate-700">Metode: </span>
                    <strong className="rounded bg-blue-50 px-2 py-0.5 font-bold text-blue-900 border border-blue-300">
                      QRIS LUNAS
                    </strong>
                  </div>
                )}
                {savedSale.payment_type === "KREDIT" && (
                  <div>
                    <span className="text-slate-700">Sisa Piutang: </span>
                    <strong className="font-mono text-sm tabular-nums text-red-800">
                      {formatRupiah(savedSale.remaining_debt)}
                    </strong>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handlePrintDocument("STRUK")}
                className="h-10 rounded bg-blue-900 px-4 text-xs font-bold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
              >
                Cetak Struk (Printer)
              </button>

              <button
                type="button"
                onClick={handleDownloadReceiptPdf}
                className="h-10 rounded border border-blue-900 bg-blue-50 px-4 text-xs font-bold text-blue-900 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
              >
                Unduh Struk (PDF)
              </button>

              <button
                type="button"
                onClick={() => handlePrintDocument("FAKTUR")}
                className="h-10 rounded border border-slate-300 bg-white px-4 text-xs font-bold text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
              >
                Cetak Faktur A4
              </button>

              <button
                type="button"
                onClick={handleDownloadInvoicePdf}
                className="h-10 rounded border border-slate-300 bg-white px-4 text-xs font-bold text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
              >
                Unduh Faktur (PDF)
              </button>

              <button
                type="button"
                onClick={() => handlePrintDocument("SURAT_JALAN")}
                className="h-10 rounded border border-slate-300 bg-white px-4 text-xs font-bold text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
              >
                Surat Jalan
              </button>

              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded bg-slate-800 px-4 text-xs font-bold text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
              >
                Transaksi Baru [Esc]
              </button>
            </div>
          </div>
        ) : (
          /* Form Input Pembayaran */
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {errorMessage && (
              <div
                role="alert"
                className="rounded border border-red-300 bg-red-100 p-2.5 text-xs font-bold text-red-800"
              >
                {errorMessage}
              </div>
            )}

            {/* Kotak Peringatan Pelanggan Kredit */}
            {paymentType === "KREDIT" && !customer && (
              <div className="flex items-center justify-between rounded border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
                <span>Pelanggan belum dipilih! Penjualan kredit wajib memiliki data pelanggan.</span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCustomerModal();
                  }}
                  className="h-10 rounded bg-amber-800 px-4 text-xs font-bold text-white hover:bg-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-900"
                >
                  [F8] Pilih Pelanggan
                </button>
              </div>
            )}

            {/* Pilihan Metode Bayar */}
            <div>
              <div className="text-xs font-bold text-slate-900 mb-1.5">
                Metode Pembayaran:
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentType("TUNAI")}
                  className={`h-11 rounded border-2 text-xs font-bold transition-colors ${
                    paymentType === "TUNAI"
                      ? "border-blue-900 bg-blue-50 text-blue-900"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  TUNAI (Cash)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType("QRIS")}
                  className={`h-11 rounded border-2 text-xs font-bold transition-colors ${
                    paymentType === "QRIS"
                      ? "border-blue-900 bg-blue-50 text-blue-900"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  QRIS (Non-Tunai)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType("KREDIT")}
                  className={`h-11 rounded border-2 text-xs font-bold transition-colors ${
                    paymentType === "KREDIT"
                      ? "border-blue-900 bg-blue-50 text-blue-900"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  KREDIT (Tempo)
                </button>
              </div>
            </div>

            {/* Ringkasan Subtotal & Diskon Tambahan Nota */}
            <div className="grid grid-cols-2 gap-3 rounded border border-slate-200 bg-slate-50 p-3">
              <div>
                <span className="text-xs text-slate-700">Subtotal Barang:</span>
                <div className="font-mono text-sm font-bold tabular-nums text-slate-900">
                  {formatRupiah(initialSubtotal)}
                </div>
              </div>

              <div>
                <label
                  htmlFor="payment-discount"
                  className="block text-xs font-bold text-slate-900"
                >
                  Diskon Ekstra Nota (Rp) [Opsional]
                </label>
                <input
                  id="payment-discount"
                  type="number"
                  min="0"
                  step="any"
                  value={discountAmount}
                  onChange={(e) =>
                    setDiscountAmount(
                      Math.max(0, parseFloat(e.target.value) || 0)
                    )
                  }
                  className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-2 text-right font-mono text-xs font-bold tabular-nums text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                />
              </div>
            </div>

            {/* Pengaturan Keterangan PPN di Nota / Struk */}
            <div className="rounded border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Tampilkan Rincian PPN di Nota / Struk
                  </div>
                  <div className="text-[11px] text-slate-600">
                    {ppnEligibleSubtotal > 0
                      ? `Dihitung otomatis dari ${items.filter((it) => it.include_ppn).length} barang berstatus PPN`
                      : "Semua barang di keranjang berstatus Non-PPN"}
                  </div>
                </div>

                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={showPpnOnReceipt}
                    onChange={(e) => setShowPpnOnReceipt(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-slate-300 peer-checked:bg-blue-900 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-900 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
                </label>
              </div>

              {showPpnOnReceipt && calculatedTaxAmount > 0 && (
                <div className="mt-2.5 flex items-center justify-between border-t border-slate-200 pt-2 text-xs">
                  <span className="text-slate-700">Termasuk PPN 11%:</span>
                  <span className="font-mono font-bold text-blue-900">
                    {formatRupiah(calculatedTaxAmount)}
                  </span>
                </div>
              )}
            </div>

            {/* Total Tagihan Bersih */}
            <div className="flex items-center justify-between rounded bg-blue-900 p-3 text-white">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
                Total Tagihan Bersih
              </span>
              <span className="font-mono text-2xl font-extrabold tabular-nums">
                {formatRupiah(grandTotal)}
              </span>
            </div>

            {/* Form Khusus TUNAI */}
            {paymentType === "TUNAI" && (
              <div className="space-y-3 rounded border border-slate-300 bg-white p-3">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="cash-received-input"
                    className="block text-xs font-bold text-slate-900"
                  >
                    Uang Diterima dari Pembeli (Rp)
                  </label>
                  <button
                    type="button"
                    onClick={handleUangPas}
                    className="h-10 rounded border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-900 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                  >
                    Uang Pas ({formatRupiah(grandTotal)})
                  </button>
                </div>
                <input
                  id="cash-received-input"
                  type="number"
                  min="0"
                  step="any"
                  autoFocus
                  required
                  value={cashReceived}
                  onChange={(e) =>
                    setCashReceived(
                      Math.max(0, parseFloat(e.target.value) || 0)
                    )
                  }
                  className="h-11 w-full rounded border border-slate-300 px-3 text-right font-mono text-lg font-extrabold tabular-nums text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                />

                <div className="flex items-center justify-between rounded bg-slate-100 p-2 text-sm border border-slate-200">
                  <span className="text-xs font-bold text-slate-700">
                    Kembalian:
                  </span>
                  <span className="font-mono text-lg font-extrabold tabular-nums text-green-800">
                    {formatRupiah(changeAmount)}
                  </span>
                </div>
              </div>
            )}

            {/* Form Khusus QRIS */}
            {paymentType === "QRIS" && (
              <div className="space-y-3 rounded border border-blue-200 bg-blue-50/50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-blue-900">
                      Pembayaran QRIS (Lunas Seketika)
                    </span>
                    <p className="text-[11px] text-slate-600">
                      Pastikan pembeli telah memindai QRIS toko dan dana berhasil masuk
                    </p>
                  </div>
                  <span className="rounded bg-blue-100 px-2.5 py-1 font-mono text-xs font-bold text-blue-900 border border-blue-300">
                    LUNAS {formatRupiah(grandTotal)}
                  </span>
                </div>

                <div>
                  <label
                    htmlFor="qris-ref-input"
                    className="block text-xs font-bold text-slate-900"
                  >
                    Nomor Referensi / Approval QRIS (Opsional)
                  </label>
                  <input
                    id="qris-ref-input"
                    type="text"
                    placeholder="Contoh: RRN / Kode Referensi m-banking"
                    value={qrisRef}
                    onChange={(e) => setQrisRef(e.target.value)}
                    className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-3 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                  />
                </div>
              </div>
            )}

            {/* Form Khusus KREDIT */}
            {paymentType === "KREDIT" && (
              <div className="space-y-3 rounded border border-slate-300 bg-white p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="down-payment-input"
                      className="block text-xs font-bold text-slate-900"
                    >
                      Uang Muka / DP (Rp)
                    </label>
                    <input
                      id="down-payment-input"
                      type="number"
                      min="0"
                      step="any"
                      value={downPayment}
                      onChange={(e) =>
                        setDownPayment(
                          Math.max(0, parseFloat(e.target.value) || 0)
                        )
                      }
                      className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-right font-mono text-xs font-bold tabular-nums text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="due-date-input"
                      className="block text-xs font-bold text-slate-900"
                    >
                      Tanggal Jatuh Tempo (WIB)
                    </label>
                    <input
                      id="due-date-input"
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-xs font-mono font-bold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded bg-red-50 p-2 text-xs border border-red-200">
                  <span className="font-bold text-red-800">
                    Sisa Piutang Berjalan:
                  </span>
                  <span className="font-mono text-base font-extrabold tabular-nums text-red-800">
                    {formatRupiah(remainingDebt)}
                  </span>
                </div>
              </div>
            )}

            {/* Catatan Transaksi */}
            <div>
              <label
                htmlFor="sale-notes-input"
                className="block text-xs font-bold text-slate-900"
              >
                Catatan Faktur (Opsional)
              </label>
              <input
                id="sale-notes-input"
                type="text"
                placeholder="Contoh: Titip di tukang las Pak Joko"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
              />
            </div>

            {/* Tombol Simpan */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="h-11 rounded border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Batal [Esc]
              </button>

              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  items.length === 0 ||
                  (paymentType === "TUNAI" && cashReceived < grandTotal) ||
                  (paymentType === "KREDIT" && !customer)
                }
                className="h-11 rounded bg-blue-900 px-6 text-sm font-extrabold text-white hover:bg-blue-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
              >
                {isSubmitting ? "Menyimpan Transaksi..." : "Simpan & Cetak [Enter]"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
