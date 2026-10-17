export function formatRupiah(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safeAmount);
}

export function formatThickness(mm: number): string {
  const safeMm = Number.isFinite(mm) ? mm : 0;
  return `${safeMm.toFixed(2)} mm`;
}

export function parseNumericInput(val: string): number {
  if (!val) return 0;
  let normalized = val.trim();
  if (normalized.includes("Rp") || (normalized.match(/\./g) || []).length > 1) {
    normalized = normalized.replace(/\./g, "");
  }
  const cleaned = normalized.replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? 0 : num;
}
