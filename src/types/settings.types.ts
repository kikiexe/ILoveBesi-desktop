export interface PosSettings {
  storeName: string;
  storeSubtitle: string;
  storeAddress: string;
  storePhone: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  paperWidth: "58mm" | "80mm";
  footerNotes: string;
  footerGreeting: string;
  defaultShowPpn: boolean;
  autoPrintReceipt: boolean;
}

export const DEFAULT_POS_SETTINGS: PosSettings = {
  storeName: "ILuvBesi POS",
  storeSubtitle: "Pusat Besi Hollow & Baja",
  storeAddress: "Jl. Raya Industri Baja No. 88",
  storePhone: "0812-3456-7890",
  bankName: "BCA",
  bankAccountNumber: "123-456-7890",
  bankAccountName: "Toko Besi",
  paperWidth: "80mm",
  footerNotes: "Barang yang dibeli tidak dapat ditukar/dikembalikan.",
  footerGreeting: "TERIMA KASIH ATAS KUNJUNGAN ANDA",
  defaultShowPpn: true,
  autoPrintReceipt: false,
};
