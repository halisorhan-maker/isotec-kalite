"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";
import {
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showForgotPassword, setShowForgotPassword] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      console.error("Giriş hatası:", error);

      setErrorMessage(
        `E-posta veya şifre hatalı. (${error.message})`
      );

      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleForgotPassword(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setResetLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setErrorMessage("Lütfen e-posta adresinizi girin.");
      setResetLoading(false);
      return;
    }

    const supabase = createClient();

    const redirectTo =
      `${window.location.origin}/auth/callback?next=/update-password`;

    console.log("Şifre sıfırlama gönderiliyor:", {
      email: cleanEmail,
      redirectTo,
    });

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo,
        }
      );

    if (error) {
      console.error(
        "Şifre sıfırlama hatası:",
        error
      );

      setErrorMessage(
        `Şifre sıfırlama bağlantısı gönderilemedi: ${error.message}`
      );

      setResetLoading(false);
      return;
    }

    setSuccessMessage(
      "Şifre yenileme bağlantısı e-posta adresinize gönderildi."
    );

    setResetLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md">

        {/* LOGO */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0c1c32] text-white shadow-lg">
            <ShieldCheck size={28} />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            ISOTEC Kalite
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Kalite Yönetim Sistemi
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">

          {!showForgotPassword ? (
            <>
              {/* GİRİŞ */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900">
                  Sisteme Giriş
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Hesabınızla devam edin.
                </p>
              </div>

              <form
                onSubmit={handleLogin}
                className="space-y-5"
              >
                {/* E-POSTA */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    E-posta
                  </label>

                  <div className="relative">
                    <Mail
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="email"
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      placeholder="ornek@firma.com"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>
                </div>

                {/* ŞİFRE */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Şifre
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="password"
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value)
                      }
                      placeholder="••••••••"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {errorMessage}
                  </div>
                )}

                {successMessage && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                    {successMessage}
                  </div>
                )}

                {/* GİRİŞ BUTONU */}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0c1c32] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#122945] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                      Giriş yapılıyor...
                    </>
                  ) : (
                    "Giriş Yap"
                  )}
                </button>
              </form>

              {/* ŞİFREMİ UNUTTUM */}
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setErrorMessage("");
                    setSuccessMessage("");
                  }}
                  className="text-sm font-semibold text-blue-600 transition hover:text-blue-800 hover:underline"
                >
                  Şifremi Unuttum
                </button>
              </div>
            </>
          ) : (
            <>
              {/* ŞİFRE SIFIRLAMA */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setErrorMessage("");
                    setSuccessMessage("");
                  }}
                  className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-800"
                >
                  <ArrowLeft size={16} />
                  Giriş ekranına dön
                </button>

                <h2 className="text-xl font-bold text-slate-900">
                  Şifrenizi mi unuttunuz?
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Hesabınıza kayıtlı e-posta adresini girin.
                  Şifre yenileme bağlantısını size gönderelim.
                </p>
              </div>

              <form
                onSubmit={handleForgotPassword}
                className="space-y-5"
              >
                {/* E-POSTA */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    E-posta
                  </label>

                  <div className="relative">
                    <Mail
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="email"
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      placeholder="ornek@firma.com"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {errorMessage}
                  </div>
                )}

                {successMessage && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                    {successMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0c1c32] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#122945] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resetLoading ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                      Gönderiliyor...
                    </>
                  ) : (
                    "Şifre Yenileme Bağlantısı Gönder"
                  )}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 border-t border-slate-100 pt-5 text-center">
            <p className="text-xs text-slate-400">
              ISOTEC Enerji A.Ş. • Kalite Yönetim Sistemi
            </p>
          </div>

        </div>
      </div>
    </main>
  );
}