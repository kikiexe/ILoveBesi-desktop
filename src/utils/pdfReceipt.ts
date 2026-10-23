import { jsPDF } from "jspdf";
import type { PrintDocumentData } from "../types/pos.types";
import { formatRupiah } from "./currency";

export function generateReceiptPdf(data: PrintDocumentData) {
  const itemHeight = 8;
  const estimatedHeight = Math.max(120, 90 + data.items.length * itemHeight);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, estimatedHeight],
  });

  const left = 5;
  const right = 75;
  let y = 8;

  const storeName = data.settings?.storeName || "ILuvBesi POS";
  const storeSubtitle = data.settings?.storeSubtitle || "Pusat Besi Hollow & Material Baja";
  const storeAddress = data.settings?.storeAddress;
  const storePhone = data.settings?.storePhone;

  // Header
  doc.setFont("courier", "bold");
  doc.setFontSize(13);
  doc.text(storeName, 40, y, { align: "center" });
  y += 4.5;

  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  if (storeSubtitle) {
    doc.text(storeSubtitle, 40, y, { align: "center" });
    y += 3.5;
  }
  if (storeAddress) {
    const splitAddr = doc.splitTextToSize(storeAddress, 70);
    doc.text(splitAddr, 40, y, { align: "center" });
    y += splitAddr.length * 3.2;
  }
  if (storePhone) {
    doc.text(`Telp: ${storePhone}`, 40, y, { align: "center" });
    y += 3.5;
  }
  doc.text("Bukti Transaksi Kasir", 40, y, { align: "center" });
  y += 4;

  doc.setLineDashPattern([1, 1], 0);
  doc.line(left, y, right, y);
  y += 4;

  // Invoice info
  doc.setFontSize(8);
  doc.text(`No: ${data.invoice_number}`, left, y);
  y += 3.5;

  const dateFormatted = new Date(data.sale_date).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(`Tgl: ${dateFormatted} WIB`, left, y);
  y += 3.5;

  doc.text(`Kasir: ${data.cashier_name || "Kasir"}`, left, y);
  doc.text(`Plg: ${data.customer ? data.customer.name : "UMUM"}`, right, y, { align: "right" });
  y += 4;

  doc.line(left, y, right, y);
  y += 4;

  // Items
  doc.setFont("courier", "bold");
  doc.text("ITEM", left, y);
  doc.text("TOTAL", right, y, { align: "right" });
  y += 3.5;

  doc.setFont("courier", "normal");
  data.items.forEach((item) => {
    const cleanName = item.name.length > 28 ? item.name.substring(0, 26) + ".." : item.name;
    doc.text(cleanName, left, y);
    y += 3.2;

    const detailLine = `${item.qty} x ${formatRupiah(item.unit_price)}`;
    doc.text(detailLine, left + 2, y);
    doc.text(formatRupiah(item.subtotal), right, y, { align: "right" });
    y += 4;
  });

  doc.line(left, y, right, y);
  y += 4;

  // Totals
  doc.text("Subtotal:", left, y);
  doc.text(formatRupiah(data.subtotal_amount), right, y, { align: "right" });
  y += 3.5;

  if (data.discount_amount > 0) {
    doc.text("Diskon:", left, y);
    doc.text(`-${formatRupiah(data.discount_amount)}`, right, y, { align: "right" });
    y += 3.5;
  }

  doc.setFont("courier", "bold");
  doc.setFontSize(9);
  doc.text("GRAND TOTAL:", left, y);
  doc.text(formatRupiah(data.grand_total), right, y, { align: "right" });
  y += 4;

  if (data.tax_amount > 0) {
    doc.setFont("courier", "normal");
    doc.setFontSize(7.5);
    doc.text("(Termasuk PPN 11%):", left, y);
    doc.text(formatRupiah(data.tax_amount), right, y, { align: "right" });
    y += 3.5;
  }

  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.text(`Bayar (${data.payment_type}):`, left, y);
  doc.text(formatRupiah(data.paid_amount), right, y, { align: "right" });
  y += 3.5;

  if (data.payment_type === "TUNAI") {
    const change = Math.max(0, data.paid_amount - data.grand_total);
    doc.text("Kembalian:", left, y);
    doc.text(formatRupiah(change), right, y, { align: "right" });
    y += 3.5;
  } else if (data.remaining_debt > 0) {
    doc.setFont("courier", "bold");
    doc.text("Sisa Piutang:", left, y);
    doc.text(formatRupiah(data.remaining_debt), right, y, { align: "right" });
    doc.setFont("courier", "normal");
    y += 3.5;
  }

  y += 2;
  doc.line(left, y, right, y);
  y += 4;

  // Footer
  doc.setFontSize(7);
  const footerNote =
    data.settings?.footerNotes ||
    "Barang yang dibeli tidak dapat ditukar/dikembalikan tanpa persetujuan toko.";
  const splitFooter = doc.splitTextToSize(footerNote, 70);
  doc.text(splitFooter, 40, y, { align: "center" });
  y += splitFooter.length * 3 + 1;
  doc.setFont("courier", "bold");
  doc.text(data.settings?.footerGreeting || "TERIMA KASIH", 40, y, { align: "center" });

  doc.save(`Struk_${data.invoice_number}.pdf`);
}

