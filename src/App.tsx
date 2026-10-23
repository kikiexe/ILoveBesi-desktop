import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "./lib/supabase";
import type {
  CashierProduct,
  Customer,
  CartItem,
  ActiveModal,
  PrintDocumentData,
  CashierShift,
} from "./types/pos.types";
import { calculateInvoiceTotals, calculateItemSubtotal } from "./utils/calculation";
import { usePosShortcuts } from "./hooks/usePosShortcuts";

import LoginScreen from "./components/LoginScreen";
import PosHeader from "./components/PosHeader";
import QuickItemInput, { type QuickItemInputHandle } from "./components/QuickItemInput";
import InvoiceGrid from "./components/InvoiceGrid";
import ShortcutToolbar from "./components/ShortcutToolbar";
import CustomerModal from "./components/CustomerModal";
import StockLookupModal from "./components/StockLookupModal";
import TodayHistoryModal from "./components/TodayHistoryModal";
import InstallmentModal from "./components/InstallmentModal";
import PaymentModal from "./components/PaymentModal";
import PrintableDocument from "./components/PrintableDocument";
import CashierShiftModal from "./components/CashierShiftModal";
import AppUpdateModal from "./components/AppUpdateModal";
import SettingsModal from "./components/SettingsModal";
import { getPosSettings, savePosSettings } from "./utils/settingsStorage";
import type { PosSettings } from "./types/settings.types";
import { invoke } from "@tauri-apps/api/core";
import { formatThermalTextReceipt } from "./utils/thermalTextReceipt";
import { getAppVersion, FALLBACK_APP_VERSION } from "./utils/version";

interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export default function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Shift state
  const [activeShift, setActiveShift] = useState<CashierShift | null>(null);

  // Products master data (Strictly from v_cashier_products view to prevent HPP leak)
  const [products, setProducts] = useState<CashierProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);

  // POS Transaction state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  // Settings state
  const [posSettings, setPosSettings] = useState<PosSettings>(getPosSettings);

  // App version state
  const [appVersion, setAppVersion] = useState<string>(FALLBACK_APP_VERSION);

  useEffect(() => {
    getAppVersion().then((ver) => {
      if (ver) setAppVersion(ver);
    });
  }, []);

  // Print document state
  const [printDocumentData, setPrintDocumentData] = useState<PrintDocumentData | null>(null);

  // Ref to search input
  const quickInputRef = useRef<QuickItemInputHandle>(null);

  // Calculate financial figures
  const { subtotalAmount, grandTotal } = useMemo(() => {
    return calculateInvoiceTotals(cartItems, 0, 0);
  }, [cartItems]);

  const totalQty = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.qty, 0);
  }, [cartItems]);

  // Load products strictly from v_cashier_products view
  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    setProductError(null);
    try {
      const { data, error } = await supabase
        .from("v_cashier_products")
        .select("*")
        .order("sku", { ascending: true });

      if (error) throw new Error(error.message);
      setProducts(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat katalog barang";
      setProductError(msg);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  // Check active shift for current user
  const checkActiveShift = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("cashier_shifts")
        .select("*")
        .eq("status", "OPEN")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (data) {
        setActiveShift(data);
      } else {
        setActiveShift(null);
        setActiveModal("CASHIER_SHIFT_OPEN");
      }
    } catch {
      setActiveShift(null);
      setActiveModal("CASHIER_SHIFT_OPEN");
    }
  }, []);

  // Check existing session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session && session.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, role")
            .eq("id", session.user.id)
            .maybeSingle();

          let userProfile = profile;
          if (!userProfile) {
            const fallbackName =
              (session.user.user_metadata?.full_name as string) ||
              session.user.email?.split("@")[0] ||
              "Kasir Toko";

            const { data: createdProfile } = await supabase
              .from("profiles")
              .insert({
                id: session.user.id,
                full_name: fallbackName,
                role: "owner",
              })
              .select("id, full_name, role")
              .single();

            userProfile = createdProfile || {
              id: session.user.id,
              full_name: fallbackName,
              role: "owner",
            };
          }

          setCurrentUser({
            id: userProfile.id,
            email: session.user.email || "",
            fullName: userProfile.full_name,
            role: userProfile.role,
          });
          loadProducts();
          checkActiveShift();
        }
      } catch {
        setCurrentUser(null);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkSession();
  }, [loadProducts, checkActiveShift]);

  // Handle Login success
  const handleLoginSuccess = (user: CurrentUser) => {
    setCurrentUser(user);
    loadProducts();
    checkActiveShift();
  };

  // Shift success handlers
  const handleOpenShiftSuccess = (shift: CashierShift) => {
    setActiveShift(shift);
    setActiveModal(null);
    setTimeout(() => {
      quickInputRef.current?.focusSearch();
    }, 100);
  };

  const handleCloseShiftSuccess = () => {
    setActiveShift(null);
    setCartItems([]);
    setSelectedCustomer(null);
    setSelectedRowIndex(0);
    setActiveModal("CASHIER_SHIFT_OPEN");
  };

  // Handle Cart item addition
  const handleAddItem = (item: CartItem) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (i) => i.product_id === item.product_id && i.discount_pct === item.discount_pct
      );

      if (existingIndex > -1) {
        const existing = prev[existingIndex];
        const newQty = existing.qty + item.qty;

        if (newQty > item.stock_qty) {
          alert(`Stok tidak mencukupi! Maksimal tersedia: ${item.stock_qty} ${item.unit || "BTG"}`);
          return prev;
        }

        const updatedSubtotal = calculateItemSubtotal(
          newQty,
          existing.unit_price,
          existing.discount_pct,
          0
        );

        const updatedItems = [...prev];
        updatedItems[existingIndex] = {
          ...existing,
          qty: newQty,
          subtotal: updatedSubtotal,
        };
        setSelectedRowIndex(existingIndex);
        return updatedItems;
      }

      const updated = [...prev, item];
      setSelectedRowIndex(updated.length - 1);
      return updated;
    });
  };

  // Update item quantity
  const handleUpdateItemQty = (index: number, newQty: number) => {
    setCartItems((prev) => {
      if (!prev[index]) return prev;
      const target = prev[index];
      const validQty = Math.min(target.stock_qty, Math.max(1, newQty));
      const newSubtotal = calculateItemSubtotal(
        validQty,
        target.unit_price,
        target.discount_pct,
        0
      );

      const updated = [...prev];
      updated[index] = {
        ...target,
        qty: validQty,
        subtotal: newSubtotal,
      };
      return updated;
    });
  };

  // Update item discount
  const handleUpdateItemDiscount = (index: number, newDiscountPct: number) => {
    setCartItems((prev) => {
      if (!prev[index]) return prev;
      const target = prev[index];
      const validDiscount = Math.min(100, Math.max(0, newDiscountPct));
      const newSubtotal = calculateItemSubtotal(
        target.qty,
        target.unit_price,
        validDiscount,
        0
      );

      const updated = [...prev];
      updated[index] = {
        ...target,
        discount_pct: validDiscount,
        subtotal: newSubtotal,
      };
      return updated;
    });
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    setCartItems((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (selectedRowIndex >= updated.length) {
        setSelectedRowIndex(Math.max(0, updated.length - 1));
      }
      return updated;
    });
    quickInputRef.current?.focusSearch();
  };

  // Clear entire invoice
  const handleClearDraft = () => {
    setCartItems([]);
    setSelectedCustomer(null);
    setSelectedRowIndex(0);
    setActiveModal(null);
    quickInputRef.current?.focusSearch();
  };

  // Print execution
  const handleTriggerPrint = async (docData: PrintDocumentData) => {
    const effectiveSettings = docData.settings || posSettings;
    const resolvedData: PrintDocumentData = {
      ...docData,
      settings: effectiveSettings,
    };

    setPrintDocumentData(resolvedData);

    // Direct hardware connection via Tauri Rust (Serial port / RAW TCP LAN)
    if (docData.mode === "STRUK" && effectiveSettings.printerConnection !== "SYSTEM_DRIVER") {
      try {
        const textPayload = formatThermalTextReceipt(resolvedData);
        const targetType =
          effectiveSettings.printerConnection === "NETWORK_LAN" ? "LAN" : "SERIAL";
        const targetPath =
          effectiveSettings.printerConnection === "NETWORK_LAN"
            ? `${effectiveSettings.printerIpAddress}:${effectiveSettings.printerPort}`
            : effectiveSettings.printerTargetName;

        if (targetPath && targetPath.trim()) {
          await invoke("print_raw_thermal", {
            targetType,
            targetPath: targetPath.trim(),
            content: textPayload,
            autoCut: Boolean(effectiveSettings.autoCutPaper),
            openDrawer: Boolean(effectiveSettings.openCashDrawer),
          });
          return;
        }
      } catch (err: unknown) {
        console.warn("Direct thermal print gagal, fallback ke print dialog OS:", err);
      }
    }

    // Default OS Print dialog (CUPS / Spooler) for SYSTEM_DRIVER or Faktur A4
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleTestPrint = (testSettings: PosSettings) => {
    handleTriggerPrint({
      mode: "STRUK",
      invoice_number: `TEST-${Date.now().toString().slice(-4)}`,
      sale_date: new Date().toISOString(),
      customer: {
        code: "TEST-01",
        name: "UJI KONEKSI PRINTER",
        phone: "-",
        address: "-",
      },
      cashier_name: activeShift?.cashier_name || currentUser?.fullName || "Admin Kasir",
      payment_type: "TUNAI",
      payment_status: "LUNAS",
      items: [
        {
          sku: "TEST-PRN",
          name: "Uji Koneksi Perangkat Kasir",
          dimension: testSettings.paperWidth,
          thickness_mm: 1.0,
          qty: 1,
          unit_price: 0,
          discount_pct: 0,
          subtotal: 0,
          include_ppn: false,
        },
      ],
      subtotal_amount: 0,
      discount_amount: 0,
      tax_amount: 0,
      grand_total: 0,
      paid_amount: 0,
      remaining_debt: 0,
      notes: `Koneksi: ${testSettings.printerConnection} | Target: ${testSettings.printerConnection === "NETWORK_LAN" ? `${testSettings.printerIpAddress}:${testSettings.printerPort}` : testSettings.printerTargetName} | Kertas: ${testSettings.paperWidth} | Salinan: ${testSettings.printCopies}x | AutoCut: ${testSettings.autoCutPaper ? "YA" : "TIDAK"} | Laci: ${testSettings.openCashDrawer ? "YA" : "TIDAK"}`,
      settings: testSettings,
    });
  };

  // App exit / logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setCartItems([]);
    setSelectedCustomer(null);
    setActiveModal(null);
  };

  // Global POS Shortcuts Handlers
  usePosShortcuts({
    onF1: () => {
      if (activeModal) return;
      quickInputRef.current?.focusSearch();
    },
    onF5: () => {
      if (activeModal) return;
      if (cartItems.length > 0 && selectedRowIndex >= 0 && selectedRowIndex < cartItems.length) {
        handleRemoveItem(selectedRowIndex);
      }
    },
    onF6: () => {
      if (activeModal) return;
      if (cartItems.length > 0) {
        setActiveModal("CONFIRM_CLEAR");
      } else {
        setSelectedCustomer(null);
      }
    },
    onF7: () => {
      if (activeModal) return;
      if (cartItems.length > 0) {
        setActiveModal("PAYMENT");
      }
    },
    onF8: () => {
      if (activeModal) return;
      setActiveModal("CUSTOMER");
    },
    onF9: () => {
      if (activeModal) return;
      setActiveModal("STOCK_LOOKUP");
    },
    onF10: () => {
      if (activeModal) return;
      setActiveModal("TODAY_HISTORY");
    },
    onF11: () => {
      if (activeModal) return;
      setActiveModal("INSTALLMENT");
    },
    onF12: () => {
      if (activeModal) return;
      setActiveModal("SETTINGS");
    },
    onEscape: () => {
      if (activeModal) {
        if (activeModal === "CASHIER_SHIFT_OPEN") return;
        setActiveModal(null);
        setTimeout(() => {
          quickInputRef.current?.focusSearch();
        }, 50);
      } else {
        setActiveModal("CASHIER_SHIFT_CLOSE");
      }
    },
  });

  // Auth loading state
  if (isCheckingAuth) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-100 font-bold text-slate-700">
        Memeriksa Sesi Kasir POS...
      </div>
    );
  }

  // Not logged in -> Show Login
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-100 select-none">
      {/* 1. Bar Atas: Info Toko, Jam, Kasir, Status Pelanggan, Kotak Total Besar */}
      <PosHeader
        cashierName={activeShift?.cashier_name || currentUser.fullName}
        cashierRole={currentUser.role}
        userEmail={currentUser.email}
        selectedCustomer={selectedCustomer}
        grandTotal={grandTotal}
        storeName={posSettings.storeName}
        appVersion={appVersion}
        onOpenCustomerModal={() => setActiveModal("CUSTOMER")}
        onOpenSettings={() => setActiveModal("SETTINGS")}
      />

      {/* 2. Bar Input Cepat Cari Barang */}
      <QuickItemInput
        ref={quickInputRef}
        products={products}
        onAddItem={handleAddItem}
        onOpenStockLookup={() => setActiveModal("STOCK_LOOKUP")}
      />

      {/* 3. Area Tengah: Grid Faktur Penjualan */}
      <InvoiceGrid
        items={cartItems}
        selectedRowIndex={selectedRowIndex}
        onSelectRow={setSelectedRowIndex}
        onUpdateItemQty={handleUpdateItemQty}
        onUpdateItemDiscount={handleUpdateItemDiscount}
        onRemoveItem={handleRemoveItem}
      />

      {/* 4. Bar Bawah: Shortcut Toolbar & Ringkasan Angka */}
      <ShortcutToolbar
        itemCount={cartItems.length}
        totalQty={totalQty}
        subtotalAmount={subtotalAmount}
        discountAmount={0}
        taxAmount={0}
        grandTotal={grandTotal}
        onF1={() => quickInputRef.current?.focusSearch()}
        onF5={() => {
          if (cartItems.length > 0 && selectedRowIndex < cartItems.length) {
            handleRemoveItem(selectedRowIndex);
          }
        }}
        onF6={() => {
          if (cartItems.length > 0) setActiveModal("CONFIRM_CLEAR");
        }}
        onF7={() => {
          if (cartItems.length > 0) setActiveModal("PAYMENT");
        }}
        onF8={() => setActiveModal("CUSTOMER")}
        onF9={() => setActiveModal("STOCK_LOOKUP")}
        onF10={() => setActiveModal("TODAY_HISTORY")}
        onF11={() => setActiveModal("INSTALLMENT")}
        onF12={() => setActiveModal("SETTINGS")}
        onEsc={() => setActiveModal("CASHIER_SHIFT_CLOSE")}
      />

      {/* ========================================================= */}
      {/* Modals Operasional */}
      {/* ========================================================= */}

      {/* Modal [F8] Pelanggan */}
      <CustomerModal
        isOpen={activeModal === "CUSTOMER"}
        onClose={() => {
          setActiveModal(null);
          quickInputRef.current?.focusSearch();
        }}
        onSelectCustomer={setSelectedCustomer}
        currentCustomer={selectedCustomer}
      />

      {/* Modal [F9] Cek Stok */}
      <StockLookupModal
        isOpen={activeModal === "STOCK_LOOKUP"}
        onClose={() => {
          setActiveModal(null);
          quickInputRef.current?.focusSearch();
        }}
        products={products}
        isLoading={isLoadingProducts}
        errorMessage={productError}
        onRefresh={loadProducts}
        onSelectProduct={(p) => {
          quickInputRef.current?.focusSearch();
          // Pre-populate search query
          setTimeout(() => {
            handleAddItem({
              product_id: p.id || "",
              sku: p.sku || "",
              name: p.name || "",
              dimension: p.dimension || "",
              thickness_mm: Number(p.thickness_mm || 0),
              unit: p.unit || "BTG",
              stock_qty: p.stock_qty || 0,
              qty: 1,
              unit_price: Number(p.sell_price || 0),
              discount_pct: 0,
              tax_pct: 0,
              subtotal: Number(p.sell_price || 0),
              include_ppn: Boolean(p.include_ppn),
            });
          }, 50);
        }}
      />

      {/* Modal [F10] Histori Hari Ini */}
      <TodayHistoryModal
        isOpen={activeModal === "TODAY_HISTORY"}
        onClose={() => {
          setActiveModal(null);
          quickInputRef.current?.focusSearch();
        }}
        products={products}
        onTriggerPrint={handleTriggerPrint}
      />

      {/* Modal [F11] Terima Cicilan Piutang */}
      <InstallmentModal
        isOpen={activeModal === "INSTALLMENT"}
        onClose={() => {
          setActiveModal(null);
          quickInputRef.current?.focusSearch();
        }}
      />

      {/* Modal [F7] Bayar & Simpan */}
      <PaymentModal
        isOpen={activeModal === "PAYMENT"}
        onClose={() => {
          setActiveModal(null);
          quickInputRef.current?.focusSearch();
        }}
        items={cartItems}
        customer={selectedCustomer}
        cashierName={activeShift?.cashier_name || currentUser.fullName}
        initialSubtotal={subtotalAmount}
        settings={posSettings}
        onOpenCustomerModal={() => setActiveModal("CUSTOMER")}
        onSaleCompleted={() => {
          setCartItems([]);
          setSelectedCustomer(null);
          setSelectedRowIndex(0);
          loadProducts(); // Refresh local stock balance
        }}
        onTriggerPrint={handleTriggerPrint}
      />

      {/* Dialog Konfirmasi Batal Nota [F6] */}
      {activeModal === "CONFIRM_CLEAR" && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <div className="w-full max-w-sm rounded-md border border-slate-300 bg-white p-5 shadow-xl text-center">
            <h3 className="text-base font-bold text-slate-900">
              Kosongkan Faktur Berjalan?
            </h3>
            <p className="mt-2 text-xs text-slate-700">
              Seluruh {cartItems.length} barang di keranjang faktur saat ini akan dibatalkan.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="h-10 rounded border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleClearDraft}
                className="h-10 rounded bg-red-700 px-4 text-xs font-bold text-white hover:bg-red-800"
              >
                Ya, Batal Nota [Enter]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Buka & Tutup Kasir (Shift) */}
      <CashierShiftModal
        isOpen={activeModal === "CASHIER_SHIFT_OPEN" || activeModal === "CASHIER_SHIFT_CLOSE"}
        mode={activeModal === "CASHIER_SHIFT_OPEN" ? "OPEN" : "CLOSE"}
        activeShift={activeShift}
        onOpenShiftSuccess={handleOpenShiftSuccess}
        onCloseShiftSuccess={handleCloseShiftSuccess}
        onCancelClose={() => {
          setActiveModal(null);
          quickInputRef.current?.focusSearch();
        }}
        onLogout={handleLogout}
      />

      {/* Modal Notifikasi Pembaruan Aplikasi (Auto-Updater) */}
      <AppUpdateModal />

      {/* Modal [F12] Pengaturan Toko & Kasir POS */}
      <SettingsModal
        isOpen={activeModal === "SETTINGS"}
        onClose={() => {
          setActiveModal(null);
          quickInputRef.current?.focusSearch();
        }}
        settings={posSettings}
        appVersion={appVersion}
        onSaveSettings={(newSettings) => {
          savePosSettings(newSettings);
          setPosSettings(newSettings);
        }}
        onTestPrint={handleTestPrint}
      />

      {/* Komponen Cetak Faktur & Surat Jalan (@media print) */}
      <PrintableDocument data={printDocumentData} />
    </div>
  );
}
