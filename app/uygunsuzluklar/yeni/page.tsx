"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  FileText,
  Save,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import AppShell from "../../components/AppShell";
import { supabase } from "../../lib/supabase";

function getCurrentDate() {
  return new Date().toISOString().split("T")[0];
}

function generateNonconformityNo() {
  const year = new Date().getFullYear().toString().slice(-2);
  const randomNumber = Math.floor(1000 + Math.random() * 9000);

  return `UY-${year}-${randomNumber}`;
}

export default function YeniUygunsuzlukPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    nonconformity_date: getCurrentDate(),
    source: "Üretim",
    customer: "",
    project_code: "",
    product_process: "",
    subject: "",
    description: "",
    priority: "Orta",
    responsible: "",
    target_date: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateField(field: string, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!form.subject.trim()) {
      setError("Uygunsuzluk konusu zorunludur.");
      return;
    }

    if (!form.nonconformity_date) {
      setError("Uygunsuzluk tarihi zorunludur.");
      return;
    }

    setSaving(true);

    let nonconformityNo = generateNonconformityNo();

    // Aynı numaranın oluşma ihtimaline karşı kontrol ediyoruz.
    const { data: existing } = await supabase
      .from("nonconformities")
      .select("id")
      .eq("nonconformity_no", nonconformityNo)
      .maybeSingle();

    if (existing) {
      nonconformityNo = generateNonconformityNo();
    }

    const { data, error: insertError } = await supabase
      .from("nonconformities")
      .insert({
        nonconformity_no: nonconformityNo,
        nonconformity_date: form.nonconformity_date,
        source: form.source,
        customer: form.customer.trim() || null,
        project_code: form.project_code.trim() || null,
        product_process: form.product_process.trim() || null,
        subject: form.subject.trim(),
        description: form.description.trim() || null,
        priority: form.priority,
        status: "Açık",
        responsible: form.responsible.trim() || null,
        target_date: form.target_date || null,
      })
      .select()
      .single();

    if (insertError) {
      setError(`Uygunsuzluk kaydedilemedi: ${insertError.message}`);
      setSaving(false);
      return;
    }

    router.push(`/uygunsuzluklar/${data.nonconformity_no}`);
  }

  return (
    <AppShell>
      <div className="box-border w-full min-w-0 max-w-full overflow-x-hidden px-8 py-6">
        <div className="mx-auto w-full max-w-6xl space-y-6">
          {/* HEADER */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Link
                href="/uygunsuzluklar"
                className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-blue-600"
              >
                <ArrowLeft className="h-4 w-4" />
                Uygunsuzluklara Dön
              </Link>

              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <ShieldAlert className="h-5 w-5" />
                </div>

                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Yeni Uygunsuzluk
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    Yeni bir kalite uygunsuzluğu kaydı oluşturun.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* TEMEL BİLGİLER */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <FileText className="h-4 w-4" />
                  </div>

                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Temel Bilgiler
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Uygunsuzluğun temel kayıt bilgilerini girin.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
                {/* TARİH */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Uygunsuzluk Tarihi *
                  </label>

                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      type="date"
                      value={form.nonconformity_date}
                      onChange={(event) =>
                        updateField(
                          "nonconformity_date",
                          event.target.value
                        )
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* KAYNAK */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Uygunsuzluk Kaynağı *
                  </label>

                  <select
                    value={form.source}
                    onChange={(event) =>
                      updateField("source", event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="Üretim">Üretim</option>
                    <option value="Kalite Kontrol">Kalite Kontrol</option>
                    <option value="Tedarikçi">Tedarikçi</option>
                    <option value="Müşteri">Müşteri</option>
                    <option value="İç Denetim">İç Denetim</option>
                    <option value="Sevkiyat">Sevkiyat</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>

                {/* MÜŞTERİ */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Müşteri
                  </label>

                  <input
                    type="text"
                    value={form.customer}
                    onChange={(event) =>
                      updateField("customer", event.target.value)
                    }
                    placeholder="Örn. Siming Trade"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* PROJE */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Proje Kodu
                  </label>

                  <input
                    type="text"
                    value={form.project_code}
                    onChange={(event) =>
                      updateField("project_code", event.target.value)
                    }
                    placeholder="Örn. TK-2601-001"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* ÜRÜN */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Ürün / Proses
                  </label>

                  <input
                    type="text"
                    value={form.product_process}
                    onChange={(event) =>
                      updateField("product_process", event.target.value)
                    }
                    placeholder="Örn. C Profil / Rollform"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* SORUMLU */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Sorumlu
                  </label>

                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      value={form.responsible}
                      onChange={(event) =>
                        updateField("responsible", event.target.value)
                      }
                      placeholder="Sorumlu kişi"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* UYGUNSUZLUK DETAYI */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-base font-bold text-slate-900">
                  Uygunsuzluk Detayı
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Problemi mümkün olduğunca açık ve anlaşılır şekilde
                  tanımlayın.
                </p>
              </div>

              <div className="space-y-5 p-6">
                {/* KONU */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Uygunsuzluk Konusu *
                  </label>

                  <input
                    type="text"
                    value={form.subject}
                    onChange={(event) =>
                      updateField("subject", event.target.value)
                    }
                    placeholder="Örn. Profil ölçüsü tolerans dışında"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* AÇIKLAMA */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Açıklama
                  </label>

                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      updateField("description", event.target.value)
                    }
                    rows={6}
                    placeholder="Uygunsuzluğun nasıl tespit edildiğini, hangi üründe/proseste görüldüğünü ve mevcut durumu açıklayın..."
                    className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </section>

            {/* ÖNCELİK VE TERMİN */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-base font-bold text-slate-900">
                  Öncelik ve Termin
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Uygunsuzluğun önem derecesini ve hedef kapanış tarihini
                  belirleyin.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
                {/* ÖNCELİK */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Öncelik *
                  </label>

                  <select
                    value={form.priority}
                    onChange={(event) =>
                      updateField("priority", event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="Düşük">Düşük</option>
                    <option value="Orta">Orta</option>
                    <option value="Yüksek">Yüksek</option>
                    <option value="Kritik">Kritik</option>
                  </select>
                </div>

                {/* TERMİN */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Hedef Kapanış Tarihi
                  </label>

                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      type="date"
                      value={form.target_date}
                      onChange={(event) =>
                        updateField("target_date", event.target.value)
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* FOOTER */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/uygunsuzluklar"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Vazgeç
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1769e0] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#125bc2] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />

                {saving ? "Kaydediliyor..." : "Uygunsuzluğu Kaydet"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}