export function generateInvoicePdf(data: PrintDocumentData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const margin = 14;
  let y = 16;

  const storeName = data.settings?.storeName || "ILuvBesi";
  const storeSubtitle = data.settings?.storeSubtitle || "Pusat Grosir & Eceran Besi Hollow Galvanis";
  const storeAddress = data.settings?.storeAddress;
  const storePhone = data.settings?.storePhone;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(storeName, margin, y);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  let headerY = y + 4.5;
  if (storeSubtitle) {
    doc.text(storeSubtitle, margin, headerY);
    headerY += 4;
  }
  if (storeAddress) {
    const contactText = storePhone ? `${storeAddress} | Telp: ${storePhone}` : storeAddress;
    doc.text(contactText, margin, headerY);
    headerY += 4;
  }
  doc.text("Faktur Penjualan Resmi", margin, headerY);

  // Meta (Right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(data.invoice_number, 196, y, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  const dateFormatted = new Date(data.sale_date).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(`Tanggal: ${dateFormatted} WIB`, 196, y + 5, { align: "right" });
  doc.text(`Kasir: ${data.cashier_name || "-"}`, 196, y + 9, { align: "right" });

  y += 18;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, 196, y);
  y += 6;

  // Customer & Payment Info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("Informasi Pelanggan", margin, y);
  doc.text("Status Transaksi", 120, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Nama: ${data.customer ? data.customer.name : "Pelanggan Umum"}`, margin, y);
  doc.text(`Metode: ${data.payment_type}`, 120, y);
  y += 4.5;
  doc.text(`Status: ${data.payment_status === "LUNAS" ? "Lunas" : "Belum Lunas"}`, 120, y);

  if (data.notes) {
    doc.text(`Catatan: ${data.notes}`, margin, y);
  }

  y += 8;

  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, 182, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);

  doc.text("No", margin + 3, y + 5.5);
  doc.text("Deskripsi Produk", margin + 14, y + 5.5);
  doc.text("Qty", 120, y + 5.5, { align: "right" });
  doc.text("Harga Satuan", 155, y + 5.5, { align: "right" });
  doc.text("Subtotal", 193, y + 5.5, { align: "right" });
  y += 8;

  // Table Rows
  doc.setFont("helvetica", "normal");
  data.items.forEach((item, index) => {
    y += 6;
    doc.text(String(index + 1), margin + 3, y);
    doc.text(item.name, margin + 14, y);
    doc.text(`${item.qty}`, 120, y, { align: "right" });
    doc.text(formatRupiah(item.unit_price), 155, y, { align: "right" });
    doc.text(formatRupiah(item.subtotal), 193, y, { align: "right" });

    y += 2;
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y, 196, y);
  });

  y += 8;

  // Summary box
  const summaryX = 130;
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", summaryX, y);
  doc.text(formatRupiah(data.subtotal_amount), 193, y, { align: "right" });
  y += 5;

  if (data.discount_amount > 0) {
    doc.text("Diskon:", summaryX, y);
    doc.text(`- ${formatRupiah(data.discount_amount)}`, 193, y, { align: "right" });
    y += 5;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Grand Total:", summaryX, y);
  doc.text(formatRupiah(data.grand_total), 193, y, { align: "right" });
  y += 5;

  if (data.tax_amount > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("(Termasuk PPN 11%):", summaryX, y);
    doc.text(formatRupiah(data.tax_amount), 193, y, { align: "right" });
    y += 5;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Dibayar:", summaryX, y);
  doc.text(formatRupiah(data.paid_amount), 193, y, { align: "right" });
  y += 5;

  if (data.remaining_debt > 0) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(185, 28, 28);
    doc.text("Sisa Piutang:", summaryX, y);
    doc.text(formatRupiah(data.remaining_debt), 193, y, { align: "right" });
    doc.setTextColor(15, 23, 42);
    y += 5;
  }

  // Payment Transfer Bank Info (if available)
  if (data.settings?.bankAccountNumber) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text("Pembayaran Transfer Bank:", margin, y + 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`${data.settings.bankName}: ${data.settings.bankAccountNumber}`, margin, y + 6);
    doc.text(`Atas Nama: ${data.settings.bankAccountName}`, margin, y + 10);
  }

  // Signature lines
  y = Math.max(y + 15, 230);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  doc.text("Penerima / Pembeli,", margin + 10, y);
  doc.text("Hormat Kami,", 160, y);

  y += 20;
  doc.text("( ................................... )", margin + 6, y);
  doc.text(`( ${data.cashier_name || "Petugas Kasir"} )`, 155, y);

  doc.save(`Faktur_${data.invoice_number}.pdf`);
}
