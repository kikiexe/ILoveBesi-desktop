import { describe, expect, it } from "vitest";
import { formatRupiah, formatThickness, parseNumericInput } from "./currency";

describe("formatRupiah di aplikasi desktop", () => {
  it("memformat nominal rupiah tanpa desimal dengan pemisah ribuan titik", () => {
    const formatted = formatRupiah(2500000);
    expect(formatted).toContain("2.500.000");
    expect(formatted).toContain("Rp");
  });

  it("memformat angka nol dengan benar", () => {
    const formatted = formatRupiah(0);
    expect(formatted).toContain("0");
    expect(formatted).toContain("Rp");
  });

  it("menangani nilai non-angka dengan aman", () => {
    expect(formatRupiah(NaN)).toContain("0");
    expect(formatRupiah(Infinity)).toContain("0");
  });
});

describe("formatThickness di aplikasi desktop", () => {
  it("memformat ketebalan milimeter dengan dua digit desimal", () => {
    expect(formatThickness(1.2)).toBe("1.20 mm");
    expect(formatThickness(0.7)).toBe("0.70 mm");
  });

  it("memformat nol dan non-angka secara aman", () => {
    expect(formatThickness(0)).toBe("0.00 mm");
    expect(formatThickness(NaN)).toBe("0.00 mm");
  });
});

describe("parseNumericInput di aplikasi desktop", () => {
  it("mengonversi string angka murni menjadi tipe number", () => {
    expect(parseNumericInput("150000")).toBe(150000);
    expect(parseNumericInput("12.5")).toBe(12.5);
  });

  it("membersihkan teks berformat rupiah menjadi number murni", () => {
    expect(parseNumericInput("Rp 1.500.000")).toBe(1500000);
  });

  it("mengembalikan 0 untuk input yang tidak mengandung angka", () => {
    expect(parseNumericInput("")).toBe(0);
    expect(parseNumericInput("abc")).toBe(0);
  });
});
