"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Settings2,
} from "lucide-react";

import AppShell from "@/app/components/AppShell";
import { supabase } from "@/app/lib/supabase";

type Calibration = {
  id: number;
  device_name: string;
  serial_no: string | null;
  device_type: string | null;
  department: string | null;
  location: string | null;
  last_calibration_date: string | null;
  next_calibration_date: string | null;
  calibration_period_months: number | null;
  status: string;
  certificate_no: string | null;
  supplier: string | null;
  responsible: string | null;
  notes: string | null;
};

export default function KalibrasyonDuzenle() {
  const params = useParams();
  const router = useRouter();

  const calibrationId = Array.isArray(params.id)
    ? params.id[0]
    : (params.id as string);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [form, setForm] = useState({
    device_name: "",
    serial_no: "",
    device_type: "",
    department: "",
    location: "",
    last_calibration_date: "",
    next_calibration_date: "",
    calibration_period_months: "12",
    status: "Geçerli",
    certificate_no: "",
    supplier: "",
    responsible: "",
    notes: "",
  });

  useEffect(() => {
    if (!calibrationId) return;

    loadCalibration();
  }, [calibrationId]);

  async function loadCalibration() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("calibrations")
      .select("*")
      .eq("id", Number(calibrationId))
      .single();

    if (error) {
      console.error(
        "Cihaz bilgileri yüklenemedi:",
        error
      );

      setErrorMessage(
        error.message ||
          "Cihaz bilgileri yüklenemedi."
      );

      setLoading(false);
      return;
    }

    const calibration =
      data as Calibration;

    setForm({
      device_name:
        calibration.device_name || "",
      serial_no:
        calibration.serial_no || "",
      device_type:
        calibration.device_type || "",
      department:
        calibration.department || "",
      location:
        calibration.location || "",
      last_calibration_date:
        calibration.last_calibration_date || "",
      next_calibration_date:
        calibration.next_calibration_date || "",
      calibration_period_months:
        calibration.calibration_period_months
          ? String(
              calibration.calibration_period_months
            )
          : "12",
      status:
        calibration.status || "Geçerli",
      certificate_no:
        calibration.certificate_no || "",
      supplier:
        calibration.supplier || "",
      responsible:
        calibration.responsible || "",
      notes:
        calibration.notes || "",
    });

    setLoading(false);
  }

  function handleChange(
    field: keyof typeof form,
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function calculateStatus() {
    if (!form.next_calibration_date) {
      return form.status;
    }

    const today = new Date();
    const nextDate = new Date(
      form.next_calibration_date
    );

    today.setHours(0, 0, 0, 0);
    nextDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil(
      (nextDate.getTime() -
        today.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0) {
      return "Süresi Geçmiş";
    }

    if (diffDays <= 30) {
      return "Yaklaşıyor";
    }

    return "Geçerli";
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    if (!form.device_name.trim()) {
      setErrorMessage(
        "Cihaz adı zorunludur."
      );

      setSaving(false);
      return;
    }

    if (!form.next_calibration_date) {
      setErrorMessage(
        "Sonraki kalibrasyon tarihi zorunludur."
      );

      setSaving(false);
      return;
    }

    const status = calculateStatus();

    const { error } = await supabase
      .from("calibrations")
      .update({
        device_name:
          form.device_name.trim(),

        serial_no:
          form.serial_no.trim() || null,

        device_type:
          form.device_type.trim() || null,

        department:
          form.department.trim() || null,

        location:
          form.location.trim() || null,

        last_calibration_date:
          form.last_calibration_date || null,

        next_calibration_date:
          form.next_calibration_date || null,

        calibration_period_months:
          form.calibration_period_months
            ? Number(
                form.calibration_period_months
              )
            : null,

        status,

        certificate_no:
          form.certificate_no.trim() || null,

        supplier:
          form.supplier.trim() || null,

        responsible:
          form.responsible.trim() || null,

        notes:
          form.notes.trim() || null,

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", Number(calibrationId));

    if (error) {
      console.error(
        "Cihaz güncellenemedi:",
        error
      );

      setErrorMessage(
        error.message ||
          "Cihaz güncellenirken bir hata oluştu."
      );

      setSaving(false);
      return;
    }

    setSuccessMessage(
      "Cihaz bilgileri başarıyla güncellendi."
    );

    setSaving(false);

    setTimeout(() => {
      router.push(
        `/kalibrasyon/${calibrationId}`
      );
    }, 800);
  }

  if (loading) {
    return (
      <AppShell>
        <div className="px-8 py-8">
          <div className="mx-auto max-w-[1200px] rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
            Cihaz bilgileri yükleniyor...
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="box-border w-full min-w-0 max-w-full overflow-x-hidden px-8 py-6">
        <div className="mx-auto w-full max-w-[1200px] space-y-6">

          {/* HEADER */}
          <div>
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/kalibrasyon/${calibrationId}`
                )
              }
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-blue-600"
            >
              <ArrowLeft size={16} />
              Cihaz Detayına Dön
            </button>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

              <div className="flex items-start gap-4">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Settings2 size={24} />
                </div>

                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                    Cihaz Bilgilerini Düzenle
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    Kalibrasyon cihazının kayıtlı bilgilerini güncelleyin.
                  </p>
                </div>

              </div>

            </div>
          </div>

          {/* MESAJLAR */}
          {successMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >

            {/* CİHAZ BİLGİLERİ */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-lg font-semibold text-slate-900">
                  Cihaz Bilgileri
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Cihazın temel tanımlama bilgileri.
                </p>
              </div>

              <div className="grid gap-5 p-6 md:grid-cols-2">

                <FormField
                  label="Cihaz Adı"
                  required
                >
                  <input
                    type="text"
                    value={form.device_name}
                    onChange={(e) =>
                      handleChange(
                        "device_name",
                        e.target.value
                      )
                    }
                    className="input-style"
                    required
                  />
                </FormField>

                <FormField label="Seri No">
                  <input
                    type="text"
                    value={form.serial_no}
                    onChange={(e) =>
                      handleChange(
                        "serial_no",
                        e.target.value
                      )
                    }
                    className="input-style"
                  />
                </FormField>

                <FormField label="Cihaz Türü">
                  <input
                    type="text"
                    value={form.device_type}
                    onChange={(e) =>
                      handleChange(
                        "device_type",
                        e.target.value
                      )
                    }
                    className="input-style"
                  />
                </FormField>

                <FormField label="Departman">
                  <input
                    type="text"
                    value={form.department}
                    onChange={(e) =>
                      handleChange(
                        "department",
                        e.target.value
                      )
                    }
                    className="input-style"
                  />
                </FormField>

                <FormField label="Lokasyon">
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) =>
                      handleChange(
                        "location",
                        e.target.value
                      )
                    }
                    className="input-style"
                  />
                </FormField>

                <FormField label="Sorumlu">
                  <input
                    type="text"
                    value={form.responsible}
                    onChange={(e) =>
                      handleChange(
                        "responsible",
                        e.target.value
                      )
                    }
                    className="input-style"
                  />
                </FormField>

              </div>

            </section>

            {/* KALİBRASYON */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-lg font-semibold text-slate-900">
                  Kalibrasyon Bilgileri
                </h2>
              </div>

              <div className="grid gap-5 p-6 md:grid-cols-2">

                <FormField label="Son Kalibrasyon Tarihi">
                  <input
                    type="date"
                    value={
                      form.last_calibration_date
                    }
                    onChange={(e) =>
                      handleChange(
                        "last_calibration_date",
                        e.target.value
                      )
                    }
                    className="input-style"
                  />
                </FormField>

                <FormField
                  label="Sonraki Kalibrasyon Tarihi"
                  required
                >
                  <input
                    type="date"
                    value={
                      form.next_calibration_date
                    }
                    onChange={(e) =>
                      handleChange(
                        "next_calibration_date",
                        e.target.value
                      )
                    }
                    className="input-style"
                    required
                  />
                </FormField>

                <FormField label="Kalibrasyon Periyodu (Ay)">
                  <input
                    type="number"
                    min="1"
                    value={
                      form.calibration_period_months
                    }
                    onChange={(e) =>
                      handleChange(
                        "calibration_period_months",
                        e.target.value
                      )
                    }
                    className="input-style"
                  />
                </FormField>

                <FormField label="Durum">
                  <select
                    value={form.status}
                    onChange={(e) =>
                      handleChange(
                        "status",
                        e.target.value
                      )
                    }
                    className="input-style"
                  >
                    <option value="Geçerli">
                      Geçerli
                    </option>

                    <option value="Yaklaşıyor">
                      Yaklaşıyor
                    </option>

                    <option value="Süresi Geçmiş">
                      Süresi Geçmiş
                    </option>
                  </select>
                </FormField>

              </div>

            </section>

            {/* SERTİFİKA */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-lg font-semibold text-slate-900">
                  Sertifika ve Tedarikçi
                </h2>
              </div>

              <div className="grid gap-5 p-6 md:grid-cols-2">

                <FormField label="Sertifika No">
                  <input
                    type="text"
                    value={form.certificate_no}
                    onChange={(e) =>
                      handleChange(
                        "certificate_no",
                        e.target.value
                      )
                    }
                    className="input-style"
                  />
                </FormField>

                <FormField label="Tedarikçi">
                  <input
                    type="text"
                    value={form.supplier}
                    onChange={(e) =>
                      handleChange(
                        "supplier",
                        e.target.value
                      )
                    }
                    className="input-style"
                  />
                </FormField>

              </div>

            </section>

            {/* NOTLAR */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-lg font-semibold text-slate-900">
                  Notlar
                </h2>
              </div>

              <div className="p-6">
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    handleChange(
                      "notes",
                      e.target.value
                    )
                  }
                  rows={5}
                  className="input-style resize-none"
                  placeholder="Cihazla ilgili ek açıklamalar..."
                />
              </div>

            </section>

            {/* BUTONLAR */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">

              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/kalibrasyon/${calibrationId}`
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft size={17} />
                Vazgeç
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0c1c32] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={17} />

                {saving
                  ? "Kaydediliyor..."
                  : "Değişiklikleri Kaydet"}
              </button>

            </div>

          </form>

        </div>
      </div>
    </AppShell>
  );
}

function FormField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  );
}