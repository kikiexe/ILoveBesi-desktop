import { useState, useEffect } from "react";
import type { Customer } from "../types/pos.types";
import { formatRupiah } from "../utils/currency";
import { formatWibDateTime } from "../utils/date";

interface PosHeaderProps {
  cashierName: string;
  cashierRole: string;
  userEmail?: string;
  selectedCustomer: Customer | null;
  grandTotal: number;
  storeName?: string;
  appVersion?: string;
  onOpenCustomerModal: () => void;
  onOpenSettings?: () => void;
  onLogoutRequest?: () => void;
}

export default function PosHeader({
  cashierName,
  cashierRole,
  userEmail,
  selectedCustomer,
  grandTotal,
  storeName,
  appVersion,
  onOpenCustomerModal,
  onOpenSettings,
}: PosHeaderProps) {
  const [currentDateTime, setCurrentDateTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      setCurrentDateTime(formatWibDateTime(new Date().toISOString()));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="flex h-20 w-full items-stretch justify-between border-b border-slate-300 bg-white px-4 py-2">
      {/* Kolom Kiri: Info Toko & Jam */}
      <div className="flex flex-col justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-slate-900">
            {storeName || "ILuvBesi"}
          </span>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
            Kasir POS
          </span>
          <span
            className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-mono font-bold text-blue-900 border border-blue-200"
            title="Versi Rilis Aplikasi Desktop POS"
          >
            v{appVersion || "1.1.5"}
          </span>
          <span className="text-xs font-mono font-medium text-slate-700">
            No: Otomatis saat simpan
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-700">
          <span className="font-mono">{currentDateTime} WIB</span>
          <span>|</span>
          <span>
            Kasir: <strong className="text-slate-900">{cashierName}</strong>
            {userEmail ? ` (${userEmail})` : ` (${cashierRole})`}
          </span>
        </div>
      </div>

      {/* Kolom Tengah: Info Pelanggan Terpilih */}
      <div className="flex items-center gap-3 px-4">
        <div className="rounded border border-slate-300 bg-slate-50 px-3 py-1.5 text-left">
          <div className="text-[11px] font-semibold text-slate-700">Pelanggan Aktif:</div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">
              {selectedCustomer ? selectedCustomer.name : "UMUM"}
            </span>
            {selectedCustomer && (
              <span className="rounded bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-900 border border-blue-200">
                Limit: {formatRupiah(selectedCustomer.credit_limit)}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenCustomerModal}
          className="h-10 rounded border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
        >
          [F8] Pelanggan
        </button>

        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            title="[F12] Pengaturan Toko & POS"
            aria-label="Pengaturan Toko & POS"
            className="flex h-10 w-10 items-center justify-center rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        )}
      </div>

      {/* Kolom Kanan: Kotak Grand Total Besar */}
      <div className="flex items-center">
        <div className="flex h-full min-w-65 flex-col justify-center rounded-md bg-blue-900 px-4 py-1 text-right text-white">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-blue-200">
            Total Tagihan
          </span>
          <span className="text-3xl font-extrabold tracking-tight tabular-nums">
            {formatRupiah(grandTotal)}
          </span>
        </div>
      </div>
    </header>
  );
}
