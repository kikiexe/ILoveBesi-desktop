import React, { useState } from "react";
import { supabase } from "../lib/supabase";

interface LoginScreenProps {
  onLoginSuccess: (user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  }) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage("Email dan password wajib diisi");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error("Sesi pengguna tidak valid.");
      }

      // Verify user profile with auto-provisioning fallback
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", data.user.id)
        .maybeSingle();

      let userProfile = profile;
      if (!userProfile) {
        const fallbackName =
          (data.user.user_metadata?.full_name as string) ||
          data.user.email?.split("@")[0] ||
          "Kasir Toko";

        const { data: createdProfile } = await supabase
          .from("profiles")
          .insert({
            id: data.user.id,
            full_name: fallbackName,
            role: "owner",
          })
          .select("id, full_name, role")
          .single();

        userProfile = createdProfile || {
          id: data.user.id,
          full_name: fallbackName,
          role: "owner",
        };
      }

      onLoginSuccess({
        id: userProfile.id,
        email: data.user.email || "",
        fullName: userProfile.full_name,
        role: userProfile.role,
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Gagal masuk. Periksa email dan password Anda.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-md border border-slate-300 bg-white p-8 shadow-sm">
        <div className="mb-6 border-b border-slate-200 pb-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              ILuvBesi
            </span>
            <span className="rounded bg-blue-900 px-2.5 py-1 text-xs font-bold text-white">
              POS Desktop
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-700">
            Masuk Kasir POS Toko Besi
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-4 rounded border border-red-300 bg-red-100 p-3 text-xs font-semibold text-red-800"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-bold text-slate-900"
            >
              Email Kasir
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kasir@ilovebesi.com"
              className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-bold text-slate-900"
            >
              Kata Sandi
            </label>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan kata sandi"
              className="mt-1 h-10 w-full rounded border border-slate-300 px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-6 flex h-11 w-full items-center justify-center rounded bg-blue-900 px-4 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
          >
            {isLoading ? "Memproses..." : "Masuk ke Layar Kasir [Enter]"}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-200 pt-3 text-center">
          <p className="text-[11px] text-slate-700">
            Sistem Kasir Offline-Ready & Sinkronisasi Supabase Realtime
          </p>
        </div>
      </div>
    </div>
  );
}
