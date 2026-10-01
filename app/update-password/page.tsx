"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";
import {
  Loader2,
  LockKeyhole,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleUpdatePassword(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (password.length < 6) {
      setErrorMessage(
        "Şifre en az 6 karakter olmalıdır."
      );
      return;
    }

    if (password !== passwordAgain) {
      setErrorMessage(
        "Şifreler birbiriyle eşleşmiyor."
      );
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const { error } =
      await supabase.auth.updateUser({
        password,
      });

    if (error) {
      setErrorMessage(
        "Şifre güncellenemedi. Lütfen şifre yenileme bağlantısını tekrar kullanın."
      );
      setLoading(false);
      return;
    }

    setSuccessMessage(
      "Şifreniz başarıyla güncellendi."
    );

    setLoading(false);

    setTimeout(() => {
      router.replace("/login");
      router.refresh();
    }, 1500);
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

          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              Yeni Şifre Belirle
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Hesabınız için yeni bir şifre belirleyin.
            </p>
          </div>

          <form
            onSubmit={handleUpdatePassword}
            className="space-y-5"
          >

            {/* YENİ ŞİFRE */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Yeni Şifre
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
                  placeholder="En az 6 karakter"
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />
              </div>
            </div>

            {/* ŞİFRE TEKRAR */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Yeni Şifre Tekrar
              </label>

              <div className="relative">
                <LockKeyhole
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="password"
                  value={passwordAgain}
                  onChange={(e) =>
                    setPasswordAgain(e.target.value)
                  }
                  placeholder="Şifrenizi tekrar girin"
                  required
                  minLength={6}
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
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                <CheckCircle2 size={18} />
                {successMessage}
              </div>
            )}

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
                  Şifre güncelleniyor...
                </>
              ) : (
                "Şifreyi Güncelle"
              )}
            </button>

          </form>

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