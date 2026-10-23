import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getPosSettings, savePosSettings } from "./settingsStorage";
import { DEFAULT_POS_SETTINGS, PosSettings } from "../types/settings.types";

describe("settingsStorage", () => {
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    mockStore = {};
    const mockLocalStorage = {
      getItem: (key: string) => mockStore[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStore[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStore[key];
      },
      clear: () => {
        mockStore = {};
      },
    };

    (globalThis as unknown as { window: unknown }).window = {
      localStorage: mockLocalStorage,
    };
  });

  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it("returns default settings when storage is empty", () => {
    const settings = getPosSettings();
    expect(settings).toEqual(DEFAULT_POS_SETTINGS);
    expect(settings.paperWidth).toBe("80mm");
    expect(settings.defaultShowPpn).toBe(true);
  });

  it("saves and loads customized settings", () => {
    const custom: PosSettings = {
      ...DEFAULT_POS_SETTINGS,
      storeName: "Besi Perkasa Abadi",
      paperWidth: "58mm",
      bankName: "Mandiri",
      bankAccountNumber: "9876543210",
      bankAccountName: "PT Besi Perkasa",
      defaultShowPpn: false,
      printerConnection: "NETWORK_LAN",
      printerIpAddress: "192.168.1.150",
      printerPort: 9100,
      printCopies: 2,
      autoCutPaper: true,
      openCashDrawer: true,
    };

    const saved = savePosSettings(custom);
    expect(saved).toBe(true);

    const loaded = getPosSettings();
    expect(loaded.storeName).toBe("Besi Perkasa Abadi");
    expect(loaded.paperWidth).toBe("58mm");
    expect(loaded.bankName).toBe("Mandiri");
    expect(loaded.bankAccountNumber).toBe("9876543210");
    expect(loaded.bankAccountName).toBe("PT Besi Perkasa");
    expect(loaded.defaultShowPpn).toBe(false);
    expect(loaded.printerConnection).toBe("NETWORK_LAN");
    expect(loaded.printerIpAddress).toBe("192.168.1.150");
    expect(loaded.printerPort).toBe(9100);
    expect(loaded.printCopies).toBe(2);
    expect(loaded.autoCutPaper).toBe(true);
    expect(loaded.openCashDrawer).toBe(true);
  });

  it("handles corrupted storage gracefully", () => {
    mockStore["iluvbesi_pos_settings_v1"] = "INVALID_JSON{";
    const settings = getPosSettings();
    expect(settings).toEqual(DEFAULT_POS_SETTINGS);
  });

  it("falls back to defaults when window is undefined", () => {
    delete (globalThis as unknown as { window?: unknown }).window;
    const settings = getPosSettings();
    expect(settings).toEqual(DEFAULT_POS_SETTINGS);
  });
});
