import { describe, expect, it } from "vitest";
import {
  formatWibDateOnly,
  formatWibDateTime,
  getDefaultDueDateString,
  getWibTodayDateString,
  getWibTodayRange,
} from "./date";

describe("getWibTodayDateString", () => {
  it("menghasilkan format YYYY-MM-DD", () => {
    const today = getWibTodayDateString();
    expect(/^\d{4}-\d{2}-\d{2}$/.test(today)).toBe(true);
  });
});

describe("getWibTodayRange", () => {
  it("menghasilkan rentang awal dan akhir hari dengan offset +07:00", () => {
    const range = getWibTodayRange();
    const today = getWibTodayDateString();

    expect(range.startIso).toBe(`${today}T00:00:00.000+07:00`);
    expect(range.endIso).toBe(`${today}T23:59:59.999+07:00`);
    expect(range.startIso.endsWith("+07:00")).toBe(true);
    expect(range.endIso.endsWith("+07:00")).toBe(true);
  });
});

describe("getDefaultDueDateString", () => {
  it("menghasilkan tanggal 30 hari ke depan secara default berformat YYYY-MM-DD", () => {
    const dueDate = getDefaultDueDateString(30);
    expect(/^\d{4}-\d{2}-\d{2}$/.test(dueDate)).toBe(true);

    const now = new Date();
    const due = new Date(dueDate);
    expect(due.getTime()).toBeGreaterThan(now.getTime());
  });

  it("menerima parameter jumlah hari khusus", () => {
    const dueDate7 = getDefaultDueDateString(7);
    const dueDate14 = getDefaultDueDateString(14);
    expect(new Date(dueDate14).getTime()).toBeGreaterThan(new Date(dueDate7).getTime());
  });
});

describe("formatWibDateTime dan formatWibDateOnly", () => {
  const sampleIso = "2026-10-17T10:30:00.000Z"; // 17:30:00 WIB (+07:00)

  it("memformat ISO string menjadi format tanggal dan waktu lokal", () => {
    const formatted = formatWibDateTime(sampleIso);
    expect(formatted).toContain("2026");
    expect(formatted).toContain("17");
  });

  it("memformat ISO string menjadi format tanggal saja", () => {
    const formatted = formatWibDateOnly(sampleIso);
    expect(formatted).toContain("2026");
  });

  it("mengembalikan tanda strip untuk nilai null atau kosong", () => {
    expect(formatWibDateTime(null)).toBe("-");
    expect(formatWibDateTime("")).toBe("-");
    expect(formatWibDateOnly(null)).toBe("-");
    expect(formatWibDateOnly("")).toBe("-");
  });
});
