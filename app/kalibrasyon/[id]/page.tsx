"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Clock3,
  FileText,
  Gauge,
  Pencil,
  ShieldCheck,
  Upload,
  ExternalLink,
  Trash2,
  Loader2,
  FileCheck2,
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
  created_at: string;
};

type CalibrationDocument = {
  id: number;
  calibration_id: number;
  history_id: number | null;
  document_name: string;
  file_path: string;
  file_url: string | null;
  document_type: string;
  uploaded_at: string;
};

export default function KalibrasyonDetay() {
  const params = useParams();
  const router = useRouter();

  const calibrationId = Array.isArray(params.id)
    ? params.id[0]
    : (params.id as string);

  const [calibration, setCalibration] =
    useState<Calibration | null>(null);

  const [history, setHistory] =
    useState<CalibrationHistory[]>([]);

  const [documents, setDocuments] =
    useState<CalibrationDocument[]>([]);

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(true);

  const [uploading, setUploading] = useState(false);

  const [deletingDocumentId, setDeletingDocumentId] =
    useState<number | null>(null);

  const [openingDocumentId, setOpeningDocumentId] =
    useState<number | null>(null);

  const [error, setError] = useState("");

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!calibrationId) return;

    loadCalibration();
    loadHistory();
    loadDocuments();
  }, [calibrationId]);

  async function loadCalibration() {
    setLoading(true);
    setError("");

    const { data, error: loadError } = await supabase
      .from("calibrations")
      .select("*")
      .eq("id", Number(calibrationId))
      .single();

    if (loadError) {
      console.error(
        "Kalibrasyon detayı yüklenemedi:",
        loadError
      );

      setError(
        loadError.message ||
          "Kalibrasyon cihazı yüklenemedi."
      );

      setLoading(false);
      return;
    }

    setCalibration(data as Calibration);
    setLoading(false);
  }

  async function loadHistory() {
    setHistoryLoading(true);

    const { data, error: historyError } = await supabase
      .from("calibration_history")
      .select("*")
      .eq("calibration_id", Number(calibrationId))
      .order("calibration_date", {
        ascending: false,
      });

    if (historyError) {
      console.error(
        "Kalibrasyon geçmişi yüklenemedi:",
        historyError
      );

      setHistory([]);
      setHistoryLoading(false);
      return;
    }

    setHistory(
      (data || []) as CalibrationHistory[]
    );

    setHistoryLoading(false);
  }

  async function loadDocuments() {
    setDocumentsLoading(true);

    const { data, error: documentError } =
      await supabase
        .from("calibration_documents")
        .select("*")
        .eq("calibration_id", Number(calibrationId))
        .order("uploaded_at", {
          ascending: false,
        });

    if (documentError) {
      console.error(
        "Kalibrasyon belgeleri yüklenemedi:",
        documentError
      );

      setDocuments([]);
      setDocumentsLoading(false);
      return;
    }

    setDocuments(
      (data || []) as CalibrationDocument[]
    );

    setDocumentsLoading(false);
  }

  async function handleUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert(
        "Sadece PDF, JPG, JPEG ve PNG dosyaları yükleyebilirsiniz."
      );

      event.target.value = "";
      return;
    }

    const maxSize =
      10 * 1024 * 1024;

    if (file.size > maxSize) {
      alert(
        "Dosya boyutu en fazla 10 MB olabilir."
      );

      event.target.value = "";
      return;
    }

    try {
      setUploading(true);

      const safeFileName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, "_");

      const uniqueFileName =
        `${Date.now()}-${safeFileName}`;

      const filePath =
        `${calibrationId}/${uniqueFileName}`;

      const { error: uploadError } =
        await supabase.storage
          .from("kalibrasyon-belgeleri")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

      if (uploadError) {
        console.error(
          "Dosya yükleme hatası:",
          uploadError
        );

        alert(
          `Dosya yüklenemedi: ${uploadError.message}`
        );

        return;
      }

      const documentType =
        file.type === "application/pdf"
          ? "Kalibrasyon Sertifikası / PDF"
          : "Kalibrasyon Belgesi / Görsel";

      const { data: insertedDocument, error: insertError } =
        await supabase
          .from("calibration_documents")
          .insert({
            calibration_id: Number(calibrationId),
            history_id: null,
            document_name: file.name,
            file_path: filePath,
            file_url: null,
            document_type: documentType,
          })
          .select()
          .single();

      if (insertError) {
        console.error(
          "Belge kayıt hatası:",
          insertError
        );

        await supabase.storage
          .from("kalibrasyon-belgeleri")
          .remove([filePath]);

        alert(
          `Belge kaydı oluşturulamadı: ${insertError.message}`
        );

        return;
      }

      if (insertedDocument) {
        setDocuments((prev) => [
          insertedDocument as CalibrationDocument,
          ...prev,
        ]);
      }

      alert("Belge başarıyla yüklendi.");
    } catch (uploadError) {
      console.error(
        "Belge yükleme sırasında hata:",
        uploadError
      );

      alert(
        "Belge yüklenirken beklenmeyen bir hata oluştu."
      );
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleOpenDocument(
    document: CalibrationDocument
  ) {
    try {
      setOpeningDocumentId(document.id);

      const { data, error: signedUrlError } =
        await supabase.storage
          .from("kalibrasyon-belgeleri")
          .createSignedUrl(
            document.file_path,
            60 * 60
          );

      if (signedUrlError || !data?.signedUrl) {
        console.error(
          "Belge bağlantısı oluşturulamadı:",
          signedUrlError
        );

        alert(
          "Belge açılamadı. Storage bağlantısını kontrol edin."
        );

        return;
      }

      window.open(
        data.signedUrl,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (error) {
      console.error(
        "Belge açma hatası:",
        error
      );

      alert(
        "Belge açılırken bir hata oluştu."
      );
    } finally {
      setOpeningDocumentId(null);
    }
  }

  async function handleDeleteDocument(
    document: CalibrationDocument
  ) {
    const confirmed = window.confirm(
      `"${document.document_name}" belgesini silmek istediğinize emin misiniz?`
    );

    if (!confirmed) return;

    try {
      setDeletingDocumentId(document.id);

      const { error: storageError } =
        await supabase.storage
          .from("kalibrasyon-belgeleri")
          .remove([document.file_path]);

      if (storageError) {
        console.error(
          "Storage dosya silme hatası:",
          storageError
        );

        alert(
          `Dosya Storage'dan silinemedi: ${storageError.message}`
        );

        return;
      }

      const { error: databaseError } =
        await supabase
          .from("calibration_documents")
          .delete()
          .eq("id", document.id);

      if (databaseError) {
        console.error(
          "Belge veritabanı silme hatası:",
          databaseError
        );

        alert(
          `Belge kaydı silinemedi: ${databaseError.message}`
        );

        return;
      }

      setDocuments((prev) =>
        prev.filter(
          (item) => item.id !== document.id
        )
      );

      alert("Belge başarıyla silindi.");
    } catch (error) {
      console.error(
        "Belge silme hatası:",
        error
      );

      alert(
        "Belge silinirken beklenmeyen bir hata oluştu."
      );
    } finally {
      setDeletingDocumentId(null);
    }
  }

  function getHistoryDocument(
    historyId: number
  ) {
    return documents.find(
      (document) =>
        document.history_id === historyId
    );
  }

  const days = useMemo(() => {
    if (!calibration?.next_calibration_date) {
      return null;
    }

    const target = new Date(
      calibration.next_calibration_date
    );

    const today = new Date();

    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    return Math.ceil(
      (target.getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24)
    );
  }, [calibration]);

  if (loading) {
    return (
      <AppShell>
        <div className="px-8 py-8">
          <div className="mx-auto max-w-[1500px] rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
            Cihaz bilgileri yükleniyor...
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !calibration) {
    return (
      <AppShell>
        <div className="px-8 py-8">
          <div className="mx-auto max-w-[1500px] rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-red-50 p-3 text-red-600">
                <AlertTriangle size={22} />
              </div>

              <div>
                <h1 className="text-lg font-semibold text-slate-900">
                  Cihaz bulunamadı
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  {error ||
                    "İstenen kalibrasyon kaydı bulunamadı."}
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
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="box-border w-full min-w-0 max-w-full overflow-x-hidden px-8 py-6">
        <div className="mx-auto w-full max-w-[1500px] space-y-6">

          {/* HEADER */}
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <button
                type="button"
                onClick={() =>
                  router.push("/kalibrasyon")
                }
                className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-blue-600"
              >
                <ArrowLeft size={16} />
                Kalibrasyon Listesine Dön
              </button>

              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Gauge size={24} />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                      {calibration.device_name}
                    </h1>

                    <StatusBadge
                      status={calibration.status}
                    />
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    Ölçüm cihazı ve kalibrasyon bilgileri
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  `/kalibrasyon/${calibration.id}/duzenle`
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              <Pencil size={17} />
              Cihazı Düzenle
            </button>
          </div>

          {/* ÖZET KARTLARI */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Seri No"
              value={calibration.serial_no || "-"}
              icon={<FileText size={19} />}
            />

            <SummaryCard
              title="Son Kalibrasyon"
              value={formatDate(
                calibration.last_calibration_date
              )}
              icon={<CalendarDays size={19} />}
            />

            <SummaryCard
              title="Sonraki Kalibrasyon"
              value={formatDate(
                calibration.next_calibration_date
              )}
              icon={<Clock3 size={19} />}
            />

            <SummaryCard
              title="Kalan Gün"
              value={
                days === null ? "-" : String(days)
              }
              icon={
                days !== null && days < 0 ? (
                  <AlertTriangle size={19} />
                ) : (
                  <ShieldCheck size={19} />
                )
              }
              valueClass={
                days !== null && days < 0
                  ? "text-red-600"
                  : days !== null && days <= 30
                  ? "text-amber-600"
                  : "text-slate-900"
              }
            />
          </div>

          {/* ANA İÇERİK */}
          <div className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">

            {/* CİHAZ BİLGİLERİ */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-lg font-semibold text-slate-900">
                  Cihaz Bilgileri
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Ölçüm cihazının kayıtlı temel bilgileri
                </p>
              </div>

              <div className="grid sm:grid-cols-2">

                <DetailItem
                  label="Cihaz Adı"
                  value={calibration.device_name}
                />

                <DetailItem
                  label="Seri No"
                  value={calibration.serial_no || "-"}
                />

                <DetailItem
                  label="Cihaz Tipi"
                  value={calibration.device_type || "-"}
                />

                <DetailItem
                  label="Departman"
                  value={calibration.department || "-"}
                />

                <DetailItem
                  label="Lokasyon"
                  value={calibration.location || "-"}
                />

                <DetailItem
                  label="Sorumlu"
                  value={calibration.responsible || "-"}
                />

                <DetailItem
                  label="Tedarikçi"
                  value={calibration.supplier || "-"}
                />

                <DetailItem
                  label="Kalibrasyon Periyodu"
                  value={
                    calibration.calibration_period_months
                      ? `${calibration.calibration_period_months} ay`
                      : "-"
                  }
                />

                <DetailItem
                  label="Son Kalibrasyon Tarihi"
                  value={formatDate(
                    calibration.last_calibration_date
                  )}
                />

                <DetailItem
                  label="Sonraki Kalibrasyon Tarihi"
                  value={formatDate(
                    calibration.next_calibration_date
                  )}
                />

                <DetailItem
                  label="Kalibrasyon Durumu"
                  value={calibration.status || "-"}
                  badge
                />

                <DetailItem
                  label="Güncel Sertifika No"
                  value={calibration.certificate_no || "-"}
                />

              </div>

              {calibration.notes && (
                <div className="border-t border-slate-100 p-5">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Notlar
                  </div>

                  <div className="mt-2 text-sm leading-6 text-slate-700">
                    {calibration.notes}
                  </div>
                </div>
              )}
            </section>

            {/* KALİBRASYON DURUMU */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-lg font-semibold text-slate-900">
                  Kalibrasyon Durumu
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Mevcut kalibrasyon geçerlilik özeti
                </p>
              </div>

              <div className="space-y-5 p-6">

                <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                    <Gauge size={21} />
                  </div>

                  <div>
                    <div className="text-xs text-slate-400">
                      Cihaz
                    </div>

                    <div className="mt-1 text-sm font-semibold text-slate-800">
                      {calibration.device_name}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-500">
                      Kalibrasyon durumu
                    </span>

                    <span className="font-semibold text-slate-700">
                      {days === null
                        ? "Tarih bilgisi yok"
                        : days < 0
                        ? "Süresi geçmiş"
                        : days <= 30
                        ? "Yaklaşıyor"
                        : "Geçerli"}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        days !== null && days < 0
                          ? "w-full bg-red-500"
                          : days !== null && days <= 30
                          ? "w-4/5 bg-amber-500"
                          : "w-2/5 bg-emerald-500"
                      }`}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs font-medium text-slate-400">
                    Sonraki işlem
                  </div>

                  <div className="mt-1 text-sm font-semibold text-slate-800">
                    {days !== null && days < 0
                      ? "Kalibrasyon yenilenmeli"
                      : days !== null && days <= 30
                      ? "Kalibrasyon planlanmalı"
                      : "Kalibrasyon geçerliliğini koruyor"}
                  </div>

                  <div className="mt-2 text-xs text-slate-500">
                    Sonraki kalibrasyon:{" "}
                    {formatDate(
                      calibration.next_calibration_date
                    )}
                  </div>
                </div>

              </div>
            </section>
          </div>

          {/* KALİBRASYON GEÇMİŞİ */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Kalibrasyon Geçmişi
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Bu cihaza ait geçmiş kalibrasyon kayıtları
                  </p>
                </div>

                <div className="flex items-center gap-3">

                  <div className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                    {history.length} kayıt
                  </div>

                  <Link
                    href={`/kalibrasyon/${calibration.id}/yeni-kalibrasyon`}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0c1c32] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700"
                  >
                    <CalendarDays size={15} />
                    Yeni Kalibrasyon Kaydı
                  </Link>

                </div>

              </div>
            </div>

            {historyLoading ? (
              <div className="p-10 text-center text-sm text-slate-500">
                Kalibrasyon geçmişi yükleniyor...
              </div>
            ) : history.length === 0 ? (
              <div className="p-10 text-center">

                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Clock3 size={22} />
                </div>

                <h3 className="mt-4 text-sm font-semibold text-slate-800">
                  Henüz kalibrasyon geçmişi yok
                </h3>

                <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
                  Bu cihaz için henüz geçmiş kalibrasyon kaydı
                  oluşturulmamış.
                </p>

                <Link
                  href={`/kalibrasyon/${calibration.id}/yeni-kalibrasyon`}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0c1c32] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <CalendarDays size={16} />
                  İlk Kalibrasyon Kaydını Oluştur
                </Link>

              </div>
            ) : (
              <div className="overflow-x-auto">

                <table className="w-full min-w-[1200px]">

                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-left">

                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Tarih
                      </th>

                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Firma
                      </th>

                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Kalibrasyon Türü
                      </th>

                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Sertifika No
                      </th>

                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Sonuç
                      </th>

                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Geçerlilik
                      </th>

                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Doküman
                      </th>

                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        İşlem
                      </th>

                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {history.map((item) => {
                      const historyDocument =
                        getHistoryDocument(item.id);

                      return (
                        <tr
                          key={item.id}
                          className="transition hover:bg-slate-50"
                        >

                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-slate-800">
                              {formatDate(
                                item.calibration_date
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="text-sm text-slate-700">
                              {item.calibration_company || "-"}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="text-sm text-slate-700">
                              {item.calibration_type}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-slate-700">
                              {item.certificate_no || "-"}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <ResultBadge
                              result={item.result}
                            />
                          </td>

                          <td className="px-6 py-4">
                            <div className="text-xs text-slate-500">
                              {formatDate(
                                item.calibration_date
                              )}
                              {" → "}
                              {formatDate(
                                item.next_calibration_date
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            {historyDocument ? (
                              <div className="flex flex-col gap-2">

                                <div className="flex max-w-[240px] items-center gap-2">

                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                    <FileCheck2 size={15} />
                                  </div>

                                  <div className="min-w-0">
                                    <div className="truncate text-xs font-semibold text-slate-700">
                                      {historyDocument.document_name}
                                    </div>

                                    <div className="text-[10px] text-slate-400">
                                      {historyDocument.document_type}
                                    </div>
                                  </div>

                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleOpenDocument(
                                      historyDocument
                                    )
                                  }
                                  disabled={
                                    openingDocumentId ===
                                    historyDocument.id
                                  }
                                  className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {openingDocumentId ===
                                  historyDocument.id ? (
                                    <Loader2
                                      size={13}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <ExternalLink
                                      size={13}
                                    />
                                  )}

                                  Görüntüle
                                </button>

                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-400">
                                <FileText size={13} />
                                Belge Yok
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/kalibrasyon/${calibration.id}/kalibrasyon-duzenle/${item.id}`
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            >
                              <Pencil size={14} />
                              Düzenle
                            </button>
                          </td>

                        </tr>
                      );
                    })}

                  </tbody>

                </table>

              </div>
            )}

          </section>

          {/* SERTİFİKALAR VE DOKÜMANLAR */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-200 px-6 py-5">

              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Sertifikalar ve Dokümanlar
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Kalibrasyon sertifikaları ve ilgili dokümanlar
                  </p>
                </div>

                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={handleUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    disabled={uploading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0c1c32] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {uploading ? (
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                    ) : (
                      <Upload size={17} />
                    )}

                    {uploading
                      ? "Yükleniyor..."
                      : "Belge Yükle"}
                  </button>
                </div>

              </div>

            </div>

            <div className="p-6">

              {documentsLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center">
                  <Loader2
                    size={24}
                    className="mx-auto animate-spin text-blue-600"
                  />

                  <p className="mt-3 text-sm text-slate-500">
                    Belgeler yükleniyor...
                  </p>
                </div>
              ) : documents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">

                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
                    <FileText size={22} />
                  </div>

                  <h3 className="mt-4 text-sm font-semibold text-slate-800">
                    Henüz belge yüklenmemiş
                  </h3>

                  <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-slate-500">
                    Bu cihaza ait kalibrasyon sertifikalarını,
                    raporları veya diğer ilgili belgeleri buradan
                    yükleyebilirsiniz.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    disabled={uploading}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-60"
                  >
                    <Upload size={16} />
                    İlk Belgeyi Yükle
                  </button>

                  <p className="mt-4 text-[11px] text-slate-400">
                    Maksimum dosya boyutu: 10 MB
                    <br />
                    Desteklenen formatlar: PDF, JPG, JPEG, PNG
                  </p>

                </div>
              ) : (
                <div className="space-y-3">

                  {documents.map((document) => (

                    <div
                      key={document.id}
                      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:bg-blue-50/20 lg:flex-row lg:items-center lg:justify-between"
                    >

                      <div className="flex min-w-0 items-center gap-4">

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                          <FileCheck2 size={21} />
                        </div>

                        <div className="min-w-0">

                          <div className="truncate text-sm font-semibold text-slate-800">
                            {document.document_name}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">

                            <span>
                              {document.document_type}
                            </span>

                            {document.history_id && (
                              <>
                                <span className="text-slate-300">
                                  •
                                </span>

                                <span className="font-medium text-blue-600">
                                  Kalibrasyon kaydına bağlı
                                </span>
                              </>
                            )}

                            <span className="text-slate-300">
                              •
                            </span>

                            <span>
                              {formatDateTime(
                                document.uploaded_at
                              )}
                            </span>

                          </div>

                        </div>

                      </div>

                      <div className="flex shrink-0 items-center gap-2">

                        <button
                          type="button"
                          onClick={() =>
                            handleOpenDocument(document)
                          }
                          disabled={
                            openingDocumentId ===
                            document.id
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {openingDocumentId ===
                          document.id ? (
                            <Loader2
                              size={15}
                              className="animate-spin"
                            />
                          ) : (
                            <ExternalLink size={15} />
                          )}

                          Görüntüle
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteDocument(document)
                          }
                          disabled={
                            deletingDocumentId ===
                            document.id
                          }
                          className="inline-flex items-center justify-center rounded-xl border border-red-100 bg-red-50 p-2.5 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Belgeyi Sil"
                        >
                          {deletingDocumentId ===
                          document.id ? (
                            <Loader2
                              size={15}
                              className="animate-spin"
                            />
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </button>

                      </div>

                    </div>

                  ))}

                </div>
              )}

            </div>

          </section>

        </div>
      </div>
    </AppShell>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  valueClass = "text-slate-900",
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-start justify-between">

        <div>

          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {title}
          </div>

          <div
            className={`mt-2 truncate text-xl font-semibold ${valueClass}`}
          >
            {value}
          </div>

        </div>

        <div className="rounded-xl bg-slate-50 p-2.5 text-slate-500">
          {icon}
        </div>

      </div>

    </div>
  );
}

function DetailItem({
  label,
  value,
  badge = false,
}: {
  label: string;
  value: string;
  badge?: boolean;
}) {
  return (
    <div className="border-b border-slate-100 p-5">

      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-2">

        {badge ? (
          <StatusBadge status={value} />
        ) : (
          <div className="text-sm font-semibold text-slate-800">
            {value}
          </div>
        )}

      </div>

    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const config =
    status === "Geçerli"
      ? {
          bg: "bg-emerald-50",
          text: "text-emerald-700",
          dot: "bg-emerald-500",
        }
      : status === "Yaklaşıyor"
      ? {
          bg: "bg-amber-50",
          text: "text-amber-700",
          dot: "bg-amber-500",
        }
      : {
          bg: "bg-red-50",
          text: "text-red-700",
          dot: "bg-red-500",
        };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${config.bg} ${config.text}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${config.dot}`}
      />

      {status || "Belirsiz"}
    </span>
  );
}

function ResultBadge({
  result,
}: {
  result: string;
}) {
  const normalized = result?.toLowerCase();

  const isGood =
    normalized === "uygun" ||
    normalized === "başarılı" ||
    normalized === "geçti";

  const isBad =
    normalized === "uygunsuz" ||
    normalized === "başarısız" ||
    normalized === "kaldı";

  const config = isGood
    ? {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        dot: "bg-emerald-500",
      }
    : isBad
    ? {
        bg: "bg-red-50",
        text: "text-red-700",
        dot: "bg-red-500",
      }
    : {
        bg: "bg-slate-100",
        text: "text-slate-600",
        dot: "bg-slate-400",
      };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${config.bg} ${config.text}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${config.dot}`}
      />

      {result || "Belirsiz"}
    </span>
  );
}

function formatDate(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("tr-TR");
}

function formatDateTime(value: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}