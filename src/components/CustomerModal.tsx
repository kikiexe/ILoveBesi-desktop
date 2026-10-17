import React, { useState, useEffect, useCallback } from "react";
import type { Customer } from "../types/pos.types";
import { supabase } from "../lib/supabase";
import { customerSchema } from "../schemas/customer.schema";
import { formatRupiah } from "../utils/currency";

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: Customer | null) => void;
  currentCustomer: Customer | null;
}

export default function CustomerModal({
  isOpen,
  onClose,
  onSelectCustomer,
  currentCustomer,
}: CustomerModalProps) {
  const [activeTab, setActiveTab] = useState<"SELECT" | "CREATE">("SELECT");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form tambah pelanggan
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newCreditLimit, setNewCreditLimit] = useState<number>(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw new Error(error.message);
      setCustomers(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat data pelanggan";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
      setActiveTab("SELECT");
      setSearchQuery("");
      setFormError(null);
    }
  }, [isOpen, fetchCustomers]);

  if (!isOpen) return null;

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q))
    );
  });

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validation = customerSchema.safeParse({
      code: newCode,
      name: newName,
      phone: newPhone || undefined,
      address: newAddress || undefined,
      credit_limit: newCreditLimit,
    });

    if (!validation.success) {
      setFormError(validation.error.errors[0]?.message || "Input tidak valid");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          code: newCode.trim(),
          name: newName.trim(),
          phone: newPhone.trim() || null,
          address: newAddress.trim() || null,
          credit_limit: newCreditLimit,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Auto select the newly created customer
      onSelectCustomer(data);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mendaftarkan pelanggan";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div className="flex h-[560px] w-full max-w-2xl flex-col rounded-md border border-slate-300 bg-white shadow-xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              [F8] Pilih / Tambah Pelanggan
            </h2>
            <p className="text-xs text-slate-700">
              Tentukan pelanggan nota untuk transaksi kredit atau catatan pelanggan
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

        {/* Tab Pemilih */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5">
          <button
            type="button"
            onClick={() => setActiveTab("SELECT")}
            className={`h-11 border-b-2 px-4 text-xs font-bold transition-colors ${
              activeTab === "SELECT"
                ? "border-blue-900 bg-white text-blue-900"
                : "border-transparent text-slate-700 hover:text-slate-900"
            }`}
          >
            Pilih Pelanggan Terdaftar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("CREATE")}
            className={`h-11 border-b-2 px-4 text-xs font-bold transition-colors ${
              activeTab === "CREATE"
                ? "border-blue-900 bg-white text-blue-900"
                : "border-transparent text-slate-700 hover:text-slate-900"
            }`}
          >
            + Tambah Pelanggan Baru
          </button>
        </div>

        {/* Konten Tab 1: Pilih Pelanggan */}
        {activeTab === "SELECT" && (
          <div className="flex flex-1 flex-col overflow-hidden p-5">
            <div className="mb-3 flex items-center gap-3">
              <input
                type="text"
                autoFocus
                placeholder="Cari nama, kode pelanggan, atau nomor telepon..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 flex-1 rounded border border-slate-300 px-3 text-xs text-slate-900 placeholder-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
              />
              <button
                type="button"
                onClick={() => {
                  onSelectCustomer(null);
                  onClose();
                }}
                className="h-10 rounded border border-slate-300 bg-slate-100 px-3 text-xs font-bold text-slate-900 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
              >
                Gunakan Pelanggan Umum
              </button>
            </div>

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
                    onClick={fetchCustomers}
                    className="h-10 rounded bg-red-800 px-3 text-xs font-bold text-white hover:bg-red-900"
                  >
                    Muat Ulang
                  </button>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-1 items-center justify-center p-8 text-xs font-bold text-slate-700">
                Memuat daftar pelanggan...
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !errorMessage && filteredCustomers.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center rounded border border-slate-200 bg-slate-50 p-6 text-center">
                <p className="text-sm font-bold text-slate-900">
                  Tidak Ada Pelanggan yang Cocok
                </p>
                <p className="mt-1 text-xs text-slate-700">
                  Periksa kembali pencarian Anda atau daftarkan pelanggan baru melalui tab di atas.
                </p>
              </div>
            )}

            {/* List Pelanggan */}
            {!isLoading && !errorMessage && filteredCustomers.length > 0 && (
              <div className="flex-1 overflow-y-auto rounded border border-slate-300">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="sticky top-0 border-b border-slate-300 bg-slate-100 text-[11px] font-bold text-slate-700">
                    <tr>
                      <th className="px-3 py-2">Kode</th>
                      <th className="px-3 py-2">Nama Pelanggan</th>
                      <th className="px-3 py-2">No. Telepon</th>
                      <th className="px-3 py-2 text-right">Limit Kredit</th>
                      <th className="px-3 py-2 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredCustomers.map((c) => {
                      const isSelected = currentCustomer?.id === c.id;

                      return (
                        <tr
                          key={c.id}
                          className={`hover:bg-slate-50 ${
                            isSelected ? "bg-blue-50 font-bold" : ""
                          }`}
                        >
                          <td className="px-3 py-2 font-mono font-bold text-slate-900">
                            {c.code}
                          </td>
                          <td className="px-3 py-2 text-slate-900">{c.name}</td>
                          <td className="px-3 py-2 font-mono text-slate-700">
                            {c.phone || "-"}
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-900">
                            {formatRupiah(c.credit_limit)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectCustomer(c);
                                onClose();
                              }}
                              className="h-10 rounded bg-blue-900 px-3 text-xs font-bold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                            >
                              Pilih
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
        )}

        {/* Konten Tab 2: Tambah Pelanggan Baru */}
        {activeTab === "CREATE" && (
          <form
            onSubmit={handleCreateCustomer}
            className="flex flex-1 flex-col justify-between overflow-y-auto p-5"
          >
            <div className="space-y-3">
              {formError && (
                <div
                  role="alert"
                  className="rounded border border-red-300 bg-red-100 p-2 text-xs font-bold text-red-800"
                >
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="new-cust-code"
                    className="block text-xs font-bold text-slate-900"
                  >
                    Kode Pelanggan
                  </label>
                  <input
                    id="new-cust-code"
                    type="text"
                    required
                    placeholder="Contoh: P00012"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-cust-limit"
                    className="block text-xs font-bold text-slate-900"
                  >
                    Limit Kredit (Rp)
                  </label>
                  <input
                    id="new-cust-limit"
                    type="number"
                    min="0"
                    step="500000"
                    placeholder="0"
                    value={newCreditLimit}
                    onChange={(e) =>
                      setNewCreditLimit(Math.max(0, parseFloat(e.target.value) || 0))
                    }
                    className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-right text-xs font-mono font-bold tabular-nums text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="new-cust-name"
                  className="block text-xs font-bold text-slate-900"
                >
                  Nama Lengkap Pelanggan
                </label>
                <input
                  id="new-cust-name"
                  type="text"
                  required
                  placeholder="Contoh: PT Bangun Baja Sentosa"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                />
              </div>

              <div>
                <label
                  htmlFor="new-cust-phone"
                  className="block text-xs font-bold text-slate-900"
                >
                  No. Telepon / WhatsApp
                </label>
                <input
                  id="new-cust-phone"
                  type="text"
                  placeholder="Contoh: 081234567890"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                />
              </div>

              <div>
                <label
                  htmlFor="new-cust-address"
                  className="block text-xs font-bold text-slate-900"
                >
                  Alamat Pengiriman
                </label>
                <textarea
                  id="new-cust-address"
                  rows={2}
                  placeholder="Alamat gudang / proyek..."
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 p-2 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={() => setActiveTab("SELECT")}
                className="h-10 rounded border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-10 rounded bg-blue-900 px-5 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
              >
                {isSubmitting ? "Menyimpan..." : "Simpan & Pilih Pelanggan"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
