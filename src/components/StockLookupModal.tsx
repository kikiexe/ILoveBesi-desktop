import { useState, useMemo } from "react";
import type { CashierProduct } from "../types/pos.types";
import { formatRupiah, formatThickness } from "../utils/currency";

interface StockLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: CashierProduct[];
  isLoading: boolean;
  errorMessage: string | null;
  onRefresh: () => void;
  onSelectProduct: (product: CashierProduct) => void;
}

export default function StockLookupModal({
  isOpen,
  onClose,
  products,
  isLoading,
  errorMessage,
  onRefresh,
  onSelectProduct,
}: StockLookupModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDimension, setSelectedDimension] = useState<string>("ALL");

  // Extract unique dimensions for filter pills
  const availableDimensions = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.dimension) set.add(p.dimension);
    });
    return Array.from(set).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.is_active) return false;
      if (selectedDimension !== "ALL" && p.dimension !== selectedDimension) {
        return false;
      }
      if (!searchQuery.trim()) return true;

      const target =
        `${p.sku || ""} ${p.name || ""} ${p.dimension || ""} ${p.thickness_mm || ""}`.toLowerCase();
      const tokens = searchQuery.toLowerCase().trim().split(/\s+/);
      return tokens.every((token) => target.includes(token));
    });
  }, [products, selectedDimension, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div className="flex h-[600px] w-full max-w-4xl flex-col rounded-md border border-slate-300 bg-white shadow-xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              [F9] Katalog Stok & Harga Jual
            </h2>
            <p className="text-xs text-slate-700">
              Cek ketersediaan fisik stok gudang dan harga satuan resmi
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
        <div className="space-y-2 border-b border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              autoFocus
              placeholder="Cari SKU, nama barang, ukuran, atau ketebalan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 flex-1 rounded border border-slate-300 bg-white px-3 text-xs text-slate-900 placeholder-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
            />
            <button
              type="button"
              onClick={onRefresh}
              className="h-10 rounded border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
            >
              Segarkan Data
            </button>
          </div>

          {/* Dimensi Filter Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-bold text-slate-700 mr-1">
              Dimensi:
            </span>
            <button
              type="button"
              onClick={() => setSelectedDimension("ALL")}
              className={`h-10 rounded px-3 text-xs font-bold transition-colors inline-flex items-center justify-center ${
                selectedDimension === "ALL"
                  ? "bg-blue-900 text-white"
                  : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
              }`}
            >
              Semua
            </button>
            {availableDimensions.map((dim) => (
              <button
                key={dim}
                type="button"
                onClick={() => setSelectedDimension(dim)}
                className={`h-10 rounded px-3 text-xs font-bold transition-colors inline-flex items-center justify-center ${
                  selectedDimension === dim
                    ? "bg-blue-900 text-white"
                    : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                }`}
              >
                {dim}
              </button>
            ))}
          </div>
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
                  onClick={onRefresh}
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
              Memuat data katalog stok...
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !errorMessage && filteredProducts.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center rounded border border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm font-bold text-slate-900">
                Tidak Ada Produk yang Cocok
              </p>
              <p className="mt-1 text-xs text-slate-700">
                Coba ubah kata kunci pencarian atau pilih filter dimensi "Semua".
              </p>
            </div>
          )}

          {/* Table List */}
          {!isLoading && !errorMessage && filteredProducts.length > 0 && (
            <div className="flex-1 overflow-y-auto rounded border border-slate-300">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-slate-300 bg-slate-100 text-[11px] font-bold text-slate-700">
                  <tr>
                    <th className="px-3 py-2">SKU</th>
                    <th className="px-3 py-2">Nama Barang</th>
                    <th className="px-3 py-2">Dimensi</th>
                    <th className="px-3 py-2 text-right">Tebal</th>
                    <th className="px-3 py-2 text-right">Stok Fisik</th>
                    <th className="px-3 py-2 text-right">Harga Jual</th>
                    <th className="px-3 py-2 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredProducts.map((p) => {
                    const isLowStock = (p.stock_qty || 0) <= 20;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono font-bold text-slate-900">
                          {p.sku}
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-900">
                          {p.name}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{p.dimension}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-900">
                          {formatThickness(Number(p.thickness_mm))}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                              isLowStock
                                ? "bg-red-100 text-red-800 border border-red-200"
                                : "text-slate-900"
                            }`}
                          >
                            {p.stock_qty} {p.unit || "BTG"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold tabular-nums text-blue-900">
                          {formatRupiah(Number(p.sell_price))}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectProduct(p);
                              onClose();
                            }}
                            className="h-10 rounded bg-blue-900 px-3 text-xs font-bold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                          >
                            + Pilih ke Nota
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
