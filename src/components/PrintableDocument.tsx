import type { PrintDocumentData } from "../types/pos.types";
import { formatRupiah, formatThickness } from "../utils/currency";
import { formatWibDateTime, formatWibDateOnly } from "../utils/date";

interface PrintableDocumentProps {
  data: PrintDocumentData | null;
}

export default function PrintableDocument({ data }: PrintableDocumentProps) {
  if (!data) return null;

  const isFaktur = data.mode === "FAKTUR";
  const isStruk = data.mode === "STRUK";
  const isSuratJalan = data.mode === "SURAT_JALAN";

  const is58mm = data.settings?.paperWidth === "58mm";
  const storeName = data.settings?.storeName || "ILuvBesi POS";
  const storeSubtitle = data.settings?.storeSubtitle || "Pusat Besi Hollow & Baja";
  const storeAddress = data.settings?.storeAddress || "";
  const storePhone = data.settings?.storePhone || "";
  const footerNotes = data.settings?.footerNotes || "Barang yang dibeli tidak dapat ditukar/dikembalikan.";
  const footerGreeting = data.settings?.footerGreeting || "TERIMA KASIH ATAS KUNJUNGAN ANDA";
  const bankName = data.settings?.bankName || "BCA";
  const bankAccountNumber = data.settings?.bankAccountNumber || "";
  const bankAccountName = data.settings?.bankAccountName || "";

  return (
    <div id="printable-root" className="hidden">
      {/* ========================================================= */}
      {/* MODE 1: STRUK KASIR THERMAL (Ukuran 58mm / 80mm)           */}
      {/* ========================================================= */}
      {isStruk && (
        <div className={`${is58mm ? "w-[48mm]" : "w-[72mm]"} p-2 font-mono text-[10px] leading-tight text-black mx-auto`}>
          <div className="text-center pb-2 border-b border-dashed border-black">
            <h1 className="text-sm font-bold uppercase tracking-wider">
              {storeName}
            </h1>
            <p className="text-[9px]">{storeSubtitle}</p>
            {storeAddress && <p className="text-[8px]">{storeAddress}</p>}
            {storePhone && <p className="text-[8px]">Telp/WA: {storePhone}</p>}
            <p className="text-[8px] text-slate-600 mt-0.5">Bukti Transaksi Kasir</p>
          </div>

          <div className="my-1.5 text-[9px] border-b border-dashed border-black pb-1.5 space-y-0.5">
            <div className="flex justify-between">
              <span>No Faktur:</span>
              <span className="font-bold">{data.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span>Waktu:</span>
              <span>{formatWibDateTime(data.sale_date)}</span>
            </div>
            <div className="flex justify-between">
              <span>Kasir:</span>
              <span>{data.cashier_name}</span>
            </div>
            <div className="flex justify-between">
              <span>Pelanggan:</span>
              <span>{data.customer ? data.customer.name : "UMUM"}</span>
            </div>
          </div>

          <div className="my-1.5 border-b border-dashed border-black pb-1.5 space-y-1 text-[9px]">
            {data.items.map((item, idx) => (
              <div key={idx}>
                <div className="font-bold truncate">{item.name}</div>
                <div className="flex justify-between pl-1">
                  <span>
                    {item.qty} {item.unit || "BTG"} x {formatRupiah(item.unit_price)}
                    {item.discount_pct > 0 && ` (-${item.discount_pct}%)`}
                  </span>
                  <span className="font-bold">{formatRupiah(item.subtotal)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="my-1.5 text-[9px] space-y-0.5">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatRupiah(data.subtotal_amount)}</span>
            </div>
            {data.discount_amount > 0 && (
              <div className="flex justify-between">
                <span>Diskon:</span>
                <span>-{formatRupiah(data.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t border-dashed border-black pt-1 text-[11px]">
              <span>TOTAL:</span>
              <span>{formatRupiah(data.grand_total)}</span>
            </div>
            {data.tax_amount > 0 && (
              <div className="flex justify-between text-[9px] text-slate-700">
                <span>(Termasuk PPN 11%):</span>
                <span>{formatRupiah(data.tax_amount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Bayar ({data.payment_type}):</span>
              <span>{formatRupiah(data.paid_amount)}</span>
            </div>
            {data.payment_type === "TUNAI" && (
              <div className="flex justify-between">
                <span>Kembalian:</span>
                <span>{formatRupiah(Math.max(0, data.paid_amount - data.grand_total))}</span>
              </div>
            )}
            {data.remaining_debt > 0 && (
              <div className="flex justify-between font-bold text-red-700">
                <span>Sisa Piutang:</span>
                <span>{formatRupiah(data.remaining_debt)}</span>
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-dashed border-black text-center text-[8px] space-y-0.5">
            <p>{footerNotes}</p>
            <p className="font-bold text-[9px]">{footerGreeting}</p>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 2: FAKTUR PENJUALAN (Lengkap dengan Harga & Status) */}
      {/* ========================================================= */}
      {isFaktur && (
        <div className="p-4 font-mono text-[11px] leading-tight text-black">
          {/* Header Faktur */}
          <div className="border-b-2 border-black pb-2">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-base font-bold uppercase tracking-wider">
                  {storeName}
                </h1>
                <p className="text-[10px]">
                  {storeSubtitle}
                </p>
                {storeAddress && <p className="text-[9px]">{storeAddress}</p>}
                {storePhone && <p className="text-[9px]">Telp/WA: {storePhone}</p>}
                <p className="text-[9px] text-slate-700">
                  Faktur Penjualan Resmi / Bukti Transaksi Kasir
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">{data.invoice_number}</div>
                <div>{formatWibDateTime(data.sale_date)} WIB</div>
                <div>Kasir: {data.cashier_name}</div>
              </div>
            </div>
          </div>

          {/* Info Pelanggan & Pembayaran */}
          <div className="my-2 flex justify-between text-[11px] border-b border-black pb-2">
            <div>
              <div>
                Pelanggan:{" "}
                <strong className="text-xs">
                  {data.customer ? data.customer.name : "UMUM"}
                </strong>
              </div>
              {data.customer?.phone && <div>No. Telp: {data.customer.phone}</div>}
              {data.customer?.address && (
                <div>Alamat: {data.customer.address}</div>
              )}
            </div>
            <div className="text-right">
              <div>
                Metode: <strong>{data.payment_type}</strong> (
                {data.payment_status})
              </div>
              {data.due_date && (
                <div>
                  Jatuh Tempo:{" "}
                  <strong>{formatWibDateOnly(data.due_date)}</strong>
                </div>
              )}
              {data.notes && <div>Catatan: {data.notes}</div>}
            </div>
          </div>

          {/* Tabel Barang */}
          <table className="w-full border-collapse border border-black my-2 text-[10px]">
            <thead>
              <tr className="border-b border-black bg-gray-100">
                <th className="border border-black px-1.5 py-1 text-center w-8">
                  No
                </th>
                <th className="border border-black px-1.5 py-1 text-left">
                  Nama Barang & Ukuran
                </th>
                <th className="border border-black px-1.5 py-1 text-right w-16">
                  Tebal
                </th>
                <th className="border border-black px-1.5 py-1 text-right w-16">
                  Qty (BTG)
                </th>
                <th className="border border-black px-1.5 py-1 text-right w-24">
                  Harga Satuan
                </th>
                <th className="border border-black px-1.5 py-1 text-right w-16">
                  Disc %
                </th>
                <th className="border border-black px-1.5 py-1 text-right w-28">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={index} className="border-b border-black">
                  <td className="border border-black px-1.5 py-0.5 text-center">
                    {index + 1}
                  </td>
                  <td className="border border-black px-1.5 py-0.5 font-bold">
                    {item.name}
                  </td>
                  <td className="border border-black px-1.5 py-0.5 text-right">
                    {formatThickness(item.thickness_mm)}
                  </td>
                  <td className="border border-black px-1.5 py-0.5 text-right font-bold">
                    {item.qty}
                  </td>
                  <td className="border border-black px-1.5 py-0.5 text-right">
                    {formatRupiah(item.unit_price)}
                  </td>
                  <td className="border border-black px-1.5 py-0.5 text-right">
                    {item.discount_pct > 0 ? `${item.discount_pct}%` : "-"}
                  </td>
                  <td className="border border-black px-1.5 py-0.5 text-right font-bold">
                    {formatRupiah(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Rincian Total */}
          <div className="flex justify-end my-2">
            <div className="w-64 space-y-0.5 text-right text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatRupiah(data.subtotal_amount)}</span>
              </div>
              {data.discount_amount > 0 && (
                <div className="flex justify-between">
                  <span>Diskon Nota:</span>
                  <span>- {formatRupiah(data.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-black pt-1 font-bold text-xs">
                <span>Grand Total:</span>
                <span>{formatRupiah(data.grand_total)}</span>
              </div>
              {data.tax_amount > 0 && (
                <div className="flex justify-between text-[11px] text-slate-700">
                  <span>(Termasuk PPN 11%):</span>
                  <span>{formatRupiah(data.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Dibayar / DP:</span>
                <span>{formatRupiah(data.paid_amount)}</span>
              </div>
              {data.remaining_debt > 0 && (
                <div className="flex justify-between font-bold border-t border-black pt-0.5">
                  <span>Sisa Piutang:</span>
                  <span>{formatRupiah(data.remaining_debt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Kolom Tanda Tangan */}
          <div className="mt-6 flex justify-between text-center text-[10px] pt-4">
            <div className="w-40">
              <p>Penerima / Pembeli,</p>
              <div className="h-14"></div>
              <p className="border-t border-black pt-1">
                ( {data.customer ? data.customer.name : "...................."} )
              </p>
            </div>

            <div className="w-56 text-[9px] text-left space-y-0.5">
              {bankAccountNumber && (
                <p className="font-semibold text-slate-900">
                  Transfer: Bank {bankName} {bankAccountNumber} {bankAccountName && `a/n ${bankAccountName}`}
                </p>
              )}
              <p>* {footerNotes}</p>
              <p>* Nota ini adalah bukti pembayaran yang sah.</p>
            </div>

            <div className="w-40">
              <p>Hormat Kami,</p>
              <div className="h-14"></div>
              <p className="border-t border-black pt-1">
                ( {data.cashier_name} )
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 3: SURAT JALAN GUDANG (Fisik Saja, Tanpa Nilai Uang) */}
      {/* ========================================================= */}
      {isSuratJalan && (
        <div className="p-4 font-mono text-[11px] leading-tight text-black">
          {/* Header Surat Jalan */}
          <div className="border-b-2 border-black pb-2">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-base font-bold uppercase tracking-wider">
                  {storeName} - Surat Jalan Gudang
                </h1>
                <p className="text-[10px]">
                  Dokumen Muat & Bukti Pengeluaran Barang Fisik
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">
                  SJ-{data.invoice_number}
                </div>
                <div>Ref: {data.invoice_number}</div>
                <div>Tanggal: {formatWibDateOnly(data.sale_date)}</div>
              </div>
            </div>
          </div>

          {/* Info Pengiriman */}
          <div className="my-2 border-b border-black pb-2 text-[11px]">
            <div>
              Tujuan Pengiriman / Penerima:{" "}
              <strong className="text-xs">
                {data.customer ? data.customer.name : "PELANGGAN UMUM"}
              </strong>
            </div>
            {data.customer?.phone && <div>No. Telp: {data.customer.phone}</div>}
            {data.customer?.address && (
              <div>Alamat Bongkar: {data.customer.address}</div>
            )}
            {data.notes && <div>Catatan Khusus: {data.notes}</div>}
          </div>

          {/* Tabel Barang Fisik (TANPA HARGA SAMA SEKALI) */}
          <table className="w-full border-collapse border border-black my-2 text-[10px]">
            <thead>
              <tr className="border-b border-black bg-gray-100">
                <th className="border border-black px-1.5 py-1 text-center w-8">
                  No
                </th>
                <th className="border border-black px-1.5 py-1 text-left w-24">
                  Kode SKU
                </th>
                <th className="border border-black px-1.5 py-1 text-left">
                  Nama Barang & Ukuran Hollow
                </th>
                <th className="border border-black px-1.5 py-1 text-right w-20">
                  Tebal (mm)
                </th>
                <th className="border border-black px-1.5 py-1 text-right w-24">
                  Jumlah (BTG)
                </th>
                <th className="border border-black px-1.5 py-1 text-center w-28">
                  Cek Fisik Gudang
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={index} className="border-b border-black">
                  <td className="border border-black px-1.5 py-1 text-center">
                    {index + 1}
                  </td>
                  <td className="border border-black px-1.5 py-1 font-mono">
                    {item.sku}
                  </td>
                  <td className="border border-black px-1.5 py-1 font-bold">
                    {item.name}
                  </td>
                  <td className="border border-black px-1.5 py-1 text-right">
                    {formatThickness(item.thickness_mm)}
                  </td>
                  <td className="border border-black px-1.5 py-1 text-right font-bold text-xs">
                    {item.qty} BTG
                  </td>
                  <td className="border border-black px-1.5 py-1 text-center font-mono text-[9px]">
                    [ &nbsp; ] OK
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total Jumlah Batang */}
          <div className="flex justify-between items-center border-t border-black pt-1 my-2 text-xs font-bold">
            <div>
              Total Jenis Barang: {data.items.length} item
            </div>
            <div>
              Total Fisik Muat:{" "}
              {data.items.reduce((sum, it) => sum + it.qty, 0)} BTG
            </div>
          </div>

          {/* 3 Kolom Tanda Tangan */}
          <div className="mt-8 grid grid-cols-3 text-center text-[10px]">
            <div>
              <p>Kepala Gudang,</p>
              <div className="h-14"></div>
              <p className="border-t border-black mx-4 pt-1">
                ( .................... )
              </p>
            </div>

            <div>
              <p>Sopir / Pengirim,</p>
              <div className="h-14"></div>
              <p className="border-t border-black mx-4 pt-1">
                ( .................... )
              </p>
            </div>

            <div>
              <p>Penerima Barang,</p>
              <div className="h-14"></div>
              <p className="border-t border-black mx-4 pt-1">
                ( {data.customer ? data.customer.name : "...................."} )
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
