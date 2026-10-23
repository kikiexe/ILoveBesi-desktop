export type PrinterConnectionType = "SYSTEM_DRIVER" | "NETWORK_LAN" | "BLUETOOTH_SERIAL";

export interface PosSettings {
  // 1. Identitas Toko
  storeName: string;
  storeSubtitle: string;
  storeAddress: string;
  storePhone: string;

  // 2. Rekening Pembayaran
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;

  // 3. Konfigurasi Koneksi & Perangkat Keras Printer
  printerConnection: PrinterConnectionType;
  printerTargetName: string;
  printerIpAddress: string;
  printerPort: number;
  paperWidth: "58mm" | "80mm";
  printCopies: number;
  autoCutPaper: boolean;
  openCashDrawer: boolean;
  autoPrintReceipt: boolean;

  // 4. Format & Catatan Struk
  footerNotes: string;
  footerGreeting: string;
  defaultShowPpn: boolean;
}

export const DEFAULT_POS_SETTINGS: PosSettings = {
  storeName: "ILuvBesi POS",
  storeSubtitle: "Pusat Besi Hollow & Baja",
  storeAddress: "Jl. Raya Industri Baja No. 88",
  storePhone: "0812-3456-7890",
  bankName: "BCA",
  bankAccountNumber: "123-456-7890",
  bankAccountName: "Toko Besi",

  printerConnection: "SYSTEM_DRIVER",
  printerTargetName: "Default System Printer",
  printerIpAddress: "192.168.1.200",
  printerPort: 9100,
  paperWidth: "80mm",
  printCopies: 1,
  autoCutPaper: true,
  openCashDrawer: false,
  autoPrintReceipt: false,

  footerNotes: "Barang yang dibeli tidak dapat ditukar/dikembalikan.",
  footerGreeting: "TERIMA KASIH ATAS KUNJUNGAN ANDA",
  defaultShowPpn: true,
};
