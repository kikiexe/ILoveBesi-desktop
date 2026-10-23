import type { PrintDocumentData } from "../types/pos.types";
import { formatRupiah } from "./currency";
import { formatWibDateTime } from "./date";

function padCenter(text: string, width: number): string {
  if (text.length >= width) return text.substring(0, width);
  const leftPadding = Math.floor((width - text.length) / 2);
  const rightPadding = width - text.length - leftPadding;
  return " ".repeat(leftPadding) + text + " ".repeat(rightPadding);
}

function padRow(left: string, right: string, width: number): string {
  const availableSpace = width - right.length;
  if (availableSpace <= 0) return left + " " + right;
  if (left.length > availableSpace - 1) {
    left = left.substring(0, availableSpace - 2) + ".";
  }
  const spaces = " ".repeat(Math.max(1, width - left.length - right.length));
  return left + spaces + right;
}

export function formatThermalTextReceipt(data: PrintDocumentData): string {
  const width = data.settings?.paperWidth === "58mm" ? 32 : 42;
  const divider = "-".repeat(width);

  const lines: string[] = [];

  const storeName = data.settings?.storeName || "ILuvBesi POS";
  const storeSubtitle = data.settings?.storeSubtitle || "Pusat Besi Hollow & Baja";
  const storeAddress = data.settings?.storeAddress || "";
  const storePhone = data.settings?.storePhone || "";
  const footerNotes = data.settings?.footerNotes || "Barang yang dibeli tidak dapat ditukar/dikembalikan.";
  const footerGreeting = data.settings?.footerGreeting || "TERIMA KASIH ATAS KUNJUNGAN ANDA";

  // 1. Header Toko
  lines.push(padCenter(storeName.toUpperCase(), width));
  if (storeSubtitle) lines.push(padCenter(storeSubtitle, width));
  if (storeAddress) lines.push(padCenter(storeAddress, width));
  if (storePhone) lines.push(padCenter(`Telp: ${storePhone}`, width));
  lines.push(padCenter("BUKTI TRANSAKSI KASIR", width));
  lines.push(divider);

  // 2. Transaksi Info
  lines.push(padRow("No Faktur:", data.invoice_number, width));
  lines.push(padRow("Waktu:", formatWibDateTime(data.sale_date), width));
  lines.push(padRow("Kasir:", data.cashier_name || "Kasir", width));
  lines.push(padRow("Pelanggan:", data.customer ? data.customer.name : "UMUM", width));
  lines.push(divider);

  // 3. Baris Item
  lines.push(padRow("ITEM", "TOTAL", width));
  lines.push(divider);

  for (const item of data.items) {
    lines.push(item.name.length > width ? item.name.substring(0, width) : item.name);
    const qtyPrice = `${item.qty} ${item.unit || "BTG"} x ${formatRupiah(item.unit_price)}`;
    lines.push(padRow(`  ${qtyPrice}`, formatRupiah(item.subtotal), width));
  }
  lines.push(divider);

  // 4. Ringkasan Pembayaran
  lines.push(padRow("Subtotal:", formatRupiah(data.subtotal_amount), width));
  if (data.discount_amount > 0) {
    lines.push(padRow("Diskon:", `-${formatRupiah(data.discount_amount)}`, width));
  }
  lines.push(padRow("TOTAL:", formatRupiah(data.grand_total), width));
  if (data.tax_amount > 0) {
    lines.push(padRow("(Termasuk PPN 11%):", formatRupiah(data.tax_amount), width));
  }
  lines.push(padRow(`Bayar (${data.payment_type}):`, formatRupiah(data.paid_amount), width));
  if (data.payment_type === "TUNAI") {
    const change = Math.max(0, data.paid_amount - data.grand_total);
    lines.push(padRow("Kembalian:", formatRupiah(change), width));
  }
  if (data.remaining_debt > 0) {
    lines.push(padRow("Sisa Piutang:", formatRupiah(data.remaining_debt), width));
  }

  if (data.notes) {
    lines.push(divider);
    lines.push(`Catatan: ${data.notes}`);
  }

  // 5. Footer Toko
  lines.push(divider);
  lines.push(padCenter(footerNotes, width));
  lines.push(padCenter(footerGreeting, width));
  lines.push(divider);

  return lines.join("\n") + "\n";
}
