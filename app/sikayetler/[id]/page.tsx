"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Save,
  Upload,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  History as HistoryIcon,
  GitBranch,
  ClipboardCheck,
  ArrowLeft,
} from "lucide-react";

import AppShell from "@/app/components/AppShell";
import { createClient } from "@/app/lib/supabase/client";

type Complaint = {
  id: number;
  complaint_no: string;
  customer: string;
  subject: string;
  complaint_date: string;
  status: string;
  priority: string;
  project_code: string | null;
  product_process: string | null;
  responsible: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

type EightD = {
  id?: number;
  complaint_id: number;
  d1_team: string;
  d2_problem: string;
  d3_containment: string;
  d4_root_cause: string;
  d5_corrective_action: string;
  d6_implementation: string;
  d7_prevention: string;
  d8_closure: string;
  d4_method: string;
  d4_root_cause_category: string;
  action_responsible: string;
  target_date: string;
  completion_date: string;
  status: string;
};

type Photo = {
  id: number;
  complaint_id: number;
  photo_name: string;
  file_path: string;
  file_url: string;
  uploaded_at: string;
};

type Document = {
  id: number;
  complaint_id: number;
  document_name: string;
  file_path: string;
  file_url: string;
  document_type: string | null;
  uploaded_at: string;
};

type History = {
  id: number;
  complaint_id: number;
  action_type: string;
  description: string;
  old_value: string | null;
  new_value: string | null;
  user_name: string | null;
  created_at: string;
};

type TabKey =
  | "general"
  | "8d"
  | "photos"
  | "documents"
  | "history";

const BUCKET_PHOTOS = "complaint-photos";
const BUCKET_DOCUMENTS = "complaint-documents";

function empty8D(complaintId: number): EightD {
  return {
    complaint_id: complaintId,
    d1_team: "",
    d2_problem: "",
    d3_containment: "",
    d4_root_cause: "",
    d5_corrective_action: "",
    d6_implementation: "",
    d7_prevention: "",
    d8_closure: "",
    d4_method: "",
    d4_root_cause_category: "",
    action_responsible: "",
    target_date: "",
    completion_date: "",
    status: "Taslak",
  };
}

export default function ComplaintDetailPage() {
  const params = useParams();

  const complaintNo = Array.isArray(params.id)
    ? params.id[0]
    : String(params.id || "");

  /*
   * LİSTE SAYFASIYLA AYNI SUPABASE CLIENT
   */
  const supabase = createClient();

  const [complaint, setComplaint] =
    useState<Complaint | null>(null);

  const [eightD, setEightD] =
    useState<EightD | null>(null);

  const [photos, setPhotos] =
    useState<Photo[]>([]);

  const [documents, setDocuments] =
    useState<Document[]>([]);

  const [history, setHistory] =
    useState<History[]>([]);

  const [activeTab, setActiveTab] =
    useState<TabKey>("general");

  const [loading, setLoading] =
    useState(true);

  const [savingStatus, setSavingStatus] =
    useState(false);

  const [saving8D, setSaving8D] =
    useState(false);

  const [uploadingPhotos, setUploadingPhotos] =
    useState(false);

  const [uploadingDocuments, setUploadingDocuments] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [userRole, setUserRole] =
    useState<string | null>(null);

  const [roleLoading, setRoleLoading] =
    useState(true);

  const photoInputRef =
    useRef<HTMLInputElement>(null);

  const documentInputRef =
    useRef<HTMLInputElement>(null);

  const canEditComplaint =
    roleLoading ||
    userRole === "Yönetici" ||
    userRole === "Kalite Sorumlusu" ||
    userRole === "Kalite Kontrol";

  const canEdit8D = true;

  useEffect(() => {
    loadUserRole();
  }, []);

  useEffect(() => {
    if (!complaintNo) return;

    loadAll();
  }, [complaintNo]);

  async function loadUserRole() {
    try {
      setRoleLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "Kullanıcı bilgisi alınamadı:",
          userError
        );

        setUserRole(null);
        return;
      }

      if (!user) {
        setUserRole(null);
        return;
      }

      const {
        data: roleRows,
        error: roleError,
      } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .limit(1);

      if (roleError) {
        console.error(
          "Kullanıcı rolü alınamadı:",
          roleError
        );

        setUserRole(null);
        return;
      }

      setUserRole(
        roleRows?.[0]?.role || null
      );
    } catch (err) {
      console.error(
        "Kullanıcı rolü yüklenirken hata oluştu:",
        err
      );

      setUserRole(null);
    } finally {
      setRoleLoading(false);
    }
  }

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      let complaintData: Complaint | null =
        null;

      /*
       * 1 — Önce complaint_no ile ara
       *
       * Liste sayfası URL'yi şu şekilde oluşturuyor:
       *
       * /sikayetler/SK-26-7311
       *
       * Dolayısıyla burada da aynı değeri
       * complaints.complaint_no alanında arıyoruz.
       */
      const {
        data: complaintByNo,
        error: complaintNoError,
      } = await supabase
        .from("complaints")
        .select("*")
        .eq("complaint_no", complaintNo)
        .order("created_at", {
          ascending: false,
        })
        .limit(1);

      if (complaintNoError) {
        throw complaintNoError;
      }

      if (
        complaintByNo &&
        complaintByNo.length > 0
      ) {
        complaintData =
          complaintByNo[0] as Complaint;
      }

      /*
       * 2 — Bulamazsa numeric ID olarak dene
       *
       * Bu ikinci kontrol ileride URL yapısını
       * ID'ye çevirirsek de detay sayfasının
       * çalışmaya devam etmesini sağlar.
       */
      if (!complaintData) {
        const numericId = Number(complaintNo);

        if (
          complaintNo.trim() !== "" &&
          Number.isInteger(numericId) &&
          numericId > 0
        ) {
          const {
            data: complaintById,
            error: complaintIdError,
          } = await supabase
            .from("complaints")
            .select("*")
            .eq("id", numericId)
            .limit(1);

          if (complaintIdError) {
            throw complaintIdError;
          }

          if (
            complaintById &&
            complaintById.length > 0
          ) {
            complaintData =
              complaintById[0] as Complaint;
          }
        }
      }

      /*
       * Kayıt hâlâ bulunamadıysa detaylı hata göster.
       */
      if (!complaintData) {
        throw new Error(
          `Şikayet bulunamadı. Aranan değer: ${complaintNo}`
        );
      }

      setComplaint(complaintData);

      /*
       * Şikayetin alt kayıtlarını yükle
       */
      const [
        eightDResult,
        photosResult,
        documentsResult,
        historyResult,
      ] = await Promise.all([
        supabase
          .from("complaint_8d")
          .select("*")
          .eq(
            "complaint_id",
            complaintData.id
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(1),

        supabase
          .from("complaint_photos")
          .select("*")
          .eq(
            "complaint_id",
            complaintData.id
          )
          .order("uploaded_at", {
            ascending: false,
          }),

        supabase
          .from("complaint_documents")
          .select("*")
          .eq(
            "complaint_id",
            complaintData.id
          )
          .order("uploaded_at", {
            ascending: false,
          }),

        supabase
          .from("complaint_history")
          .select("*")
          .eq(
            "complaint_id",
            complaintData.id
          )
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (eightDResult.error) {
        throw eightDResult.error;
      }

      if (photosResult.error) {
        throw photosResult.error;
      }

      if (documentsResult.error) {
        throw documentsResult.error;
      }

      if (historyResult.error) {
        throw historyResult.error;
      }

      const firstEightD =
        eightDResult.data?.[0];

      setEightD(
        firstEightD
          ? (firstEightD as EightD)
          : empty8D(complaintData.id)
      );

      setPhotos(
        (photosResult.data || []) as Photo[]
      );

      setDocuments(
        (documentsResult.data || []) as Document[]
      );

      setHistory(
        (historyResult.data || []) as History[]
      );
    } catch (err: any) {
      console.error(
        "Şikayet detay yükleme hatası:",
        err
      );

      setComplaint(null);

      setError(
        err?.message ||
          "Şikayet detayları yüklenemedi."
      );
    } finally {
      setLoading(false);
    }
  }

  async function addHistory(
    actionType: string,
    description: string,
    oldValue?: string | null,
    newValue?: string | null
  ) {
    if (!complaint) return;

    const {
      error: historyError,
    } = await supabase
      .from("complaint_history")
      .insert({
        complaint_id: complaint.id,
        action_type: actionType,
        description,
        old_value: oldValue || null,
        new_value: newValue || null,
        user_name: "Kalite",
      });

    if (historyError) {
      console.error(
        "Geçmiş kaydı oluşturulamadı:",
        historyError
      );
    }
  }

  async function updateStatus(
    status: string
  ) {
    if (
      !complaint ||
      !canEditComplaint
    ) {
      return;
    }

    const oldStatus =
      complaint.status;

    if (oldStatus === status) {
      return;
    }

    setSavingStatus(true);
    setMessage("");
    setError("");

    const updatedAt =
      new Date().toISOString();

    const {
      error: updateError,
    } = await supabase
      .from("complaints")
      .update({
        status,
        updated_at: updatedAt,
      })
      .eq("id", complaint.id);

    if (updateError) {
      setError(
        `Durum güncellenemedi: ${updateError.message}`
      );

      setSavingStatus(false);
      return;
    }

    setComplaint({
      ...complaint,
      status,
      updated_at: updatedAt,
    });

    await addHistory(
      "Durum Değişikliği",
      `Şikayet durumu "${oldStatus}" durumundan "${status}" durumuna değiştirildi.`,
      oldStatus,
      status
    );

    setMessage(
      "Şikayet durumu güncellendi."
    );

    await reloadHistory();

    setSavingStatus(false);
  }

  async function reloadHistory() {
    if (!complaint) return;

    const {
      data,
      error: historyError,
    } = await supabase
      .from("complaint_history")
      .select("*")
      .eq(
        "complaint_id",
        complaint.id
      )
      .order("created_at", {
        ascending: false,
      });

    if (!historyError) {
      setHistory(
        (data || []) as History[]
      );
    }
  }

  async function save8D() {
    if (
      !complaint ||
      !eightD ||
      !canEdit8D
    ) {
      return;
    }

    setSaving8D(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        complaint_id: complaint.id,
        d1_team:
          eightD.d1_team || null,
        d2_problem:
          eightD.d2_problem || null,
        d3_containment:
          eightD.d3_containment || null,
        d4_root_cause:
          eightD.d4_root_cause || null,
        d5_corrective_action:
          eightD.d5_corrective_action ||
          null,
        d6_implementation:
          eightD.d6_implementation ||
          null,
        d7_prevention:
          eightD.d7_prevention || null,
        d8_closure:
          eightD.d8_closure || null,
        d4_method:
          eightD.d4_method || null,
        d4_root_cause_category:
          eightD.d4_root_cause_category ||
          null,
        action_responsible:
          eightD.action_responsible ||
          null,
        target_date:
          eightD.target_date || null,
        completion_date:
          eightD.completion_date || null,
        status:
          eightD.status || "Taslak",
        updated_at:
          new Date().toISOString(),
      };

      if (eightD.id) {
        const {
          error: updateError,
        } = await supabase
          .from("complaint_8d")
          .update(payload)
          .eq("id", eightD.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        const {
          data: insertedRows,
          error: insertError,
        } = await supabase
          .from("complaint_8d")
          .insert(payload)
          .select("*")
          .limit(1);

        if (insertError) {
          throw insertError;
        }

        if (
          insertedRows &&
          insertedRows.length > 0
        ) {
          setEightD(
            insertedRows[0] as EightD
          );
        }
      }

      await addHistory(
        "8D Güncelleme",
        "Şikayetin 8D analizi güncellendi."
      );

      await reloadHistory();

      setMessage(
        "8D analizi başarıyla kaydedildi."
      );
    } catch (err: any) {
      console.error(
        "8D kaydetme hatası:",
        err
      );

      setError(
        err?.message ||
          "8D analizi kaydedilemedi."
      );
    } finally {
      setSaving8D(false);
    }
  }

  async function uploadPhotos(
    files: FileList | null
  ) {
    if (!complaint || !files) return;

    setUploadingPhotos(true);
    setMessage("");
    setError("");

    try {
      for (const file of Array.from(files)) {
        const safeName =
          file.name.replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
          );

        const path = `${complaint.id}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

        const {
          error: uploadError,
        } = await supabase.storage
          .from(BUCKET_PHOTOS)
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType:
              file.type || undefined,
          });

        if (uploadError) {
          throw new Error(
            `Dosya Storage'a yüklenemedi (${BUCKET_PHOTOS}): ${uploadError.message}`
          );
        }

        const {
          data: publicData,
        } = supabase.storage
          .from(BUCKET_PHOTOS)
          .getPublicUrl(path);

        const {
          error: insertError,
        } = await supabase
          .from("complaint_photos")
          .insert({
            complaint_id:
              complaint.id,
            photo_name: file.name,
            file_path: path,
            file_url:
              publicData.publicUrl,
          });

        if (insertError) {
          await supabase.storage
            .from(BUCKET_PHOTOS)
            .remove([path]);

          throw new Error(
            `Fotoğraf kaydı veritabanına yazılamadı: ${insertError.message}`
          );
        }
      }

      await addHistory(
        "Fotoğraf Ekleme",
        `${files.length} adet fotoğraf şikayete eklendi.`
      );

      setMessage(
        "Fotoğraflar başarıyla yüklendi."
      );

      await loadAll();
    } catch (err: any) {
      console.error(
        "Fotoğraf yükleme hatası:",
        err
      );

      setError(
        err?.message ||
          "Fotoğraflar yüklenemedi."
      );
    } finally {
      setUploadingPhotos(false);
    }
  }

  async function uploadDocuments(
    files: FileList | null
  ) {
    if (!complaint || !files) return;

    setUploadingDocuments(true);
    setMessage("");
    setError("");

    try {
      for (const file of Array.from(files)) {
        const safeName =
          file.name.replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
          );

        const path = `${complaint.id}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

        const {
          error: uploadError,
        } = await supabase.storage
          .from(BUCKET_DOCUMENTS)
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType:
              file.type || undefined,
          });

        if (uploadError) {
          throw new Error(
            `Dosya Storage'a yüklenemedi (${BUCKET_DOCUMENTS}): ${uploadError.message}`
          );
        }

        const {
          data: publicData,
        } = supabase.storage
          .from(BUCKET_DOCUMENTS)
          .getPublicUrl(path);

        const {
          error: insertError,
        } = await supabase
          .from("complaint_documents")
          .insert({
            complaint_id:
              complaint.id,
            document_name:
              file.name,
            file_path: path,
            file_url:
              publicData.publicUrl,
            document_type:
              file.type || null,
          });

        if (insertError) {
          await supabase.storage
            .from(BUCKET_DOCUMENTS)
            .remove([path]);

          throw new Error(
            `Doküman kaydı veritabanına yazılamadı: ${insertError.message}`
          );
        }
      }

      await addHistory(
        "Doküman Ekleme",
        `${files.length} adet doküman şikayete eklendi.`
      );

      setMessage(
        "Dokümanlar başarıyla yüklendi."
      );

      await loadAll();
    } catch (err: any) {
      console.error(
        "Doküman yükleme hatası:",
        err
      );

      setError(
        err?.message ||
          "Dokümanlar yüklenemedi."
      );
    } finally {
      setUploadingDocuments(false);
    }
  }

  async function deletePhoto(
    photo: Photo
  ) {
    if (
      !complaint ||
      !canEditComplaint
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `"${photo.photo_name}" fotoğrafı silinsin mi?`
      );

    if (!confirmed) return;

    try {
      const {
        error: storageError,
      } = await supabase.storage
        .from(BUCKET_PHOTOS)
        .remove([photo.file_path]);

      if (storageError) {
        throw storageError;
      }

      const {
        error: deleteError,
      } = await supabase
        .from("complaint_photos")
        .delete()
        .eq("id", photo.id);

      if (deleteError) {
        throw deleteError;
      }

      await addHistory(
        "Fotoğraf Silme",
        `"${photo.photo_name}" fotoğrafı silindi.`
      );

      setMessage(
        "Fotoğraf silindi."
      );

      await loadAll();
    } catch (err: any) {
      setError(
        err?.message ||
          "Fotoğraf silinemedi."
      );
    }
  }

  async function deleteDocument(
    document: Document
  ) {
    if (
      !complaint ||
      !canEditComplaint
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `"${document.document_name}" dokümanı silinsin mi?`
      );

    if (!confirmed) return;

    try {
      const {
        error: storageError,
      } = await supabase.storage
        .from(BUCKET_DOCUMENTS)
        .remove([document.file_path]);

      if (storageError) {
        throw storageError;
      }

      const {
        error: deleteError,
      } = await supabase
        .from("complaint_documents")
        .delete()
        .eq("id", document.id);

      if (deleteError) {
        throw deleteError;
      }

      await addHistory(
        "Doküman Silme",
        `"${document.document_name}" dokümanı silindi.`
      );

      setMessage(
        "Doküman silindi."
      );

      await loadAll();
    } catch (err: any) {
      setError(
        err?.message ||
          "Doküman silinemedi."
      );
    }
  }

  function updateEightD(
    field: keyof EightD,
    value: string
  ) {
    if (!eightD || !canEdit8D) return;

    setEightD({
      ...eightD,
      [field]: value,
    });
  }

  if (loading) {
    return (
      <AppShell>
        <div className="p-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
            Şikayet detayları yükleniyor...
          </div>
        </div>
      </AppShell>
    );
  }

  if (!complaint) {
    return (
      <AppShell>
        <div className="p-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {error ||
              "Şikayet bulunamadı."}
          </div>
        </div>
      </AppShell>
    );
  }

  const eightDProgress =
    eightD &&
    [
      eightD.d1_team,
      eightD.d2_problem,
      eightD.d3_containment,
      eightD.d4_root_cause,
      eightD.d5_corrective_action,
      eightD.d6_implementation,
      eightD.d7_prevention,
      eightD.d8_closure,
    ].filter(
      (value) =>
        value &&
        value.trim().length > 0
    ).length;

  return (
    <AppShell>
      <div className="box-border w-full min-w-0 max-w-full overflow-x-hidden px-8 py-6">
        <div className="mx-auto w-full max-w-[1500px] space-y-6">

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                <Link
                  href="/sikayetler"
                  className="flex items-center gap-1 hover:text-blue-600"
                >
                  <ArrowLeft size={16} />
                  Şikayetler
                </Link>

                <span>/</span>

                <span>Şikayet Detayı</span>
              </div>

              <h1 className="text-2xl font-semibold text-slate-900">
                {complaint.complaint_no}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                {complaint.subject}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={complaint.status}
                onChange={(e) =>
                  updateStatus(
                    e.target.value
                  )
                }
                disabled={
                  savingStatus ||
                  roleLoading ||
                  !canEditComplaint
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="Açık">
                  Açık
                </option>

                <option value="İnceleniyor">
                  İnceleniyor
                </option>

                <option value="Beklemede">
                  Beklemede
                </option>

                <option value="Çözüldü">
                  Çözüldü
                </option>

                <option value="Kapalı">
                  Kapalı
                </option>

                <option value="Araştırılıyor">
                  Araştırılıyor
                </option>
              </select>

              <Link
                href={`/sikayetler/${encodeURIComponent(
                  complaint.complaint_no
                )}/kok-neden`}
                className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                <GitBranch size={17} />
                Kök Neden Analizi
              </Link>

              <Link
                href={`/sikayetler/${encodeURIComponent(
                  complaint.complaint_no
                )}/aksiyonlar`}
                className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                Aksiyonlar
              </Link>
            </div>
          </div>

          {message && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 size={17} />
              {message}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle size={17} />
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoCard
              label="Müşteri"
              value={complaint.customer}
            />

            <InfoCard
              label="Şikayet Tarihi"
              value={formatDate(
                complaint.complaint_date
              )}
            />

            <InfoCard
              label="Öncelik"
              value={complaint.priority}
            />

            <InfoCard
              label="Sorumlu"
              value={
                complaint.responsible ||
                "Atanmadı"
              }
            />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex min-w-max border-b border-slate-100">
              <Tab
                active={
                  activeTab === "general"
                }
                onClick={() =>
                  setActiveTab("general")
                }
                label="Genel Bilgiler"
              />

              <Tab
                active={
                  activeTab === "8d"
                }
                onClick={() =>
                  setActiveTab("8d")
                }
                label="8D Analizi"
                icon={
                  <ClipboardCheck size={16} />
                }
              />

              <Tab
                active={
                  activeTab === "photos"
                }
                onClick={() =>
                  setActiveTab("photos")
                }
                label="Fotoğraflar"
                icon={
                  <ImageIcon size={16} />
                }
              />

              <Tab
                active={
                  activeTab === "documents"
                }
                onClick={() =>
                  setActiveTab("documents")
                }
                label="Dokümanlar"
                icon={
                  <FileText size={16} />
                }
              />

              <Tab
                active={
                  activeTab === "history"
                }
                onClick={() =>
                  setActiveTab("history")
                }
                label="İşlem Geçmişi"
                icon={
                  <HistoryIcon size={16} />
                }
              />
            </div>

            {activeTab === "general" && (
              <div className="space-y-6 p-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Şikayet Bilgileri
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Şikayete ait temel bilgiler ve açıklama.
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  <Detail
                    label="Şikayet No"
                    value={
                      complaint.complaint_no
                    }
                  />

                  <Detail
                    label="Müşteri"
                    value={
                      complaint.customer
                    }
                  />

                  <Detail
                    label="Konu"
                    value={
                      complaint.subject
                    }
                  />

                  <Detail
                    label="Proje Kodu"
                    value={
                      complaint.project_code ||
                      "Belirtilmedi"
                    }
                  />

                  <Detail
                    label="Ürün / Proses"
                    value={
                      complaint.product_process ||
                      "Belirtilmedi"
                    }
                  />

                  <Detail
                    label="Sorumlu"
                    value={
                      complaint.responsible ||
                      "Atanmadı"
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Şikayet Açıklaması
                  </label>

                  <div className="min-h-[140px] whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
                    {complaint.description ||
                      "Açıklama girilmemiş."}
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <Detail
                    label="Oluşturulma"
                    value={formatDateTime(
                      complaint.created_at
                    )}
                  />

                  <Detail
                    label="Son Güncelleme"
                    value={formatDateTime(
                      complaint.updated_at
                    )}
                  />
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                  <div className="flex items-start gap-3">
                    <GitBranch
                      size={20}
                      className="mt-0.5 text-blue-600"
                    />

                    <div>
                      <h3 className="font-semibold text-blue-900">
                        Kök Neden Analizi
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-blue-800">
                        Şikayetin temel nedenlerini 5 Neden veya Balık Kılçığı yöntemiyle analiz etmek için ayrı analiz ekranını açabilirsiniz.
                      </p>

                      <Link
                        href={`/sikayetler/${encodeURIComponent(
                          complaint.complaint_no
                        )}/kok-neden`}
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        Kök Neden Analizine Git
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "8d" &&
              eightD && (
                <div className="space-y-6 p-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        8D Problem Çözme Analizi
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Şikayetin sistematik olarak analiz edilmesi ve kalıcı aksiyonların takip edilmesi.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                        İlerleme:{" "}
                        <span className="font-semibold text-slate-900">
                          {eightDProgress}/8
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={save8D}
                        disabled={
                          saving8D
                        }
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        <Save size={17} />

                        {saving8D
                          ? "Kaydediliyor..."
                          : "8D'yi Kaydet"}
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <EightDBox
                      title="D1 — Ekip"
                      description="Problemi çözmek için görev alacak ekibi tanımlayın."
                      value={
                        eightD.d1_team
                      }
                      onChange={(
                        value
                      ) =>
                        updateEightD(
                          "d1_team",
                          value
                        )
                      }
                      disabled={
                        !canEdit8D
                      }
                    />

                    <EightDBox
                      title="D2 — Problem Tanımı"
                      description="Problemi açık, ölçülebilir ve doğrulanabilir şekilde tanımlayın."
                      value={
                        eightD.d2_problem
                      }
                      onChange={(
                        value
                      ) =>
                        updateEightD(
                          "d2_problem",
                          value
                        )
                      }
                      disabled={
                        !canEdit8D
                      }
                    />

                    <EightDBox
                      title="D3 — Geçici Önlem"
                      description="Müşteriyi ve süreci korumak için alınan geçici önlemler."
                      value={
                        eightD.d3_containment
                      }
                      onChange={(
                        value
                      ) =>
                        updateEightD(
                          "d3_containment",
                          value
                        )
                      }
                      disabled={
                        !canEdit8D
                      }
                    />

                    <EightDBox
                      title="D4 — Kök Neden"
                      description="Problemin oluşmasına neden olan temel neden."
                      value={
                        eightD.d4_root_cause
                      }
                      onChange={(
                        value
                      ) =>
                        updateEightD(
                          "d4_root_cause",
                          value
                        )
                      }
                      disabled={
                        !canEdit8D
                      }
                    />

                    <EightDBox
                      title="D5 — Düzeltici Faaliyet"
                      description="Kök nedeni ortadan kaldıracak kalıcı aksiyon."
                      value={
                        eightD.d5_corrective_action
                      }
                      onChange={(
                        value
                      ) =>
                        updateEightD(
                          "d5_corrective_action",
                          value
                        )
                      }
                      disabled={
                        !canEdit8D
                      }
                    />

                    <EightDBox
                      title="D6 — Uygulama"
                      description="Aksiyonun nasıl ve ne zaman uygulandığını açıklayın."
                      value={
                        eightD.d6_implementation
                      }
                      onChange={(
                        value
                      ) =>
                        updateEightD(
                          "d6_implementation",
                          value
                        )
                      }
                      disabled={
                        !canEdit8D
                      }
                    />

                    <EightDBox
                      title="D7 — Tekrarı Önleme"
                      description="Benzer problemin tekrar oluşmasını önleyecek sistemsel önlemler."
                      value={
                        eightD.d7_prevention
                      }
                      onChange={(
                        value
                      ) =>
                        updateEightD(
                          "d7_prevention",
                          value
                        )
                      }
                      disabled={
                        !canEdit8D
                      }
                    />

                    <EightDBox
                      title="D8 — Kapanış"
                      description="Sonuç, etkinlik kontrolü ve kapanış değerlendirmesi."
                      value={
                        eightD.d8_closure
                      }
                      onChange={(
                        value
                      ) =>
                        updateEightD(
                          "d8_closure",
                          value
                        )
                      }
                      disabled={
                        !canEdit8D
                      }
                    />
                  </div>

                  <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="font-semibold text-slate-900">
                      D4 / Kök Neden Bilgileri
                    </h3>

                    <div className="mt-4 grid gap-5 md:grid-cols-3">
                      <Field
                        label="Analiz Yöntemi"
                        value={
                          eightD.d4_method
                        }
                        onChange={(
                          value
                        ) =>
                          updateEightD(
                            "d4_method",
                            value
                          )
                        }
                        placeholder="5 Neden, Ishikawa vb."
                        disabled={
                          !canEdit8D
                        }
                      />

                      <Field
                        label="Kök Neden Kategorisi"
                        value={
                          eightD.d4_root_cause_category
                        }
                        onChange={(
                          value
                        ) =>
                          updateEightD(
                            "d4_root_cause_category",
                            value
                          )
                        }
                        placeholder="İnsan, Makine, Metot..."
                        disabled={
                          !canEdit8D
                        }
                      />

                      <Field
                        label="Aksiyon Sorumlusu"
                        value={
                          eightD.action_responsible
                        }
                        onChange={(
                          value
                        ) =>
                          updateEightD(
                            "action_responsible",
                            value
                          )
                        }
                        placeholder="Sorumlu kişi / bölüm"
                        disabled={
                          !canEdit8D
                        }
                      />
                    </div>

                    <div className="mt-5 grid gap-5 md:grid-cols-3">
                      <Field
                        label="Hedef Tarih"
                        type="date"
                        value={
                          eightD.target_date
                        }
                        onChange={(
                          value
                        ) =>
                          updateEightD(
                            "target_date",
                            value
                          )
                        }
                        disabled={
                          !canEdit8D
                        }
                      />

                      <Field
                        label="Tamamlanma Tarihi"
                        type="date"
                        value={
                          eightD.completion_date
                        }
                        onChange={(
                          value
                        ) =>
                          updateEightD(
                            "completion_date",
                            value
                          )
                        }
                        disabled={
                          !canEdit8D
                        }
                      />

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          8D Durumu
                        </label>

                        <select
                          value={
                            eightD.status
                          }
                          disabled={
                            !canEdit8D
                          }
                          onChange={(
                            e
                          ) =>
                            updateEightD(
                              "status",
                              e.target.value
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="Taslak">
                            Taslak
                          </option>

                          <option value="Devam Ediyor">
                            Devam Ediyor
                          </option>

                          <option value="Tamamlandı">
                            Tamamlandı
                          </option>

                          <option value="Onaylandı">
                            Onaylandı
                          </option>
                        </select>
                      </div>
                    </div>
                  </section>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={save8D}
                      disabled={
                        saving8D ||
                        !canEdit8D
                      }
                      className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      <Save size={17} />

                      {saving8D
                        ? "Kaydediliyor..."
                        : "8D Analizini Kaydet"}
                    </button>
                  </div>
                </div>
              )}

            {activeTab === "photos" && (
              <div className="space-y-6 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Şikayet Fotoğrafları
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Şikayetle ilgili görselleri yükleyin ve yönetin.
                    </p>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        photoInputRef.current?.click()
                      }
                      disabled={
                        uploadingPhotos
                      }
                      className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Upload size={17} />

                      {uploadingPhotos
                        ? "Yükleniyor..."
                        : "Fotoğraf Yükle"}
                    </button>

                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={
                        uploadingPhotos
                      }
                      onChange={(e) => {
                        uploadPhotos(
                          e.target.files
                        );

                        e.currentTarget.value =
                          "";
                      }}
                    />
                  </div>
                </div>

                {photos.length === 0 ? (
                  <EmptyState
                    icon={
                      <ImageIcon size={24} />
                    }
                    text="Henüz fotoğraf eklenmemiş."
                  />
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {photos.map(
                      (photo) => (
                        <div
                          key={photo.id}
                          className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                        >
                          <a
                            href={
                              photo.file_url
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            <img
                              src={
                                photo.file_url
                              }
                              alt={
                                photo.photo_name
                              }
                              className="h-48 w-full object-cover"
                            />
                          </a>

                          <div className="p-4">
                            <p className="truncate text-sm font-medium text-slate-700">
                              {
                                photo.photo_name
                              }
                            </p>

                            <div className="mt-3 flex justify-end">
                              <button
                                type="button"
                                onClick={() =>
                                  deletePhoto(
                                    photo
                                  )
                                }
                                disabled={
                                  roleLoading ||
                                  !canEditComplaint
                                }
                                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                <Trash2
                                  size={16}
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "documents" && (
              <div className="space-y-6 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Şikayet Dokümanları
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Şikayete ait rapor, sertifika, yazışma ve diğer belgeleri yönetin.
                    </p>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        documentInputRef.current?.click()
                      }
                      disabled={
                        uploadingDocuments
                      }
                      className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Upload size={17} />

                      {uploadingDocuments
                        ? "Yükleniyor..."
                        : "Doküman Yükle"}
                    </button>

                    <input
                      ref={documentInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      disabled={
                        uploadingDocuments
                      }
                      onChange={(e) => {
                        uploadDocuments(
                          e.target.files
                        );

                        e.currentTarget.value =
                          "";
                      }}
                    />
                  </div>
                </div>

                {documents.length === 0 ? (
                  <EmptyState
                    icon={
                      <FileText size={24} />
                    }
                    text="Henüz doküman eklenmemiş."
                  />
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-5 py-4 text-left font-semibold text-slate-700">
                            Doküman
                          </th>

                          <th className="px-5 py-4 text-left font-semibold text-slate-700">
                            Tip
                          </th>

                          <th className="px-5 py-4 text-left font-semibold text-slate-700">
                            Tarih
                          </th>

                          <th className="px-5 py-4 text-right font-semibold text-slate-700">
                            İşlem
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {documents.map(
                          (document) => (
                            <tr
                              key={
                                document.id
                              }
                              className="border-t border-slate-100"
                            >
                              <td className="px-5 py-4">
                                <a
                                  href={
                                    document.file_url
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-3 font-medium text-blue-600 hover:text-blue-800"
                                >
                                  <FileText
                                    size={18}
                                  />

                                  {
                                    document.document_name
                                  }
                                </a>
                              </td>

                              <td className="px-5 py-4 text-slate-500">
                                {document.document_type ||
                                  "-"}
                              </td>

                              <td className="px-5 py-4 text-slate-500">
                                {formatDateTime(
                                  document.uploaded_at
                                )}
                              </td>

                              <td className="px-5 py-4 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    deleteDocument(
                                      document
                                    )
                                  }
                                  disabled={
                                    roleLoading ||
                                    !canEditComplaint
                                  }
                                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                  <Trash2
                                    size={16}
                                  />
                                </button>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === "history" && (
              <div className="space-y-6 p-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    İşlem Geçmişi
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Şikayet üzerinde yapılan işlemlerin kronolojik kaydı.
                  </p>
                </div>

                {history.length === 0 ? (
                  <EmptyState
                    icon={
                      <HistoryIcon size={24} />
                    }
                    text="Henüz işlem geçmişi bulunmuyor."
                  />
                ) : (
                  <div className="space-y-4">
                    {history.map(
                      (item) => (
                        <div
                          key={item.id}
                          className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                            <HistoryIcon
                              size={18}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                              <h3 className="font-semibold text-slate-800">
                                {
                                  item.action_type
                                }
                              </h3>

                              <span className="text-xs text-slate-400">
                                {formatDateTime(
                                  item.created_at
                                )}
                              </span>
                            </div>

                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {
                                item.description
                              }
                            </p>

                            {(item.old_value ||
                              item.new_value) && (
                              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                                {item.old_value && (
                                  <div>
                                    <span className="font-semibold">
                                      Eski:
                                    </span>{" "}
                                    {
                                      item.old_value
                                    }
                                  </div>
                                )}

                                {item.new_value && (
                                  <div className="mt-1">
                                    <span className="font-semibold">
                                      Yeni:
                                    </span>{" "}
                                    {
                                      item.new_value
                                    }
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-2 truncate text-sm font-semibold text-slate-800">
        {value}
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-1 text-sm font-medium text-slate-800">
        {value}
      </div>
    </div>
  );
}

function Tab({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-5 py-4 text-sm font-medium transition ${
        active
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function EightDBox({
  title,
  description,
  value,
  onChange,
  disabled = false,
}: {
  title: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-slate-900">
        {title}
      </h3>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>

      <textarea
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        rows={5}
        disabled={disabled}
        className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        placeholder="Bilgileri girin..."
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      />
    </div>
  );
}

function EmptyState({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center text-slate-400">
      <div className="mb-3">
        {icon}
      </div>

      <p className="text-sm">
        {text}
      </p>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return "-";

  return new Date(
    `${value}T00:00:00`
  ).toLocaleDateString("tr-TR");
}

function formatDateTime(value: string) {
  if (!value) return "-";

  return new Date(value).toLocaleString(
    "tr-TR",
    {
      dateStyle: "short",
      timeStyle: "short",
    }
  );
}