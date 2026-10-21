import { useState, useEffect } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

interface AppUpdateModalProps {
  onCheckingChange?: (isChecking: boolean) => void;
}

export default function AppUpdateModal({ onCheckingChange }: AppUpdateModalProps) {
  const [updateAvailable, setUpdateAvailable] = useState<Update | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkForUpdate() {
      try {
        if (onCheckingChange) onCheckingChange(true);
        const update = await check();
        if (isMounted && update?.available) {
          setUpdateAvailable(update);
          setIsOpen(true);
        }
      } catch (err: unknown) {
        console.warn("Pengecekan update:", err);
      } finally {
        if (isMounted && onCheckingChange) onCheckingChange(false);
      }
    }

    checkForUpdate();

    return () => {
      isMounted = false;
    };
  }, [onCheckingChange]);

  const handleDownloadAndInstall = async () => {
    if (!updateAvailable) return;

    setIsDownloading(true);
    setErrorMessage(null);
    setDownloadProgress(0);

    try {
      let downloaded = 0;
      let total = 0;

      await updateAvailable.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            total = event.data.contentLength || 0;
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            if (total > 0) {
              setDownloadProgress(Math.min(100, Math.round((downloaded / total) * 100)));
            }
            break;
          case "Finished":
            setDownloadProgress(100);
            break;
        }
      });

      await relaunch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengunduh atau memasang pembaruan";
      setErrorMessage(msg);
      setIsDownloading(false);
    }
  };

  if (!isOpen || !updateAvailable) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 select-none"
    >
      <div className="w-full max-w-md rounded-md border border-slate-300 bg-white p-6 shadow-2xl">
        <div className="mb-4 border-b border-slate-200 pb-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Pembaruan Tersedia</h2>
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-mono font-bold text-blue-900 border border-blue-200">
              v{updateAvailable.version}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Versi terbaru aplikasi ILoveBesi POS telah dirilis dengan perbaikan dan peningkatan fitur.
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-4 rounded border border-red-300 bg-red-50 p-2.5 text-xs text-red-800"
          >
            {errorMessage}
          </div>
        )}

        {updateAvailable.body && (
          <div className="mb-4 max-h-36 overflow-y-auto rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 font-sans whitespace-pre-wrap leading-relaxed">
            {updateAvailable.body}
          </div>
        )}

        {isDownloading ? (
          <div className="space-y-2 py-3">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Mengunduh pembaruan...</span>
              <span className="font-mono">{downloadProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded bg-slate-200">
              <div
                className="h-full bg-blue-900 transition-all duration-200"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Aplikasi akan dimulai ulang secara otomatis setelah instalasi selesai.
            </p>
          </div>
        ) : (
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              autoFocus
              onClick={handleDownloadAndInstall}
              className="h-11 w-full rounded bg-blue-900 px-4 text-xs font-bold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
            >
              Perbarui Sekarang [Enter]
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="h-10 w-full rounded border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
            >
              Nanti Saja (Lanjut Transaksi)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
