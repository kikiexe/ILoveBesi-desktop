import { PosSettings, DEFAULT_POS_SETTINGS } from "../types/settings.types";

const SETTINGS_STORAGE_KEY = "iluvbesi_pos_settings_v1";

export function getPosSettings(): PosSettings {
  if (typeof window === "undefined" || !window.localStorage) {
    return DEFAULT_POS_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_POS_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_POS_SETTINGS,
      ...parsed,
    };
  } catch {
    return DEFAULT_POS_SETTINGS;
  }
}

export function savePosSettings(settings: PosSettings): boolean {
  if (typeof window === "undefined" || !window.localStorage) {
    return false;
  }

  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}
