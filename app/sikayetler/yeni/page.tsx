"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppShell, { Icon } from "../../components/AppShell";
import { supabase } from "../../lib/supabase";

export default function YeniSikayetPage() {
  const router = useRouter();

  const [customer, setCustomer] = useState("");
  const [subject, setSubject] = useState("");
  const [complaintDate, setComplaintDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [priority, setPriority] = useState("Orta");
  const [projectCode, setProjectCode] = useState("");
  const [productProcess, setProductProcess] = useState("");
  const [responsible, setResponsible] = useState("");
  const [description, setDescription] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function generateComplaintNo() {
    const year = new Date().getFullYear().toString().slice(-2);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `SK-${year}-${random}`;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setError("");

    if (!customer.trim()) {
      setError("Müşteri bilgisi girilmelidir.");
      return;
    }

    if (!subject.trim()) {
      setError("Şikayet konusu girilmelidir.");
      return;
    }

    setSaving(true);

    const complaintNo = generateComplaintNo();

    const { error: insertError } = await supabase
      .from("complaints")
      .insert({
        complaint_no: complaintNo,
        customer: customer.trim(),
        subject: subject.trim(),
        complaint_date: complaintDate,
        status: "Açık",
        priority,
        project_code: projectCode.trim() || null,
        product_process: productProcess.trim() || null,
        responsible: responsible.trim() || null,
        description: description.trim() || null,
      });

    if (insertError) {
      setError(
        insertError.message || "Şikayet kaydedilirken bir hata oluştu."
      );
      setSaving(false);
      return;
    }

    router.push(`/sikayetler/${complaintNo}`);
  }

  return (
    <AppShell>
      <main className="min-h-[calc(100vh-58px)] bg-[#f5f7fa]">
        {/* ÜST BAŞLIK */}
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between px-8 py-5">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-slate-500">
                <Link
                  href="/sikayetler"
                  className="transition hover:text-blue-600"
                >
                  Şikayetler
                </Link>

                <span className="text-slate-300">/</span>

                <span>Yeni Kayıt</span>
              </div>

              <h1 className="text-[25px] font-bold tracking-[-0.02em] text-slate-900">
                Yeni Şikayet Ekle
              </h1>

              <p className="mt-1 text-[13px] text-slate-500">
                Müşteri şikayetini kalite yönetim sistemine kaydedin.
              </p>
            </div>

            <Link
              href="/sikayetler"
              className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <span className="text-[18px]">←</span>
              Şikayetlere Dön
            </Link>
          </div>
        </div>

        {/* İÇERİK */}
        <div className="mx-auto max-w-[1500px] px-8 py-7">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-12 gap-6">
              {/* SOL ANA FORM */}
              <div className="col-span-12 xl:col-span-8">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
                  {/* SECTION HEADER */}
                  <div className="border-b border-slate-200 px-7 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <Icon name="message" size={18} />
                      </div>

                      <div>
                        <h2 className="text-[15px] font-bold text-slate-900">
                          Şikayet Bilgileri
                        </h2>

                        <p className="mt-0.5 text-[12px] text-slate-500">
                          Şikayete ait temel bilgileri girin.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* FORM */}
                  <div className="p-7">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                      {/* MÜŞTERİ */}
                      <Field label="Müşteri" required>
                        <input
                          value={customer}
                          onChange={(e) => setCustomer(e.target.value)}
                          placeholder="Müşteri adını girin"
                          className="input"
                        />
                      </Field>

                      {/* TARİH */}
                      <Field label="Şikayet Tarihi" required>
                        <input
                          type="date"
                          value={complaintDate}
                          onChange={(e) => setComplaintDate(e.target.value)}
                          className="input"
                        />
                      </Field>

                      {/* KONU */}
                      <div className="col-span-2">
                        <Field label="Şikayet Konusu" required>
                          <input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Örn. Ürün yüzeyinde kaplama problemi"
                            className="input"
                          />
                        </Field>
                      </div>

                      {/* PROJE */}
                      <Field label="Proje Kodu">
                        <input
                          value={projectCode}
                          onChange={(e) => setProjectCode(e.target.value)}
                          placeholder="Örn. TK-2601-001"
                          className="input"
                        />
                      </Field>

                      {/* ÜRÜN / PROSES */}
                      <Field label="Ürün / Proses">
                        <input
                          value={productProcess}
                          onChange={(e) =>
                            setProductProcess(e.target.value)
                          }
                          placeholder="Örn. C Profil / Rollform"
                          className="input"
                        />
                      </Field>

                      {/* ÖNCELİK */}
                      <Field label="Öncelik">
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value)}
                          className="input cursor-pointer"
                        >
                          <option value="Düşük">Düşük</option>
                          <option value="Orta">Orta</option>
                          <option value="Yüksek">Yüksek</option>
                          <option value="Kritik">Kritik</option>
                        </select>
                      </Field>

                      {/* SORUMLU */}
                      <Field label="Sorumlu">
                        <input
                          value={responsible}
                          onChange={(e) => setResponsible(e.target.value)}
                          placeholder="Sorumlu kişi"
                          className="input"
                        />
                      </Field>

                      {/* AÇIKLAMA */}
                      <div className="col-span-2">
                        <Field label="Şikayet Açıklaması">
                          <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Müşteriden gelen şikayetin detaylarını açıklayın..."
                            rows={7}
                            className="input resize-none py-3"
                          />

                          <div className="mt-2 flex justify-between">
                            <span className="text-[11px] text-slate-400">
                              Mümkün olduğunca açıklayıcı bilgi girin.
                            </span>

                            <span className="text-[11px] text-slate-400">
                              {description.length} karakter
                            </span>
                          </div>
                        </Field>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BUTONLAR */}
                <div className="mt-5 flex items-center justify-between">
                  <Link
                    href="/sikayetler"
                    className="h-11 rounded-lg border border-slate-200 bg-white px-6 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 flex items-center"
                  >
                    Vazgeç
                  </Link>

                  <button
                    type="submit"
                    disabled={saving}
                    className="flex h-11 items-center gap-2 rounded-lg bg-[#1261d6] px-7 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(18,97,214,0.22)] transition hover:bg-[#0e55bf] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <span className="text-[17px]">✓</span>
                        Şikayeti Kaydet
                      </>
                    )}
                  </button>
                </div>

                {/* HATA */}
                {error && (
                  <div className="mt-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                    <span className="mt-0.5 font-bold">!</span>

                    <div>
                      <div className="font-semibold">
                        Kayıt oluşturulamadı
                      </div>

                      <div className="mt-0.5 text-red-600">{error}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* SAĞ BİLGİ PANELİ */}
              <div className="col-span-12 xl:col-span-4">
                <div className="space-y-5">
                  {/* KAYIT BİLGİSİ */}
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
                    <div className="border-b border-slate-200 px-6 py-5">
                      <h3 className="text-[14px] font-bold text-slate-900">
                        Kayıt Süreci
                      </h3>

                      <p className="mt-1 text-[12px] text-slate-500">
                        Şikayet kaydı oluşturulduktan sonra izlenecek süreç.
                      </p>
                    </div>

                    <div className="px-6 py-5">
                      <ProcessStep
                        number="01"
                        title="Şikayet Kaydı"
                        description="Müşteri şikayeti sisteme alınır."
                        active
                      />

                      <ProcessStep
                        number="02"
                        title="Değerlendirme"
                        description="Şikayet kalite ekibi tarafından incelenir."
                      />

                      <ProcessStep
                        number="03"
                        title="Kök Neden Analizi"
                        description="Gerekli durumlarda 8D süreci başlatılır."
                      />

                      <ProcessStep
                        number="04"
                        title="Aksiyon ve Kapanış"
                        description="Düzeltici faaliyetler takip edilir."
                        last
                      />
                    </div>
                  </div>

                  {/* DURUM */}
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
                    <div className="border-b border-slate-200 px-6 py-5">
                      <h3 className="text-[14px] font-bold text-slate-900">
                        İlk Kayıt Durumu
                      </h3>
                    </div>

                    <div className="p-6">
                      <div className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                        <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />

                        <div>
                          <div className="text-[13px] font-bold text-blue-800">
                            Açık
                          </div>

                          <div className="text-[11px] text-blue-600">
                            Kayıt oluşturulduğunda otomatik atanır.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BİLGİ */}
                  <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-6">
                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
                        <Icon name="alert" size={16} />
                      </div>

                      <div>
                        <h3 className="text-[13px] font-bold text-slate-800">
                          Kayıt öncesi kontrol
                        </h3>

                        <ul className="mt-3 space-y-2 text-[12px] leading-5 text-slate-500">
                          <li>• Müşteri bilgisinin doğru olduğundan emin olun.</li>
                          <li>• Şikayet konusunu mümkün olduğunca açık yazın.</li>
                          <li>• Varsa proje kodunu mutlaka belirtin.</li>
                          <li>• Kritik durumlarda önceliği yükseltin.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>

      <style jsx>{`
        .input {
          width: 100%;
          height: 44px;
          border: 1px solid #dbe2ea;
          border-radius: 8px;
          background: #ffffff;
          padding: 0 13px;
          font-size: 13px;
          color: #0f172a;
          outline: none;
          transition: all 0.15s ease;
        }

        .input::placeholder {
          color: #94a3b8;
        }

        .input:hover {
          border-color: #cbd5e1;
        }

        .input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        textarea.input {
          height: auto;
        }

        select.input {
          appearance: none;
          background-image: linear-gradient(
              45deg,
              transparent 50%,
              #64748b 50%
            ),
            linear-gradient(135deg, #64748b 50%, transparent 50%);
          background-position:
            calc(100% - 18px) 18px,
            calc(100% - 13px) 18px;
          background-size:
            5px 5px,
            5px 5px;
          background-repeat: no-repeat;
          padding-right: 35px;
        }
      `}</style>
    </AppShell>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-[12px] font-bold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {children}
    </div>
  );
}

function ProcessStep({
  number,
  title,
  description,
  active = false,
  last = false,
}: {
  number: string;
  title: string;
  description: string;
  active?: boolean;
  last?: boolean;
}) {
  return (
    <div className="relative flex gap-4">
      {!last && (
        <div className="absolute left-[15px] top-8 h-[calc(100%-8px)] w-px bg-slate-200" />
      )}

      <div
        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
          active
            ? "bg-blue-600 text-white"
            : "border border-slate-200 bg-white text-slate-400"
        }`}
      >
        {number}
      </div>

      <div className="pb-6">
        <div
          className={`text-[13px] font-bold ${
            active ? "text-slate-900" : "text-slate-700"
          }`}
        >
          {title}
        </div>

        <div className="mt-1 text-[11px] leading-4 text-slate-500">
          {description}
        </div>
      </div>
    </div>
  );
}