"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FileText,
  Gauge,
  Save,
  Upload,
  X,
  Loader2,
} from "lucide-react";

import AppShell from "@/app/components/AppShell";
import { supabase } from "@/app/lib/supabase";

type Calibration = {
  id: number;
  device_name: string;
  serial_no: string | null;
  next_calibration_date: string | null;
  certificate_no: string | null;
};

export default function YeniKalibrasyon() {
  const params = useParams();
  const router = useRouter();

  const calibrationId = Array.isArray(params.id)
    ? params.id[0]
    : (params.id as string);

  const [calibration, setCalibration] =
    useState<Calibration | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [successMessage, setSuccessMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

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

  useEffect(() => {
    if (!calibrationId) return;

    loadCalibration();
  }, [calibrationId]);

  async function loadCalibration() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("calibrations")
      .select(
        "id, device_name, serial_no, next_calibration_date, certificate_no"
      )
      .eq("id", Number(calibrationId))
      .single();

    if (error) {
      console.error(
        "Kalibrasyon cihazı yüklenemedi:",
        error
      );

      setErrorMessage(
        error.message ||
          "Kalibrasyon cihazı yüklenemedi."
      );

      setLoading(false);
      return;
    }

    setCalibration(data as Calibration);

    setForm((prev) => ({
      ...prev,
      next_calibration_date:
        data.next_calibration_date || "",
      certificate_no:
        data.certificate_no || "",
    }));

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

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];

    if (!allowedTypes.includes(file.type)) {
      setErrorMessage(
        "Sadece PDF, JPG, JPEG veya PNG dosyaları yükleyebilirsiniz."
      );

      event.target.value = "";
      return;
    }

    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      setErrorMessage(
        "Dosya boyutu en fazla 10 MB olabilir."
      );

      event.target.value = "";
      return;
    }

    setErrorMessage("");
    setSelectedFile(file);

    if (!form.document_name) {
      setForm((prev) => ({
        ...prev,
        document_name: file.name,
      }));
    }
  }

  function removeSelectedFile() {
    setSelectedFile(null);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setSuccessMessage("");
    setErrorMessage("");

    /*
     * ZORUNLU ALAN KONTROLLERİ
     */

    if (!form.calibration_date) {
      setErrorMessage(
        "Kalibrasyon tarihi zorunludur."
      );
      setSaving(false);
      return;
    }

    if (!form.calibration_type) {
      setErrorMessage(
        "Kalibrasyon türü zorunludur."
      );
      setSaving(false);
      return;
    }

    if (!form.result) {
      setErrorMessage(
        "Kalibrasyon sonucu zorunludur."
      );
      setSaving(false);
      return;
    }

    /*
     * 1
     * ÖNCE KALİBRASYON GEÇMİŞ KAYDINI OLUŞTUR
     *
     * Burada oluşturulan ID çok önemli.
     *
     * Örneğin:
     * calibration_history.id = 25
     *
     * Daha sonra belge:
     * calibration_documents.history_id = 25
     *
     * şeklinde bağlanacak.
     */

    const { data: historyData, error: historyError } =
      await supabase
        .from("calibration_history")
        .insert({
          calibration_id: Number(calibrationId),
          calibration_date:
            form.calibration_date,
          next_calibration_date:
            form.next_calibration_date || null,
          calibration_type:
            form.calibration_type,
          certificate_no:
            form.certificate_no || null,
          calibration_company:
            form.calibration_company || null,
          result:
            form.result,
          measured_result:
            form.measured_result || null,
          uncertainty:
            form.uncertainty || null,
          document_name:
            form.document_name || null,
          notes:
            form.notes || null,
        })
        .select("id")
        .single();

    if (historyError || !historyData) {
      console.error(
        "Kalibrasyon geçmişi kaydedilemedi:",
        historyError
      );

      setErrorMessage(
        historyError?.message ||
          "Kalibrasyon geçmişi kaydedilemedi."
      );

      setSaving(false);
      return;
    }

    const historyId = historyData.id;

    /*
     * 2
     * BELGE SEÇİLDİYSE STORAGE'A YÜKLE
     */

    if (selectedFile) {
      const safeFileName = selectedFile.name
        .replace(
          /[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ._-]/g,
          "-"
        )
        .replace(/-+/g, "-");

      /*
       * Dosya yolu:
       *
       * cihaz ID
       *   └── history-ID
       *       └── tarih-dosya
       *
       * Örnek:
       * 12/history-25/1720000000-sertifika.pdf
       */

      const filePath =
        `${calibrationId}/history-${historyId}/` +
        `${Date.now()}-${safeFileName}`;

      const { error: uploadError } =
        await supabase.storage
          .from("kalibrasyon-belgeleri")
          .upload(
            filePath,
            selectedFile,
            {
              cacheControl: "3600",
              upsert: false,
              contentType: selectedFile.type,
            }
          );

      if (uploadError) {
        console.error(
          "Kalibrasyon belgesi yüklenemedi:",
          uploadError
        );

        setErrorMessage(
          `Kalibrasyon kaydı oluşturuldu ancak belge yüklenemedi: ${uploadError.message}`
        );

        setSaving(false);
        return;
      }

      /*
       * 3
       * BELGEYİ DATABASE'E KAYDET
       *
       * Buradaki history_id sayesinde belge,
       * belirli bir kalibrasyon geçmiş kaydına
       * bağlanıyor.
       */

      const documentType =
        selectedFile.type === "application/pdf"
          ? "Kalibrasyon Sertifikası"
          : "Kalibrasyon Belgesi";

      const { error: documentError } =
        await supabase
          .from("calibration_documents")
          .insert({
            calibration_id:
              Number(calibrationId),
            history_id: historyId,
            document_name:
              form.document_name ||
              selectedFile.name,
            file_path: filePath,
            file_url: null,
            document_type:
              documentType,
          });

      if (documentError) {
        console.error(
          "Kalibrasyon belgesi veritabanına kaydedilemedi:",
          documentError
        );

        /*
         * Database kaydı başarısızsa Storage'daki
         * dosyayı da temizle.
         */

        await supabase.storage
          .from("kalibrasyon-belgeleri")
          .remove([filePath]);

        setErrorMessage(
          `Kalibrasyon kaydı oluşturuldu ancak belge kaydı oluşturulamadı: ${documentError.message}`
        );

        setSaving(false);
        return;
      }
    }

    /*
     * 4
     * ANA CİHAZ KAYDININ DURUMUNU HESAPLA
     */

    let status = "Geçerli";

    if (form.next_calibration_date) {
      const target = new Date(
        form.next_calibration_date
      );

      const today = new Date();

      target.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      const days = Math.ceil(
        (target.getTime() -
          today.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (days < 0) {
        status = "Süresi Geçmiş";
      } else if (days <= 30) {
        status = "Yaklaşıyor";
      } else {
        status = "Geçerli";
      }
    }

    /*
     * 5
     * ANA CALIBRATIONS KAYDINI GÜNCELLE
     */

    const { error: calibrationError } =
      await supabase
        .from("calibrations")
        .update({
          last_calibration_date:
            form.calibration_date,
          next_calibration_date:
            form.next_calibration_date || null,
          certificate_no:
            form.certificate_no || null,
          status,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          Number(calibrationId)
        );

    if (calibrationError) {
      console.error(
        "Ana kalibrasyon kaydı güncellenemedi:",
        calibrationError
      );

      setErrorMessage(
        calibrationError.message ||
          "Kalibrasyon geçmişi kaydedildi ancak ana cihaz kaydı güncellenemedi."
      );

      setSaving(false);
      return;
    }

    /*
     * BAŞARILI
     */

    setSuccessMessage(
      selectedFile
        ? "Kalibrasyon kaydı ve sertifika başarıyla oluşturuldu."
        : "Kalibrasyon kaydı başarıyla oluşturuldu."
    );

    setSaving(false);

    /*
     * Detay sayfasına dön
     */

    setTimeout(() => {
      router.push(
        `/kalibrasyon/${calibrationId}`
      );
    }, 1000);
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

  if (!calibration) {
    return (
      <AppShell>
        <div className="px-8 py-8">
          <div className="mx-auto max-w-[1200px] rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
            <h1 className="text-lg font-semibold text-slate-900">
              Cihaz bulunamadı
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {errorMessage ||
                "İstenen kalibrasyon cihazı bulunamadı."}
            </p>

            <Link
              href="/kalibrasyon"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0c1c32] px-4 py-2.5 text-sm font-semibold text-white"
            >
              <ArrowLeft size={16} />
              Kalibrasyon Listesine Dön
            </Link>
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

            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">

              <div className="flex items-start gap-4">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Gauge size={24} />
                </div>

                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                    Yeni Kalibrasyon Kaydı
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    {calibration.device_name}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">

                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      Seri No:{" "}
                      {calibration.serial_no || "-"}
                    </span>

                    <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                      Yeni kayıt
                    </span>

                  </div>
                </div>

              </div>

              <div className="rounded-xl bg-slate-50 p-4">

                <div className="text-xs font-medium text-slate-400">
                  Mevcut Sertifika
                </div>

                <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <FileText size={15} />

                  {calibration.certificate_no ||
                    "Kayıtlı değil"}
                </div>

              </div>

            </div>
          </div>

          {/* MESAJLAR */}

          {successMessage && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              <CheckCircle2 size={18} />
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </div>
          )}

          {/* FORM */}

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >

            {/* KALİBRASYON BİLGİLERİ */}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-200 px-6 py-5">

                <h2 className="text-lg font-semibold text-slate-900">
                  Kalibrasyon Bilgileri
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Kalibrasyon işleminin temel bilgilerini girin.
                </p>

              </div>

              <div className="grid gap-5 p-6 md:grid-cols-2">

                <FormField
                  label="Kalibrasyon Tarihi"
                  required
                >
                  <input
                    type="date"
                    value={
                      form.calibration_date
                    }
                    onChange={(e) =>
                      handleChange(
                        "calibration_date",
                        e.target.value
                      )
                    }
                    className="input-style"
                    required
                  />
                </FormField>

                <FormField
                  label="Sonraki Kalibrasyon Tarihi"
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
                  />
                </FormField>

                <FormField
                  label="Kalibrasyon Türü"
                  required
                >
                  <select
                    value={
                      form.calibration_type
                    }
                    onChange={(e) =>
                      handleChange(
                        "calibration_type",
                        e.target.value
                      )
                    }
                    className="input-style"
                    required
                  >
                    <option value="Periyodik Kalibrasyon">
                      Periyodik Kalibrasyon
                    </option>

                    <option value="İlk Kalibrasyon">
                      İlk Kalibrasyon
                    </option>

                    <option value="Ara Kalibrasyon">
                      Ara Kalibrasyon
                    </option>

                    <option value="Tekrar Kalibrasyon">
                      Tekrar Kalibrasyon
                    </option>

                    <option value="Arıza Sonrası Kalibrasyon">
                      Arıza Sonrası Kalibrasyon
                    </option>

                    <option value="Doğrulama">
                      Doğrulama
                    </option>
                  </select>
                </FormField>

                <FormField
                  label="Kalibrasyon Sonucu"
                  required
                >
                  <select
                    value={form.result}
                    onChange={(e) =>
                      handleChange(
                        "result",
                        e.target.value
                      )
                    }
                    className="input-style"
                    required
                  >
                    <option value="Uygun">
                      Uygun
                    </option>

                    <option value="Uygunsuz">
                      Uygunsuz
                    </option>

                    <option value="Şartlı Uygun">
                      Şartlı Uygun
                    </option>

                    <option value="Başarılı">
                      Başarılı
                    </option>

                    <option value="Başarısız">
                      Başarısız
                    </option>
                  </select>
                </FormField>

              </div>

            </section>

            {/* SERTİFİKA VE LABORATUVAR */}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-200 px-6 py-5">

                <h2 className="text-lg font-semibold text-slate-900">
                  Sertifika ve Laboratuvar Bilgileri
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Kalibrasyonu gerçekleştiren firma ve sertifika bilgileri.
                </p>

              </div>

              <div className="grid gap-5 p-6 md:grid-cols-2">

                <FormField
                  label="Kalibrasyon Firması"
                >
                  <input
                    type="text"
                    value={
                      form.calibration_company
                    }
                    onChange={(e) =>
                      handleChange(
                        "calibration_company",
                        e.target.value
                      )
                    }
                    placeholder="Örn. XYZ Kalibrasyon Laboratuvarı"
                    className="input-style"
                  />
                </FormField>

                <FormField
                  label="Sertifika No"
                >
                  <input
                    type="text"
                    value={
                      form.certificate_no
                    }
                    onChange={(e) =>
                      handleChange(
                        "certificate_no",
                        e.target.value
                      )
                    }
                    placeholder="Örn. KAL-2026-00125"
                    className="input-style"
                  />
                </FormField>

                <FormField
                  label="Ölçülen Sonuç"
                >
                  <input
                    type="text"
                    value={
                      form.measured_result
                    }
                    onChange={(e) =>
                      handleChange(
                        "measured_result",
                        e.target.value
                      )
                    }
                    placeholder="Örn. 100.02 mm"
                    className="input-style"
                  />
                </FormField>

                <FormField
                  label="Ölçüm Belirsizliği"
                >
                  <input
                    type="text"
                    value={
                      form.uncertainty
                    }
                    onChange={(e) =>
                      handleChange(
                        "uncertainty",
                        e.target.value
                      )
                    }
                    placeholder="Örn. ±0.02 mm"
                    className="input-style"
                  />
                </FormField>

                <FormField
                  label="Doküman / Sertifika Adı"
                >
                  <input
                    type="text"
                    value={
                      form.document_name
                    }
                    onChange={(e) =>
                      handleChange(
                        "document_name",
                        e.target.value
                      )
                    }
                    placeholder="Örn. Kalibrasyon Sertifikası 2026"
                    className="input-style"
                  />
                </FormField>

                {/* DOSYA YÜKLEME */}

                <FormField
                  label="Kalibrasyon Sertifikası / Raporu"
                >
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">

                    {!selectedFile ? (
                      <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-6 text-center transition hover:border-blue-300 hover:bg-blue-50/30">

                        <Upload
                          size={24}
                          className="mb-2 text-blue-600"
                        />

                        <span className="text-sm font-semibold text-slate-700">
                          Belge Seç
                        </span>

                        <span className="mt-1 text-xs text-slate-400">
                          PDF, JPG, JPEG veya PNG · Maks. 10 MB
                        </span>

                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                          onChange={
                            handleFileChange
                          }
                          className="hidden"
                        />

                      </label>
                    ) : (
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">

                        <div className="flex min-w-0 items-center gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600">
                            <FileText size={19} />
                          </div>

                          <div className="min-w-0">

                            <div className="truncate text-sm font-semibold text-slate-800">
                              {selectedFile.name}
                            </div>

                            <div className="mt-0.5 text-xs text-slate-500">
                              {(
                                selectedFile.size /
                                1024 /
                                1024
                              ).toFixed(2)}{" "}
                              MB
                            </div>

                          </div>

                        </div>

                        <button
                          type="button"
                          onClick={
                            removeSelectedFile
                          }
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-red-600"
                          title="Dosyayı kaldır"
                        >
                          <X size={17} />
                        </button>

                      </div>
                    )}

                  </div>
                </FormField>

              </div>

            </section>

            {/* NOTLAR */}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-200 px-6 py-5">

                <h2 className="text-lg font-semibold text-slate-900">
                  Açıklama ve Notlar
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Kalibrasyon kaydıyla ilgili ek bilgileri yazabilirsiniz.
                </p>

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
                  placeholder="Kalibrasyonla ilgili açıklama, uygunsuzluk, yapılan işlem veya diğer notlar..."
                  className="input-style resize-none"
                />

              </div>

            </section>

            {/* ALT BUTONLAR */}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">

              <Link
                href={`/kalibrasyon/${calibrationId}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft size={17} />
                Vazgeç
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0c1c32] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Save size={17} />
                    Kalibrasyon Kaydını Kaydet
                  </>
                )}
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