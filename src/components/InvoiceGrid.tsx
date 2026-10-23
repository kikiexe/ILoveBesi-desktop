import type { CartItem } from "../types/pos.types";
import { formatRupiah, formatThickness } from "../utils/currency";

interface InvoiceGridProps {
  items: CartItem[];
  selectedRowIndex: number;
  onSelectRow: (index: number) => void;
  onUpdateItemQty: (index: number, newQty: number) => void;
  onUpdateItemDiscount: (index: number, newDiscountPct: number) => void;
  onRemoveItem: (index: number) => void;
}

export default function InvoiceGrid({
  items,
  selectedRowIndex,
  onSelectRow,
  onUpdateItemQty,
  onUpdateItemDiscount,
  onRemoveItem,
}: InvoiceGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center border-b border-slate-300 bg-white p-8 text-center">
        <div className="max-w-md rounded-md border border-slate-200 bg-slate-50 p-6">
          <p className="text-base font-bold text-slate-900">
            Faktur Penjualan Masih Kosong
          </p>
          <p className="mt-2 text-xs text-slate-700">
            Ketik ukuran atau tebal pada kotak input di atas (contoh:{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-bold font-mono text-blue-900 border border-slate-300">
              40 1.2
            </code>
            ) lalu tekan <kbd className="font-bold">Enter</kbd>, atau tekan{" "}
            <kbd className="font-bold">[F9]</kbd> untuk memilih dari katalog stok.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto border-b border-slate-300 bg-white">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="sticky top-0 z-10 border-b border-slate-300 bg-slate-100 text-[11px] font-bold text-slate-700">
          <tr>
            <th className="w-12 px-3 py-2.5 text-center">No</th>
            <th className="w-28 px-3 py-2.5">SKU</th>
            <th className="px-3 py-2.5">Nama Barang & Ukuran</th>
            <th className="w-24 px-3 py-2.5 text-right">Tebal</th>
            <th className="w-24 px-3 py-2.5 text-right">Stok</th>
            <th className="w-28 px-3 py-2.5 text-right">Qty</th>
            <th className="w-32 px-3 py-2.5 text-right">Harga Satuan</th>
            <th className="w-28 px-3 py-2.5 text-right">Diskon (%)</th>
            <th className="w-36 px-3 py-2.5 text-right">Subtotal</th>
            <th className="w-24 px-3 py-2.5 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {items.map((item, index) => {
            const isSelected = index === selectedRowIndex;

            return (
              <tr
                key={`${item.product_id}-${index}`}
                onClick={() => onSelectRow(index)}
                className={`cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-blue-100/70 border-l-4 border-l-blue-900 font-medium"
                    : "hover:bg-slate-50"
                }`}
              >
                <td className="px-3 py-2 text-center font-mono tabular-nums text-slate-700">
                  {index + 1}
                </td>
                <td className="px-3 py-2 font-mono font-bold text-slate-900">
                  {item.sku}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900">{item.name}</span>
                    {item.include_ppn ? (
                      <span className="inline-flex items-center rounded bg-blue-100 px-1.5 py-0.2 text-[10px] font-bold text-blue-800 border border-blue-200">
                        PPN
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-medium text-slate-500 border border-slate-200">
                        Non-PPN
                      </span>
                    )}
                  </div>
                  {item.dimension && item.dimension !== "-" && (
                    <div className="text-[11px] text-slate-700">
                      Dimensi: {item.dimension}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-900">
                  {item.thickness_mm > 0 ? formatThickness(item.thickness_mm) : "-"}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">
                  {item.stock_qty} {item.unit}
                </td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    min="1"
                    max={item.stock_qty}
                    value={item.qty}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      onUpdateItemQty(index, Number.isNaN(val) ? 1 : val);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="h-10 w-20 rounded border border-slate-300 bg-white px-2 text-right font-mono text-sm font-bold tabular-nums text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                  />
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-900">
                  {formatRupiah(item.unit_price)}
                </td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={item.discount_pct}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      onUpdateItemDiscount(index, Number.isNaN(val) ? 0 : val);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="h-10 w-20 rounded border border-slate-300 bg-white px-2 text-right font-mono text-sm font-bold tabular-nums text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                  />
                </td>
                <td className="px-3 py-2 text-right font-mono text-sm font-bold tabular-nums text-blue-900">
                  {formatRupiah(item.subtotal)}
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveItem(index);
                    }}
                    className="h-10 rounded border border-red-300 bg-white px-2 text-[11px] font-bold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                  >
                    Hapus [F5]
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
