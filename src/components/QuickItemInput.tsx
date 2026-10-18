import {
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from "react";
import type { CashierProduct, CartItem } from "../types/pos.types";
import { formatRupiah, formatThickness } from "../utils/currency";
import { calculateItemSubtotal } from "../utils/calculation";

export interface QuickItemInputHandle {
  focusSearch: () => void;
}

interface QuickItemInputProps {
  products: CashierProduct[];
  onAddItem: (item: CartItem) => void;
  onOpenStockLookup: () => void;
}

const QuickItemInput = forwardRef<QuickItemInputHandle, QuickItemInputProps>(
  ({ products, onAddItem, onOpenStockLookup }, ref) => {
    const [query, setQuery] = useState("");
    const [selectedProduct, setSelectedProduct] =
      useState<CashierProduct | null>(null);
    const [qty, setQty] = useState<number>(1);
    const [discountPct, setDiscountPct] = useState<number>(0);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [inputError, setInputError] = useState<string | null>(null);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const qtyInputRef = useRef<HTMLInputElement>(null);
    const discountInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focusSearch: () => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      },
    }));

    // Filter products by multi-token search
    const filteredProducts = query.trim()
      ? products
          .filter((p) => {
            if (!p.is_active) return false;
            const searchTarget =
              `${p.sku || ""} ${p.name || ""} ${p.dimension || ""} ${p.thickness_mm || ""}`.toLowerCase();
            const tokens = query.toLowerCase().trim().split(/\s+/);
            return tokens.every((token) => searchTarget.includes(token));
          })
          .slice(0, 8)
      : [];

    useEffect(() => {
      setHighlightedIndex(0);
    }, [query]);

    const handleSelectProduct = (product: CashierProduct) => {
      setSelectedProduct(product);
      setQuery(`${product.sku} - ${product.name}`);
      setIsDropdownOpen(false);
      setInputError(null);
      // Move focus to Qty input
      setTimeout(() => {
        qtyInputRef.current?.focus();
        qtyInputRef.current?.select();
      }, 50);
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (filteredProducts.length > 0) {
          setIsDropdownOpen(true);
          setHighlightedIndex((prev) =>
            prev < filteredProducts.length - 1 ? prev + 1 : 0
          );
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (filteredProducts.length > 0) {
          setIsDropdownOpen(true);
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredProducts.length - 1
          );
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (
          isDropdownOpen &&
          filteredProducts.length > 0 &&
          filteredProducts[highlightedIndex]
        ) {
          handleSelectProduct(filteredProducts[highlightedIndex]);
        } else if (filteredProducts.length === 1) {
          handleSelectProduct(filteredProducts[0]);
        } else if (selectedProduct) {
          qtyInputRef.current?.focus();
          qtyInputRef.current?.select();
        }
      } else if (e.key === "Escape") {
        setIsDropdownOpen(false);
      }
    };

    const handleQtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        discountInputRef.current?.focus();
        discountInputRef.current?.select();
      }
    };

    const handleCommitItem = () => {
      if (!selectedProduct || !selectedProduct.id) {
        setInputError("Pilih barang terlebih dahulu");
        searchInputRef.current?.focus();
        return;
      }

      if (qty <= 0) {
        setInputError("Jumlah Qty minimal 1 BTG");
        qtyInputRef.current?.focus();
        return;
      }

      const availableStock = selectedProduct.stock_qty || 0;
      if (qty > availableStock) {
        setInputError(
          `Stok tidak mencukupi (Tersedia: ${availableStock} BTG, Diminta: ${qty} BTG)`
        );
        qtyInputRef.current?.focus();
        return;
      }

      const unitPrice = Number(selectedProduct.sell_price || 0);
      const subtotal = calculateItemSubtotal(qty, unitPrice, discountPct, 0);

      const newItem: CartItem = {
        product_id: selectedProduct.id,
        sku: selectedProduct.sku || "",
        name: selectedProduct.name || "",
        dimension: selectedProduct.dimension || "",
        thickness_mm: Number(selectedProduct.thickness_mm || 0),
        unit: selectedProduct.unit || "BTG",
        stock_qty: availableStock,
        qty,
        unit_price: unitPrice,
        discount_pct: discountPct,
        tax_pct: 0,
        subtotal,
      };

      onAddItem(newItem);

      // Reset form and focus back to search input
      setSelectedProduct(null);
      setQuery("");
      setQty(1);
      setDiscountPct(0);
      setInputError(null);
      setIsDropdownOpen(false);

      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    };

    const handleDiscountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleCommitItem();
      }
    };

    return (
      <div className="border-b border-slate-300 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Kolom 1: Pencarian Cerdas */}
          <div className="relative flex-1">
            <label
              htmlFor="quick-search"
              className="block text-[11px] font-bold text-slate-700"
            >
              [F1] Cari Kode / Dimensi / Tebal (Contoh: "40 1.2" atau "HG-40")
            </label>
            <input
              id="quick-search"
              ref={searchInputRef}
              type="text"
              autoComplete="off"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsDropdownOpen(true);
                setSelectedProduct(null);
                setInputError(null);
              }}
              onFocus={() => {
                if (query.trim()) setIsDropdownOpen(true);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Ketik ukuran atau tebal lalu tekan Enter..."
              className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
            />

            {/* Dropdown Hasil Pencarian Cepat */}
            {isDropdownOpen && filteredProducts.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded border border-slate-300 bg-white shadow-lg">
                {filteredProducts.map((p, index) => (
                  <li
                    key={p.id}
                    onClick={() => handleSelectProduct(p)}
                    className={`cursor-pointer border-b border-slate-100 px-3 py-2 text-xs transition-colors ${
                      index === highlightedIndex
                        ? "bg-blue-100 font-bold text-blue-900"
                        : "text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono">{p.sku}</span>
                      <span className="font-bold">{p.name}</span>
                      <span className="tabular-nums">
                        Tebal: {formatThickness(Number(p.thickness_mm))}
                      </span>
                      <span className="tabular-nums font-semibold">
                        Stok: {p.stock_qty} BTG
                      </span>
                      <span className="tabular-nums font-bold text-blue-900">
                        {formatRupiah(Number(p.sell_price))}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Kolom 2: Qty */}
          <div className="w-24">
            <label
              htmlFor="quick-qty"
              className="block text-[11px] font-bold text-slate-700"
            >
              Qty (BTG)
            </label>
            <input
              id="quick-qty"
              ref={qtyInputRef}
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
              onKeyDown={handleQtyKeyDown}
              className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-2 text-right text-sm font-bold tabular-nums text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
            />
          </div>

          {/* Kolom 3: Diskon % */}
          <div className="w-24">
            <label
              htmlFor="quick-discount"
              className="block text-[11px] font-bold text-slate-700"
            >
              Diskon (%)
            </label>
            <input
              id="quick-discount"
              ref={discountInputRef}
              type="number"
              min="0"
              max="100"
              step="any"
              value={discountPct}
              onChange={(e) =>
                setDiscountPct(
                  Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                )
              }
              onKeyDown={handleDiscountKeyDown}
              className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-2 text-right text-sm font-bold tabular-nums text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
            />
          </div>

          {/* Kolom 4: Tombol Masuk Nota & Tombol Cek Stok */}
          <div className="flex items-end gap-2 pt-5">
            <button
              type="button"
              onClick={handleCommitItem}
              className="h-10 rounded bg-blue-900 px-4 text-xs font-bold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
            >
              + Masuk [Enter]
            </button>
            <button
              type="button"
              onClick={onOpenStockLookup}
              className="h-10 rounded border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
            >
              [F9] Cek Stok
            </button>
          </div>
        </div>

        {inputError && (
          <div
            role="alert"
            className="mt-2 rounded border border-red-300 bg-red-100 px-3 py-1.5 text-xs font-bold text-red-800"
          >
            {inputError}
          </div>
        )}
      </div>
    );
  }
);

QuickItemInput.displayName = "QuickItemInput";
export default QuickItemInput;
