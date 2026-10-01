"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  FileCheck2,
  Loader2,
  Save,
} from "lucide-react";
import AppShell from "@/app/components/AppShell";
import { supabase } from "@/app/lib/supabase";

type CalibrationHistory = {
  id: number;
  calibration_id: number;
  calibration_date: string;
  next_calibration_date: string | null;
  calibration_type: string;
  certificate_no: string | null;
  calibration_company: string | null;
  result: string;
  measured_result: string | null;
  uncertainty: string | null;
  document_name: string | null;
  notes: string | null;
};

type Calibration = {
  id: number;
  device_name: string;
  serial_no: string | null;
};

export default function CalibrationHistoryEditPage() {
  const params = useParams();
  const router = useRouter();

  const calibrationId = Array.isArray(params.id)
    ? params.id[0]
    : (params.id as string);

  const historyId = Array.isArray(params.historyId)
    ? params.historyId[0]
    : (params.historyId as string);

  const [calibration, setCalibration] = useState<Calibration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    calibration_date: "",
    next_calibration_date: "",
    calibration_type: "Periyodik Kalibrasyon",
    certificate_no: "",
    calibration_company: "",
    result: "Uygun",
    measured_result: "",
    uncertainty: "",
    document_name: "",
    notes: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, [calibrationId, historyId]);

  async function loadData() {
    setLoading(true);
    setError("");

    const { data: calibrationData, error: calibrationError } =
      await supabase
        .from("calibrations")
        .select("id, device_name, serial_no")
        .eq("id", Number(calibrationId))
        .single();

    if (calibrationError) {
      setError("Cihaz bilgileri yüklenemedi.");
      setLoading(false);
      return;
    }

    setCalibration(calibrationData);

    const { data: historyData, error: historyError } = await supabase
      .from("calibration_history")
      .select("*")
      .eq("id", Number(historyId))
      .eq("calibration_id", Number(calibrationId))
      .single();

    if (historyError) {
      setError("Kalibrasyon kaydı bulunamadı.");
      setLoading(false);
      return;
    }

    setForm({
      calibration_date: historyData.calibration_date || "",
      next_calibration_date: historyData.next_calibration_date || "",
      calibration_type:
        historyData.calibration_type || "Periyodik Kalibrasyon",
      certificate_no: historyData.certificate_no || "",
      calibration_company: historyData.calibration_company || "",
      result: historyData.result || "Uygun",
      measured_result: historyData.measured_result || "",
      uncertainty: historyData.uncertainty || "",
      document_name: historyData.document_name || "",
      notes: historyData.notes || "",
    });

    setLoading(false);
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!form.calibration_date) {
      setError("Kalibrasyon tarihi zorunludur.");
      return;
    }

    if (!form.calibration_type) {
      setError("Kalibrasyon türü zorunludur.");
      return;
    }

    if (!form.result) {
      setError("Sonuç seçilmelidir.");
      return;
    }

    setSaving(true);

    const { error: updateError } = await supabase
      .from("calibration_history")
      .update({
        calibration_date: form.calibration_date,
        next_calibration_date:
          form.next_calibration_date || null,
        calibration_type: form.calibration_type,
        certificate_no: form.certificate_no || null,
        calibration_company: form.calibration_company || null,
        result: form.result,
        measured_result: form.measured_result || null,
        uncertainty: form.uncertainty || null,
        document_name: form.document_name || null,
        notes: form.notes || null,
      })
      .eq("id", Number(historyId))
      .eq("calibration_id", Number(calibrationId));

    if (updateError) {
      setError(
        `Kalibrasyon kaydı güncellenemedi: ${updateError.message}`
      );
      setSaving(false);
      return;
    }

    const nextDate = form.next_calibration_date;

    let status = "Geçerli";

    if (nextDate) {
      const today = new Date();
      const next = new Date(nextDate);

      today.setHours(0, 0, 0, 0);
      next.setHours(0, 0, 0, 0);

      const diffDays = Math.ceil(
        (next.getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (diffDays < 0) {
        status = "Süresi Geçmiş";
      } else if (diffDays <= 30) {
        status = "Yaklaşıyor";
      } else {
        status = "Geçerli";
      }
    }

    const { error: calibrationUpdateError } = await supabase
      .from("calibrations")
      .update({
        last_calibration_date: form.calibration_date,
        next_calibration_date:
          form.next_calibration_date || null,
        certificate_no: form.certificate_no || null,
        status,
      })
      .eq("id", Number(calibrationId));

    if (calibrationUpdateError) {
      setError(
        `Kalibrasyon kaydı güncellendi ancak cihaz bilgileri güncellenemedi: ${calibrationUpdateError.message}`
      );
      setSaving(false);
      return;
    }

    setMessage("Kalibrasyon kaydı başarıyla güncellendi.");

    setTimeout(() => {
      router.push(`/kalibrasyon/${calibrationId}`);
    }, 800);
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex items-center gap-3 text-slate-500">
            <Loader2 size={20} className="animate-spin" />
            Kalibrasyon kaydı yükleniyor...
          </div>
        </div>
      </AppShell>
    );
  }

  if (!calibration) {
    return (
      <AppShell>
        <div className="p-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error || "Kalibrasyon kaydı bulunamadı."}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-[1400px] px-6 py-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/kalibrasyon/${calibrationId}`)
                  }
                  className="flex items-center gap-1 hover:text-blue-600"
                >
                  <ArrowLeft size={16} />
                  Kalibrasyon Detayı
                </button>

                <span>/</span>

                <span className="text-slate-700">
                  Kayıt Düzenle
                </span>
              </div>

              <h1 className="text-2xl font-bold text-slate-900">
                Kalibrasyon Kaydını Düzenle
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                {calibration.device_name}
                {calibration.serial_no
                  ? ` • ${calibration.serial_no}`
                  : ""}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(`/kalibrasyon/${calibrationId}`)
              }
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <ArrowLeft size={17} />
              Geri Dön
            </button>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                        <CalendarDays size={19} />
                      </div>

                      <div>
                        <h2 className="font-bold text-slate-900">
                          Kalibrasyon Bilgileri
                        </h2>
                        <p className="text-sm text-slate-500">
                          Kalibrasyon kaydının temel bilgileri
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Kalibrasyon Tarihi *
                      </label>

                      <input
                        type="date"
                        value={form.calibration_date}
                        onChange={(e) =>
                          updateField(
                            "calibration_date",
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Sonraki Kalibrasyon Tarihi
                      </label>

                      <input
                        type="date"
                        value={form.next_calibration_date}
                        onChange={(e) =>
                          updateField(
                            "next_calibration_date",
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Kalibrasyon Türü *
                      </label>

                      <select
                        value={form.calibration_type}
                        onChange={(e) =>
                          updateField(
                            "calibration_type",
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option>Periyodik Kalibrasyon</option>
                        <option>İlk Kalibrasyon</option>
                        <option>Tekrar Kalibrasyon</option>
                        <option>Arıza Sonrası Kalibrasyon</option>
                        <option>Doğrulama</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Sonuç *
                      </label>

                      <select
                        value={form.result}
                        onChange={(e) =>
                          updateField("result", e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option>Uygun</option>
                        <option>Uygun Değil</option>
                        <option>Şartlı Uygun</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
                        <FileCheck2 size={19} />
                      </div>

                      <div>
                        <h2 className="font-bold text-slate-900">
                          Firma ve Sertifika Bilgileri
                        </h2>
                        <p className="text-sm text-slate-500">
                          Kalibrasyonu gerçekleştiren kuruluş ve sertifika bilgileri
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Kalibrasyon Firması
                      </label>

                      <input
                        type="text"
                        value={form.calibration_company}
                        onChange={(e) =>
                          updateField(
                            "calibration_company",
                            e.target.value
                          )
                        }
                        placeholder="Örn. XYZ Kalibrasyon"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Sertifika No
                      </label>

                      <input
                        type="text"
                        value={form.certificate_no}
                        onChange={(e) =>
                          updateField(
                            "certificate_no",
                            e.target.value
                          )
                        }
                        placeholder="Sertifika numarası"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Ölçülen Sonuç
                      </label>

                      <input
                        type="text"
                        value={form.measured_result}
                        onChange={(e) =>
                          updateField(
                            "measured_result",
                            e.target.value
                          )
                        }
                        placeholder="Örn. 10.02 mm"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Ölçüm Belirsizliği
                      </label>

                      <input
                        type="text"
                        value={form.uncertainty}
                        onChange={(e) =>
                          updateField(
                            "uncertainty",
                            e.target.value
                          )
                        }
                        placeholder="Örn. ±0.02"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-6 py-5">
                    <h2 className="font-bold text-slate-900">
                      Açıklama ve Notlar
                    </h2>
                  </div>

                  <div className="p-6">
                    <textarea
                      rows={6}
                      value={form.notes}
                      onChange={(e) =>
                        updateField("notes", e.target.value)
                      }
                      placeholder="Kalibrasyon ile ilgili ek açıklamalar..."
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 font-bold text-slate-900">
                    Mevcut Belge
                  </h2>

                  <input
                    type="text"
                    value={form.document_name}
                    onChange={(e) =>
                      updateField("document_name", e.target.value)
                    }
                    placeholder="Belge adı"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Bu alan yalnızca kayıt üzerindeki belge adını
                    günceller. Dosyanın kendisini değiştirmek için
                    kalibrasyon detayındaki belge yönetimini
                    kullanacağız.
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
                  <h3 className="font-bold text-blue-900">
                    Bilgi
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-blue-800">
                    Bu kaydı güncellediğinizde cihazın ana
                    kalibrasyon tarihi, sonraki kalibrasyon tarihi,
                    sertifika numarası ve durum bilgisi de
                    güncellenecektir.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />
                        Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Değişiklikleri Kaydet
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/kalibrasyon/${calibrationId}`)
                    }
                    disabled={saving}
                    className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    İptal
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}