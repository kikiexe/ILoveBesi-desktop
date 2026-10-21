import { formatRupiah } from "../utils/currency";

interface ShortcutToolbarProps {
  itemCount: number;
  totalQty: number;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  onF1: () => void;
  onF5: () => void;
  onF6: () => void;
  onF7: () => void;
  onF8: () => void;
  onF9: () => void;
  onF10: () => void;
  onF11: () => void;
  onEsc: () => void;
}

export default function ShortcutToolbar({
  itemCount,
  totalQty,
  subtotalAmount,
  discountAmount,
  taxAmount,
  grandTotal,
  onF1,
  onF5,
  onF6,
  onF7,
  onF8,
  onF9,
  onF10,
  onF11,
  onEsc,
}: ShortcutToolbarProps) {
  return (
    <footer className="border-t-2 border-slate-300 bg-white shadow-sm">
      {/* Baris Atas Toolbar: Ringkasan Nilai Finansial */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 text-xs">
        <div className="flex items-center gap-4 text-slate-700">
          <span>
            Jumlah Jenis Barang:{" "}
            <strong className="text-slate-900 font-bold tabular-nums">
              {itemCount}
            </strong>
          </span>
          <span>|</span>
          <span>
            Total Fisik:{" "}
            <strong className="text-slate-900 font-bold tabular-nums">
              {totalQty}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div>
            <span className="text-slate-700">Subtotal: </span>
            <span className="font-mono font-bold tabular-nums text-slate-900">
              {formatRupiah(subtotalAmount)}
            </span>
          </div>

          <div>
            <span className="text-slate-700">Diskon Nota: </span>
            <span className="font-mono font-bold tabular-nums text-red-700">
              - {formatRupiah(discountAmount)}
            </span>
          </div>

          {taxAmount > 0 && (
            <div>
              <span className="text-slate-700">Pajak: </span>
              <span className="font-mono font-bold tabular-nums text-slate-900">
                + {formatRupiah(taxAmount)}
              </span>
            </div>
          )}

          <div className="rounded bg-slate-100 px-3 py-1 border border-slate-300">
            <span className="text-xs font-bold text-slate-700">Grand Total: </span>
            <span className="font-mono text-base font-extrabold tabular-nums text-blue-900">
              {formatRupiah(grandTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Baris Bawah Toolbar: Tombol Pintasan Fisik F1 - F11 */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 px-3 py-2 bg-slate-50">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onF1}
            className="h-10 rounded border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
          >
            [F1] Cari Barang
          </button>

          <button
            type="button"
            onClick={onF5}
            className="h-10 rounded border border-slate-300 bg-white px-3 text-xs font-bold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
          >
            [F5] Hapus Baris
          </button>

          <button
            type="button"
            onClick={onF6}
            className="h-10 rounded border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
          >
            [F6] Batal Nota
          </button>

          <button
            type="button"
            onClick={onF8}
            className="h-10 rounded border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
          >
            [F8] Pelanggan
          </button>

          <button
            type="button"
            onClick={onF9}
            className="h-10 rounded border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
          >
            [F9] Cek Stok
          </button>

          <button
            type="button"
            onClick={onF10}
            className="h-10 rounded border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
          >
            [F10] Histori Hari Ini
          </button>

          <button
            type="button"
            onClick={onF11}
            className="h-10 rounded border border-slate-300 bg-white px-3 text-xs font-bold text-blue-900 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
          >
            [F11] Terima Cicilan
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onF7}
            className="h-10 rounded bg-blue-900 px-5 text-xs font-extrabold text-white hover:bg-blue-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
          >
            [F7] Bayar & Simpan
          </button>

          <button
            type="button"
            onClick={onEsc}
            className="h-10 rounded border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
          >
            [Esc] Tutup Kasir
          </button>
        </div>
      </div>
    </footer>
  );
}
