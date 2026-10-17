import { useEffect } from "react";

export interface PosShortcutsHandlers {
  onF1: () => void;
  onF5: () => void;
  onF6: () => void;
  onF7: () => void;
  onF8: () => void;
  onF9: () => void;
  onF10: () => void;
  onF11: () => void;
  onEscape: () => void;
}

export function usePosShortcuts(handlers: PosShortcutsHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "F1":
          e.preventDefault();
          handlers.onF1();
          break;
        case "F5":
          e.preventDefault();
          handlers.onF5();
          break;
        case "F6":
          e.preventDefault();
          handlers.onF6();
          break;
        case "F7":
          e.preventDefault();
          handlers.onF7();
          break;
        case "F8":
          e.preventDefault();
          handlers.onF8();
          break;
        case "F9":
          e.preventDefault();
          handlers.onF9();
          break;
        case "F10":
          e.preventDefault();
          handlers.onF10();
          break;
        case "F11":
          e.preventDefault();
          handlers.onF11();
          break;
        case "Escape":
          e.preventDefault();
          handlers.onEscape();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handlers]);
}
