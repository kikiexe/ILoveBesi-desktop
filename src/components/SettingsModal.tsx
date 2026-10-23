import { useState, useEffect } from "react";
import type { PosSettings, PrinterConnectionType } from "../types/settings.types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PosSettings;
  onSaveSettings: (newSettings: PosSettings) => void;
  onTestPrint?: (settings: PosSettings) => void;
}

type SettingsTab = "store" | "bank" | "printer";

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onTestPrint,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("store");
  const [form, setForm] = useState<PosSettings>(settings);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testPrintTriggered, setTestPrintTriggered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(settings);
      setSaveSuccess(false);
      setTestPrintTriggered(false);
      setActiveTab("store");
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(form);
    setSaveSuccess(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleTriggerTestPrint = () => {
    if (onTestPrint) {
      setTestPrintTriggered(true);
      onTestPrint(form);
      setTimeout(() => setTestPrintTriggered(false), 3000);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div className="flex h-[620px] w-full max-w-2xl flex-col rounded-md border border-slate-300 bg-white shadow-xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-100 text-blue-900 font-bold">
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
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                [F12] Pengaturan Toko & Kasir POS
              </h2>
              <p className="text-xs text-slate-700">
                Konfigurasi identitas toko, rekening faktur, dan koneksi perangkat printer kasir
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
          >
            [Esc] Tutup
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("store")}
            className={`border-b-2 px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === "store"
                ? "border-blue-900 text-blue-900 bg-white rounded-t"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            Identitas Toko
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("bank")}
            className={`border-b-2 px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === "bank"
                ? "border-blue-900 text-blue-900 bg-white rounded-t"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            Rekening Pembayaran
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("printer")}
            className={`border-b-2 px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === "printer"
                ? "border-blue-900 text-blue-900 bg-white rounded-t"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            Koneksi & Format Printer
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col justify-between overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {saveSuccess && (
              <div className="rounded border border-green-300 bg-green-50 p-3 text-xs font-bold text-green-900">
                Pengaturan berhasil disimpan ke mesin kasir!
              </div>
            )}

            {testPrintTriggered && (
              <div className="rounded border border-blue-300 bg-blue-50 p-3 text-xs font-bold text-blue-900">
                Sinyal uji cetak dikirim ke printer kasir. Silakan periksa kertas keluar.
              </div>
            )}

            {/* TAB 1: IDENTITAS TOKO */}
            {activeTab === "store" && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="cfg-storeName" className="block text-xs font-bold text-slate-900">
                    Nama Toko / Usaha
                  </label>
                  <input
                    id="cfg-storeName"
                    type="text"
                    required
                    value={form.storeName}
                    onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                    placeholder="Contoh: ILuvBesi POS"
                    className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                  />
                  <span className="text-[11px] text-slate-600">
                    Dicetak pada baris teratas struk thermal dan kop faktur penjualan.
                  </span>
                </div>

                <div>
                  <label htmlFor="cfg-storeSubtitle" className="block text-xs font-bold text-slate-900">
                    Slogan / Subjudul Toko
                  </label>
                  <input
                    id="cfg-storeSubtitle"
                    type="text"
                    value={form.storeSubtitle}
                    onChange={(e) => setForm({ ...form, storeSubtitle: e.target.value })}
                    placeholder="Contoh: Pusat Besi Hollow & Baja"
                    className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-3 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                  />
                </div>

                <div>
                  <label htmlFor="cfg-storeAddress" className="block text-xs font-bold text-slate-900">
                    Alamat Lengkap Toko
                  </label>
                  <input
                    id="cfg-storeAddress"
                    type="text"
                    value={form.storeAddress}
                    onChange={(e) => setForm({ ...form, storeAddress: e.target.value })}
                    placeholder="Contoh: Jl. Raya Industri No. 88, Kawasan Pergudangan"
                    className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-3 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                  />
                </div>

                <div>
                  <label htmlFor="cfg-storePhone" className="block text-xs font-bold text-slate-900">
                    Nomor Telepon / WhatsApp
                  </label>
                  <input
                    id="cfg-storePhone"
                    type="text"
                    value={form.storePhone}
                    onChange={(e) => setForm({ ...form, storePhone: e.target.value })}
                    placeholder="Contoh: 0812-3456-7890"
                    className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-3 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: REKENING PEMBAYARAN */}
            {activeTab === "bank" && (
              <div className="space-y-4">
                <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  Informasi rekening ini akan otomatis dicetak pada lembar faktur penjualan resmi untuk pembayaran transfer bank oleh pelanggan.
                </div>

                <div>
                  <label htmlFor="cfg-bankName" className="block text-xs font-bold text-slate-900">
                    Nama Bank
                  </label>
                  <input
                    id="cfg-bankName"
                    type="text"
                    value={form.bankName}
                    onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                    placeholder="Contoh: BCA, Mandiri, BRI, BNI"
                    className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                  />
                </div>

                <div>
                  <label htmlFor="cfg-bankAccountNumber" className="block text-xs font-bold text-slate-900">
                    Nomor Rekening
                  </label>
                  <input
                    id="cfg-bankAccountNumber"
                    type="text"
                    value={form.bankAccountNumber}
                    onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
                    placeholder="Contoh: 123-456-7890"
                    className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-3 text-xs font-mono font-bold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                  />
                </div>

                <div>
                  <label htmlFor="cfg-bankAccountName" className="block text-xs font-bold text-slate-900">
                    Nama Pemilik Rekening (Atas Nama)
                  </label>
                  <input
                    id="cfg-bankAccountName"
                    type="text"
                    value={form.bankAccountName}
                    onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })}
                    placeholder="Contoh: Toko Besi Sumber Makmur"
                    className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                  />
                </div>
              </div>
            )}

            {/* TAB 3: KONEKSI & FORMAT PRINTER */}
            {activeTab === "printer" && (
              <div className="space-y-4">
                {/* 1. Metode Koneksi Printer */}
                <div>
                  <span className="block text-xs font-bold text-slate-900 mb-1.5">
                    Metode Antarmuka / Koneksi Printer
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        key: "SYSTEM_DRIVER" as PrinterConnectionType,
                        title: "Driver Sistem OS",
                        sub: "USB / CUPS / Spooler",
                      },
                      {
                        key: "NETWORK_LAN" as PrinterConnectionType,
                        title: "Thermal LAN / Wi-Fi",
                        sub: "Direct IP TCP Port 9100",
                      },
                      {
                        key: "BLUETOOTH_SERIAL" as PrinterConnectionType,
                        title: "Bluetooth / COM",
                        sub: "Serial Port Perangkat",
                      },
                    ].map((conn) => (
                      <button
                        key={conn.key}
                        type="button"
                        onClick={() => setForm({ ...form, printerConnection: conn.key })}
                        className={`rounded border p-2.5 text-left transition-colors ${
                          form.printerConnection === conn.key
                            ? "border-blue-900 bg-blue-50/80 font-bold text-blue-900 ring-1 ring-blue-900"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <div className="text-xs font-bold">{conn.title}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{conn.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Target Printer Sesuai Metode Koneksi */}
                {form.printerConnection === "SYSTEM_DRIVER" && (
                  <div>
                    <label htmlFor="cfg-printerTargetName" className="block text-xs font-bold text-slate-900">
                      Nama Printer Target di Sistem Operasi
                    </label>
                    <input
                      id="cfg-printerTargetName"
                      type="text"
                      value={form.printerTargetName}
                      onChange={(e) => setForm({ ...form, printerTargetName: e.target.value })}
                      placeholder="Contoh: POS-80, Epson TM-T82, Xprinter XP-58"
                      className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                    />
                    <span className="text-[11px] text-slate-600">
                      Nama antrean cetak yang terdaftar pada menu Printers &amp; Scanners di Windows atau CUPS di Linux.
                    </span>
                  </div>
                )}

                {form.printerConnection === "NETWORK_LAN" && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label htmlFor="cfg-printerIpAddress" className="block text-xs font-bold text-slate-900">
                        Alamat IP Printer Thermal (LAN / Wi-Fi)
                      </label>
                      <input
                        id="cfg-printerIpAddress"
                        type="text"
                        value={form.printerIpAddress}
                        onChange={(e) => setForm({ ...form, printerIpAddress: e.target.value })}
                        placeholder="Contoh: 192.168.1.200"
                        className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-3 text-xs font-mono font-bold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                      />
                    </div>
                    <div>
                      <label htmlFor="cfg-printerPort" className="block text-xs font-bold text-slate-900">
                        Port RAW TCP
                      </label>
                      <input
                        id="cfg-printerPort"
                        type="number"
                        value={form.printerPort}
                        onChange={(e) => setForm({ ...form, printerPort: Number(e.target.value) || 9100 })}
                        placeholder="9100"
                        className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-3 text-xs font-mono font-bold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                      />
                    </div>
                  </div>
                )}

                {form.printerConnection === "BLUETOOTH_SERIAL" && (
                  <div>
                    <label htmlFor="cfg-printerTargetName" className="block text-xs font-bold text-slate-900">
                      Port Serial COM / Jalur Perangkat Bluetooth
                    </label>
                    <input
                      id="cfg-printerTargetName"
                      type="text"
                      value={form.printerTargetName}
                      onChange={(e) => setForm({ ...form, printerTargetName: e.target.value })}
                      placeholder="Contoh: COM3, COM4, atau /dev/rfcomm0"
                      className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-3 text-xs font-mono font-bold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                    />
                  </div>
                )}

                {/* 3. Ukuran Kertas & Lembar Salinan */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block text-xs font-bold text-slate-900 mb-1.5">
                      Ukuran Kertas Kasir (Thermal)
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, paperWidth: "58mm" })}
                        className={`h-11 rounded border p-2 text-left transition-colors ${
                          form.paperWidth === "58mm"
                            ? "border-blue-900 bg-blue-50/80 font-bold text-blue-900"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <div className="text-xs">58 mm</div>
                        <div className="text-[10px] text-slate-500 font-normal">Saku / mini</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setForm({ ...form, paperWidth: "80mm" })}
                        className={`h-11 rounded border p-2 text-left transition-colors ${
                          form.paperWidth === "80mm"
                            ? "border-blue-900 bg-blue-50/80 font-bold text-blue-900"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <div className="text-xs">80 mm</div>
                        <div className="text-[10px] text-slate-500 font-normal">Standar POS</div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs font-bold text-slate-900 mb-1.5">
                      Jumlah Salinan Cetak
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, printCopies: 1 })}
                        className={`h-11 rounded border p-2 text-left transition-colors ${
                          form.printCopies === 1
                            ? "border-blue-900 bg-blue-50/80 font-bold text-blue-900"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <div className="text-xs">1 Lembar</div>
                        <div className="text-[10px] text-slate-500 font-normal">Untuk pembeli</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setForm({ ...form, printCopies: 2 })}
                        className={`h-11 rounded border p-2 text-left transition-colors ${
                          form.printCopies === 2
                            ? "border-blue-900 bg-blue-50/80 font-bold text-blue-900"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <div className="text-xs">2 Lembar</div>
                        <div className="text-[10px] text-slate-500 font-normal">Pembeli + Arsip</div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. Pengendalian Perangkat Keras POS */}
                <div className="rounded border border-slate-200 bg-slate-50 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">Potong Kertas Otomatis (Auto-Cutter)</div>
                      <div className="text-[11px] text-slate-600">
                        Kirim perintah potong kertas ke pisau printer kasir setelah struk selesai dicetak
                      </div>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={form.autoCutPaper}
                        onChange={(e) => setForm({ ...form, autoCutPaper: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="h-6 w-11 rounded-full bg-slate-300 peer-checked:bg-blue-900 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-900 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                    <div>
                      <div className="text-xs font-bold text-slate-900">Buka Laci Kasir (Cash Drawer Kick)</div>
                      <div className="text-[11px] text-slate-600">
                        Kirim sinyal pulsa RJ11 ke laci kasir saat transaksi pembayaran tunai berhasil disimpan
                      </div>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={form.openCashDrawer}
                        onChange={(e) => setForm({ ...form, openCashDrawer: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="h-6 w-11 rounded-full bg-slate-300 peer-checked:bg-blue-900 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-900 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                    <div>
                      <div className="text-xs font-bold text-slate-900">Auto-Print Struk Fisik</div>
                      <div className="text-[11px] text-slate-600">
                        Langsung kirim sinyal cetak ke printer kasir begitu transaksi berhasil disimpan
                      </div>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={form.autoPrintReceipt}
                        onChange={(e) => setForm({ ...form, autoPrintReceipt: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="h-6 w-11 rounded-full bg-slate-300 peer-checked:bg-blue-900 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-900 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                    <div>
                      <div className="text-xs font-bold text-slate-900">Default Tampilkan PPN di Nota</div>
                      <div className="text-[11px] text-slate-600">
                        Otomatis aktifkan toggle rincian PPN saat membuka modal pembayaran kasir
                      </div>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={form.defaultShowPpn}
                        onChange={(e) => setForm({ ...form, defaultShowPpn: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="h-6 w-11 rounded-full bg-slate-300 peer-checked:bg-blue-900 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-900 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>
                </div>

                {/* 5. Catatan Kaki & Salam */}
                <div>
                  <label htmlFor="cfg-footerNotes" className="block text-xs font-bold text-slate-900">
                    Ketentuan Retur / Catatan Kaki Struk
                  </label>
                  <input
                    id="cfg-footerNotes"
                    type="text"
                    value={form.footerNotes}
                    onChange={(e) => setForm({ ...form, footerNotes: e.target.value })}
                    placeholder="Contoh: Barang yang dibeli tidak dapat ditukar/dikembalikan."
                    className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-3 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                  />
                </div>

                <div>
                  <label htmlFor="cfg-footerGreeting" className="block text-xs font-bold text-slate-900">
                    Salam Penutup Struk
                  </label>
                  <input
                    id="cfg-footerGreeting"
                    type="text"
                    value={form.footerGreeting}
                    onChange={(e) => setForm({ ...form, footerGreeting: e.target.value })}
                    placeholder="Contoh: TERIMA KASIH ATAS KUNJUNGAN ANDA"
                    className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-3 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3">
            <div>
              {activeTab === "printer" && (
                <button
                  type="button"
                  onClick={handleTriggerTestPrint}
                  className="h-10 rounded border border-blue-900 bg-blue-50 px-3.5 text-xs font-bold text-blue-900 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                >
                  Uji Cetak Printer (Test Print)
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
              >
                Batal [Esc]
              </button>
              <button
                type="submit"
                className="h-10 rounded bg-blue-900 px-5 text-xs font-bold text-white hover:bg-blue-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
              >
                Simpan Pengaturan [Enter]
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
