import { getVersion } from "@tauri-apps/api/app";

export const FALLBACK_APP_VERSION = "1.1.5";

export async function getAppVersion(): Promise<string> {
  try {
    const v = await getVersion();
    return v || FALLBACK_APP_VERSION;
  } catch {
    return FALLBACK_APP_VERSION;
  }
}
