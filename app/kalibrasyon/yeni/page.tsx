"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppShell, { Icon } from "../../components/AppShell";
import { supabase } from "../../lib/supabase";

export default function YeniKalibrasyonPage() {
  const router = useRouter();

  const [deviceName, setDeviceName] = useState("");
  const [serialNo, setSerialNo] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [lastCalibrationDate, setLastCalibrationDate] = useState("");
  const [nextCalibrationDate, setNextCalibrationDate] = useState("");
  const [calibrationPeriodMonths, setCalibrationPeriodMonths] =
    useState("12");
  const [certificateNo, setCertificateNo] = useState("");
  const [supplier, setSupplier] = useState("");
  const [responsible, setResponsible] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function getCalibrationStatus() {
    if (!nextCalibrationDate) {
      return {
        label: "Tarih Girilmedi",
        color: "bg-slate-100 text-slate-600",
        dot: "bg-slate-400",
      };
    }

    const today = new Date();
    const nextDate = new Date(nextCalibrationDate);
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: "Kalibrasyon Geçmiş",
        color: "bg-red-50 text-red-700",
        dot: "bg-red-500",
      };
    }

    if (diffDays <= 30) {
      return {
        label: "Yaklaşıyor",
        color: "bg-amber-50 text-amber-700",
        dot: "bg-amber-500",
      };
    }

    return {
      label: "Geçerli",
      color: "bg-emerald-50 text-emerald-700",
      dot: "bg-emerald-500",
    };
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");

    if (!deviceName.trim()) {
      setError("Cihaz adı zorunludur.");
      return;
    }

    setSaving(true);

    const status = nextCalibrationDate
      ? new Date(nextCalibrationDate) < new Date()
        ? "Kalibrasyon Geçmiş"
        : "Geçerli"
      : "Tarih Girilmedi";

    const { error: insertError } = await supabase
      .from("calibrations")
      .insert({
        device_name: deviceName.trim(),
        serial_no: serialNo.trim() || null,
        device_type: deviceType.trim() || null,
        department: department.trim() || null,
        location: location.trim() || null,
        last_calibration_date: lastCalibrationDate || null,
        next_calibration_date: nextCalibrationDate || null,
        calibration_period_months:
          Number(calibrationPeriodMonths) || 12,
        status,
        certificate_no: certificateNo.trim() || null,
        supplier: supplier.trim() || null,
        responsible: responsible.trim() || null,
        notes: notes.trim() || null,
      });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    router.push("/kalibrasyon");
  }

  const calibrationStatus = getCalibrationStatus();

  return (
    <AppShell>
      <main className="min-h-screen bg-[#f5f7fa]">
        <div className="mx-auto w-full max-w-[1500px] px-6 py-6">
          {/* Üst Başlık */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
                <Link
                  href="/kalibrasyon"
                  className="transition hover:text-blue-600"
                >
                  Kalibrasyon
                </Link>

                <span>/</span>

                <span className="text-slate-700">
                  Yeni Cihaz Ekle
                </span>
              </div>

              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Yeni Cihaz Ekle
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Kalibrasyon takip sistemine yeni bir cihaz veya ölçüm
                ekipmanı ekleyin.
              </p>
            </div>

            <Link
              href="/kalibrasyon"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              ← Kalibrasyon Listesi
            </Link>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              {/* SOL TARAF */}
              <div className="xl:col-span-8">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
                  {/* Kart Başlığı */}
                  <div className="border-b border-slate-200 px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <Icon name="settings" size={18} />
                      </div>

                      <div>
                        <h2 className="text-sm font-semibold text-slate-900">
                          Cihaz Bilgileri
                        </h2>

                        <p className="mt-0.5 text-xs text-slate-500">
                          Cihaza ait temel bilgileri ve kalibrasyon
                          detaylarını girin.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Form */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
                      <Field
                        label="Cihaz Adı"
                        required
                        value={deviceName}
                        onChange={setDeviceName}
                        placeholder="Örn. Çekme Test Cihazı"
                      />

                      <Field
                        label="Seri No"
                        value={serialNo}
                        onChange={setSerialNo}
                        placeholder="Örn. ALŞA-30T-001"
                      />

                      <Field
                        label="Cihaz Türü"
                        value={deviceType}
                        onChange={setDeviceType}
                        placeholder="Örn. Test Cihazı"
                      />

                      <Field
                        label="Departman"
                        value={department}
                        onChange={setDepartment}
                        placeholder="Örn. Kalite Kontrol"
                      />

                      <Field
                        label="Konum"
                        value={location}
                        onChange={setLocation}
                        placeholder="Örn. Kalite Laboratuvarı"
                      />

                      <Field
                        label="Sorumlu"
                        value={responsible}
                        onChange={setResponsible}
                        placeholder="Cihazdan sorumlu kişi"
                      />

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-700">
                          Son Kalibrasyon Tarihi
                        </label>

                        <input
                          type="date"
                          value={lastCalibrationDate}
                          onChange={(e) =>
                            setLastCalibrationDate(e.target.value)
                          }
                          className="input"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-700">
                          Sonraki Kalibrasyon Tarihi
                        </label>

                        <input
                          type="date"
                          value={nextCalibrationDate}
                          onChange={(e) =>
                            setNextCalibrationDate(e.target.value)
                          }
                          className="input"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-700">
                          Kalibrasyon Periyodu
                        </label>

                        <select
                          value={calibrationPeriodMonths}
                          onChange={(e) =>
                            setCalibrationPeriodMonths(e.target.value)
                          }
                          className="input"
                        >
                          <option value="1">1 Ay</option>
                          <option value="3">3 Ay</option>
                          <option value="6">6 Ay</option>
                          <option value="12">12 Ay</option>
                          <option value="24">24 Ay</option>
                          <option value="36">36 Ay</option>
                        </select>
                      </div>

                      <Field
                        label="Kalibrasyon Sertifika No"
                        value={certificateNo}
                        onChange={setCertificateNo}
                        placeholder="Örn. KAL-2026-001"
                      />

                      <div className="md:col-span-2">
                        <Field
                          label="Kalibrasyon Firması / Tedarikçi"
                          value={supplier}
                          onChange={setSupplier}
                          placeholder="Kalibrasyonu yapan firma"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-1.5 block text-xs font-medium text-slate-700">
                          Açıklama / Notlar
                        </label>

                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Cihazla ilgili ek açıklama, özel durum veya not..."
                          rows={5}
                          className="w-full resize-none rounded-lg border border-[#dbe2ea] bg-white px-[13px] py-3 text-[13px] text-slate-900 outline-none transition-all duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Alt Butonlar */}
                <div className="mt-5 flex items-center justify-end gap-3">
                  <Link
                    href="/kalibrasyon"
                    className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Vazgeç
                  </Link>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Kaydediliyor..." : "Cihazı Kaydet"}
                  </button>
                </div>

                {error && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>

              {/* SAĞ TARAF */}
              <div className="space-y-5 xl:col-span-4">
                {/* Kalibrasyon Durumu */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Icon name="settings" size={18} />
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Kalibrasyon Durumu
                      </h3>

                      <p className="text-xs text-slate-500">
                        Girilen tarihe göre mevcut durum
                      </p>
                    </div>
                  </div>

                  <div
                    className={`flex items-center gap-3 rounded-lg px-4 py-3 ${calibrationStatus.color}`}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${calibrationStatus.dot}`}
                    />

                    <div>
                      <div className="text-sm font-semibold">
                        {calibrationStatus.label}
                      </div>

                      {nextCalibrationDate && (
                        <div className="mt-0.5 text-xs opacity-80">
                          Sonraki tarih:{" "}
                          {new Date(
                            `${nextCalibrationDate}T00:00:00`
                          ).toLocaleDateString("tr-TR")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Kayıt Süreci */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
                  <h3 className="mb-5 text-sm font-semibold text-slate-900">
                    Kayıt Süreci
                  </h3>

                  <div className="space-y-4">
                    <ProcessStep
                      number="01"
                      title="Cihaz Bilgilerini Girin"
                      description="Cihazın temel bilgilerini eksiksiz doldurun."
                      active
                    />

                    <ProcessStep
                      number="02"
                      title="Kalibrasyon Tarihini Belirleyin"
                      description="Son ve sonraki kalibrasyon tarihlerini girin."
                    />

                    <ProcessStep
                      number="03"
                      title="Kaydı Tamamlayın"
                      description="Bilgileri kontrol ederek cihazı kaydedin."
                    />
                  </div>
                </div>

                {/* Kontrol */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      <Icon name="message" size={18} />
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Kayıt Öncesi Kontrol
                      </h3>

                      <p className="text-xs text-slate-500">
                        Kaydetmeden önce kontrol edin
                      </p>
                    </div>
                  </div>

                  <ul className="space-y-3 text-xs text-slate-600">
                    <li className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                      Cihaz adı girildi mi?
                    </li>

                    <li className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                      Seri numarası kontrol edildi mi?
                    </li>

                    <li className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                      Kalibrasyon tarihleri doğru mu?
                    </li>

                    <li className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                      Sorumlu kişi ve firma bilgileri doğru mu?
                    </li>
                  </ul>
                </div>

                {/* Bilgi */}
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
                  <div className="flex gap-3">
                    <div className="mt-0.5 shrink-0 text-blue-600">
                      <Icon name="alert" size={18} />
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-blue-900">
                        Bilgi
                      </h3>

                      <p className="mt-1.5 text-xs leading-5 text-blue-800">
                        Cihaz kaydedildikten sonra kalibrasyon listesinde
                        görüntülenebilir ve takip edilebilir. Sonraki
                        kalibrasyon tarihi, cihazın durumunun belirlenmesinde
                        kullanılır.
                      </p>
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
      `}</style>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input"
      />
    </div>
  );
}

function ProcessStep({
  number,
  title,
  description,
  active = false,
}: {
  number: string;
  title: string;
  description: string;
  active?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${
          active
            ? "bg-blue-600 text-white"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        {number}
      </div>

      <div className="min-w-0">
        <div className="text-xs font-semibold text-slate-800">
          {title}
        </div>

        <div className="mt-0.5 text-[11px] leading-4 text-slate-500">
          {description}
        </div>
      </div>
    </div>
  );
}