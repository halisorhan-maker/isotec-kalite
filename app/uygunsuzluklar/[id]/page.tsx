"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  History,
  ShieldAlert,
  UserRound,
  XCircle,
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Paperclip,
  ExternalLink,
  Upload,
  File,
  Image as ImageIcon,
} from "lucide-react";
import AppShell from "../../components/AppShell";
import { supabase } from "../../lib/supabase";

type Nonconformity = {
  id: number;
  nonconformity_no: string;
  nonconformity_date: string;
  source: string;
  customer: string | null;
  project_code: string | null;
  product_process: string | null;
  subject: string;
  description: string | null;
  priority: string;
  status: string;
  responsible: string | null;
  target_date: string | null;
  closed_date: string | null;
  root_cause: string | null;
  root_cause_category: string | null;
  analysis_method: string | null;
  effectiveness_check: string | null;
  effectiveness_result: string | null;
  created_at: string;
  updated_at: string;
};

type HistoryItem = {
  id: number;
  action_type: string;
  description: string;
  old_value: string | null;
  new_value: string | null;
  user_name: string | null;
  created_at: string;
};

type NonconformityAction = {
  id: number;
  nonconformity_id: number;
  action_no: number;
  action_type: string;
  action_description: string;
  responsible: string | null;
  target_date: string | null;
  completion_date: string | null;
  status: string;
  effectiveness_check: string | null;
  effectiveness_result: string | null;
  created_at: string;
  updated_at: string;
};

type NonconformityDocument = {
  id: number;
  nonconformity_id: number;
  action_id: number | null;
  document_name: string;
  file_path: string;
  file_url: string;
  document_type: string | null;
  document_category: string;
  uploaded_by: string | null;
  uploaded_at: string;
};

type NonconformityPhoto = {
  id: number;
  nonconformity_id: number;
  action_id: number | null;
  photo_name: string;
  file_path: string;
  file_url: string;
  photo_category: string;
  uploaded_by: string | null;
  uploaded_at: string;
};

type ActionForm = {
  id?: number;
  action_no: number;
  action_type: string;
  action_description: string;
  responsible: string;
  target_date: string;
  completion_date: string;
  status: string;
  effectiveness_check: string;
  effectiveness_result: string;
};

const statusOptions = [
  "Açık",
  "İnceleniyor",
  "Aksiyon Bekliyor",
  "Doğrulama",
  "Kapatıldı",
];

const actionStatusOptions = [
  "Açık",
  "Devam Ediyor",
  "Tamamlandı",
  "İptal",
];

const actionTypeOptions = [
  "Düzeltici Faaliyet",
  "Önleyici Faaliyet",
  "Anlık Düzeltme",
  "Kontrol Faaliyeti",
  "Diğer",
];

const documentCategoryOptions = [
  "Uygunsuzluk Dokümanı",
  "Aksiyon Kanıtı",
  "Test Raporu",
  "Tedarikçi Dokümanı",
  "Kontrol Formu",
  "Diğer",
];

const photoCategoryOptions = [
  "Uygunsuzluk Fotoğrafı",
  "Aksiyon Öncesi",
  "Aksiyon Sonrası",
  "Ölçüm Fotoğrafı",
  "Diğer",
];

const emptyAction: ActionForm = {
  action_no: 1,
  action_type: "Düzeltici Faaliyet",
  action_description: "",
  responsible: "",
  target_date: "",
  completion_date: "",
  status: "Açık",
  effectiveness_check: "",
  effectiveness_result: "",
};

function formatDate(date: string | null) {
  if (!date) return "-";

  return new Date(`${date}T00:00:00`).toLocaleDateString("tr-TR");
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function getStatusClasses(status: string) {
  switch (status) {
    case "Açık":
      return "bg-red-50 text-red-700 border-red-200";

    case "İnceleniyor":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "Aksiyon Bekliyor":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "Doğrulama":
      return "bg-violet-50 text-violet-700 border-violet-200";

    case "Kapatıldı":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function getPriorityClasses(priority: string) {
  switch (priority) {
    case "Kritik":
      return "bg-red-100 text-red-700";

    case "Yüksek":
      return "bg-orange-100 text-orange-700";

    case "Orta":
      return "bg-amber-100 text-amber-700";

    case "Düşük":
      return "bg-slate-100 text-slate-600";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getActionStatusClasses(status: string) {
  switch (status) {
    case "Açık":
      return "bg-red-50 text-red-700 border-red-200";

    case "Devam Ediyor":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "Tamamlandı":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "İptal":
      return "bg-slate-100 text-slate-500 border-slate-200";

    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function isActionOverdue(action: NonconformityAction) {
  if (
    !action.target_date ||
    action.status === "Tamamlandı" ||
    action.status === "İptal"
  ) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(`${action.target_date}T00:00:00`);

  return target < today;
}

function isOverdue(item: Nonconformity) {
  if (!item.target_date || item.status === "Kapatıldı") return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(`${item.target_date}T00:00:00`);

  return target < today;
}

export default function UygunsuzlukDetayPage() {
  const params = useParams();
  const id = String(params.id);

  const [item, setItem] = useState<Nonconformity | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [actions, setActions] = useState<NonconformityAction[]>([]);
  const [documents, setDocuments] = useState<NonconformityDocument[]>([]);
  const [photos, setPhotos] = useState<NonconformityPhoto[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingAction, setSavingAction] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [deletingFileId, setDeletingFileId] =
    useState<string | null>(null);

  const [showActionForm, setShowActionForm] = useState(false);
  const [editingActionId, setEditingActionId] =
    useState<number | null>(null);

  const [showEvidenceForm, setShowEvidenceForm] =
    useState(false);

  const [evidenceActionId, setEvidenceActionId] =
    useState<string>("");

  const [documentCategory, setDocumentCategory] =
    useState("Uygunsuzluk Dokümanı");

  const [photoCategory, setPhotoCategory] =
    useState("Uygunsuzluk Fotoğrafı");

  const [evidenceType, setEvidenceType] =
    useState<"document" | "photo">("document");

  const [actionForm, setActionForm] =
    useState<ActionForm>(emptyAction);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    const { data, error: queryError } = await supabase
      .from("nonconformities")
      .select("*")
      .eq("nonconformity_no", id)
      .single();

    if (queryError || !data) {
      setError(
        queryError?.message ||
          "Uygunsuzluk kaydı bulunamadı."
      );
      setLoading(false);
      return;
    }

    setItem(data as Nonconformity);

    const { data: historyData, error: historyLoadError } =
      await supabase
        .from("nonconformity_history")
        .select("*")
        .eq("nonconformity_id", data.id)
        .order("created_at", { ascending: false });

    if (historyLoadError) {
      console.error(
        "History yüklenemedi:",
        historyLoadError.message
      );
      setHistory([]);
    } else {
      setHistory(
        (historyData ?? []) as HistoryItem[]
      );
    }

    const { data: actionData, error: actionLoadError } =
      await supabase
        .from("nonconformity_actions")
        .select("*")
        .eq("nonconformity_id", data.id)
        .order("action_no", { ascending: true });

    if (actionLoadError) {
      console.error(
        "Aksiyonlar yüklenemedi:",
        actionLoadError.message
      );
      setActions([]);
    } else {
      setActions(
        (actionData ?? []) as NonconformityAction[]
      );
    }

    const {
      data: documentData,
      error: documentLoadError,
    } = await supabase
      .from("nonconformity_documents")
      .select("*")
      .eq("nonconformity_id", data.id)
      .order("uploaded_at", { ascending: false });

    if (documentLoadError) {
      console.error(
        "Dokümanlar yüklenemedi:",
        documentLoadError.message
      );
      setDocuments([]);
    } else {
      setDocuments(
        (documentData ??
          []) as NonconformityDocument[]
      );
    }

    const {
      data: photoData,
      error: photoLoadError,
    } = await supabase
      .from("nonconformity_photos")
      .select("*")
      .eq("nonconformity_id", data.id)
      .order("uploaded_at", { ascending: false });

    if (photoLoadError) {
      console.error(
        "Fotoğraflar yüklenemedi:",
        photoLoadError.message
      );
      setPhotos([]);
    } else {
      setPhotos(
        (photoData ?? []) as NonconformityPhoto[]
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [id]);

  async function addHistory(
    actionType: string,
    description: string,
    oldValue?: string | null,
    newValue?: string | null
  ) {
    if (!item) return;

    const { error: historyError } = await supabase
      .from("nonconformity_history")
      .insert({
        nonconformity_id: item.id,
        action_type: actionType,
        description,
        old_value: oldValue ?? null,
        new_value: newValue ?? null,
        user_name: "Kalite Kullanıcısı",
      });

    if (historyError) {
      console.error(
        "History kaydedilemedi:",
        historyError.message
      );
      return;
    }

    const { data: latestHistory } = await supabase
      .from("nonconformity_history")
      .select("*")
      .eq("nonconformity_id", item.id)
      .order("created_at", { ascending: false });

    setHistory(
      (latestHistory ?? []) as HistoryItem[]
    );
  }

  async function updateStatus(status: string) {
    if (!item) return;

    const oldStatus = item.status;

    if (oldStatus === status) return;

    setSavingStatus(true);
    setMessage("");
    setError("");

    const updatedAt = new Date().toISOString();

    const newClosedDate =
      status === "Kapatıldı"
        ? new Date().toISOString().split("T")[0]
        : null;

    const { error: updateError } = await supabase
      .from("nonconformities")
      .update({
        status,
        updated_at: updatedAt,
        closed_date: newClosedDate,
      })
      .eq("id", item.id);

    if (updateError) {
      setError(
        `Durum güncellenemedi: ${updateError.message}`
      );
      setSavingStatus(false);
      return;
    }

    setItem({
      ...item,
      status,
      updated_at: updatedAt,
      closed_date: newClosedDate,
    });

    await addHistory(
      "Durum Değişikliği",
      `Uygunsuzluk durumu "${oldStatus}" durumundan "${status}" durumuna değiştirildi.`,
      oldStatus,
      status
    );

    setMessage("Uygunsuzluk durumu güncellendi.");
    setSavingStatus(false);
  }

  function openNewActionForm() {
    const nextActionNo =
      actions.length > 0
        ? Math.max(
            ...actions.map(
              (action) => action.action_no
            )
          ) + 1
        : 1;

    setActionForm({
      ...emptyAction,
      action_no: nextActionNo,
    });

    setEditingActionId(null);
    setShowActionForm(true);
    setMessage("");
    setError("");
  }

  function openEditActionForm(
    action: NonconformityAction
  ) {
    setActionForm({
      id: action.id,
      action_no: action.action_no,
      action_type: action.action_type,
      action_description:
        action.action_description,
      responsible: action.responsible || "",
      target_date: action.target_date || "",
      completion_date:
        action.completion_date || "",
      status: action.status,
      effectiveness_check:
        action.effectiveness_check || "",
      effectiveness_result:
        action.effectiveness_result || "",
    });

    setEditingActionId(action.id);
    setShowActionForm(true);
    setMessage("");
    setError("");
  }

  function closeActionForm() {
    setShowActionForm(false);
    setEditingActionId(null);
    setActionForm(emptyAction);
  }

  async function saveAction() {
    if (!item) return;

    setSavingAction(true);
    setMessage("");
    setError("");

    if (!actionForm.action_description.trim()) {
      setError("Aksiyon açıklaması zorunludur.");
      setSavingAction(false);
      return;
    }

    const updatedAt = new Date().toISOString();

    const payload = {
      nonconformity_id: item.id,
      action_no: actionForm.action_no,
      action_type: actionForm.action_type,
      action_description:
        actionForm.action_description.trim(),
      responsible:
        actionForm.responsible.trim() || null,
      target_date:
        actionForm.target_date || null,
      completion_date:
        actionForm.completion_date || null,
      status: actionForm.status,
      effectiveness_check:
        actionForm.effectiveness_check.trim() ||
        null,
      effectiveness_result:
        actionForm.effectiveness_result.trim() ||
        null,
      updated_at: updatedAt,
    };

    if (editingActionId) {
      const oldAction = actions.find(
        (action) =>
          action.id === editingActionId
      );

      const { error: updateError } =
        await supabase
          .from("nonconformity_actions")
          .update(payload)
          .eq("id", editingActionId);

      if (updateError) {
        setError(
          `Aksiyon güncellenemedi: ${updateError.message}`
        );
        setSavingAction(false);
        return;
      }

      await addHistory(
        "Aksiyon Güncellendi",
        `Aksiyon #${actionForm.action_no} güncellendi: ${actionForm.action_description}`,
        oldAction?.status || null,
        actionForm.status
      );

      setMessage(
        `Aksiyon #${actionForm.action_no} güncellendi.`
      );
    } else {
      const { error: insertError } =
        await supabase
          .from("nonconformity_actions")
          .insert(payload);

      if (insertError) {
        setError(
          `Aksiyon eklenemedi: ${insertError.message}`
        );
        setSavingAction(false);
        return;
      }

      await addHistory(
        "Aksiyon Eklendi",
        `Aksiyon #${actionForm.action_no} oluşturuldu: ${actionForm.action_description}`,
        null,
        actionForm.status
      );

      setMessage(
        `Aksiyon #${actionForm.action_no} başarıyla eklendi.`
      );
    }

    closeActionForm();

    const { data: latestActions } =
      await supabase
        .from("nonconformity_actions")
        .select("*")
        .eq("nonconformity_id", item.id)
        .order("action_no", {
          ascending: true,
        });

    setActions(
      (latestActions ??
        []) as NonconformityAction[]
    );

    setSavingAction(false);
  }

  async function deleteAction(
    action: NonconformityAction
  ) {
    if (!item) return;

    const confirmed = window.confirm(
      `Aksiyon #${action.action_no} silinecek. Emin misiniz?`
    );

    if (!confirmed) return;

    setMessage("");
    setError("");

    const { error: deleteError } =
      await supabase
        .from("nonconformity_actions")
        .delete()
        .eq("id", action.id);

    if (deleteError) {
      setError(
        `Aksiyon silinemedi: ${deleteError.message}`
      );
      return;
    }

    await addHistory(
      "Aksiyon Silindi",
      `Aksiyon #${action.action_no} silindi: ${action.action_description}`,
      action.status,
      null
    );

    setActions((current) =>
      current.filter(
        (currentAction) =>
          currentAction.id !== action.id
      )
    );

    setDocuments((current) =>
      current.filter(
        (document) =>
          document.action_id !== action.id
      )
    );

    setPhotos((current) =>
      current.filter(
        (photo) =>
          photo.action_id !== action.id
      )
    );

    setMessage(
      `Aksiyon #${action.action_no} silindi.`
    );
  }

  async function completeAction(
    action: NonconformityAction
  ) {
    if (!item) return;

    const today = new Date()
      .toISOString()
      .split("T")[0];

    const updatedAt = new Date().toISOString();

    const { error: updateError } =
      await supabase
        .from("nonconformity_actions")
        .update({
          status: "Tamamlandı",
          completion_date:
            action.completion_date || today,
          updated_at: updatedAt,
        })
        .eq("id", action.id);

    if (updateError) {
      setError(
        `Aksiyon tamamlanamadı: ${updateError.message}`
      );
      return;
    }

    await addHistory(
      "Aksiyon Tamamlandı",
      `Aksiyon #${action.action_no} tamamlandı: ${action.action_description}`,
      action.status,
      "Tamamlandı"
    );

    setActions((current) =>
      current.map((currentAction) =>
        currentAction.id === action.id
          ? {
              ...currentAction,
              status: "Tamamlandı",
              completion_date:
                action.completion_date ||
                today,
              updated_at: updatedAt,
            }
          : currentAction
      )
    );

    setMessage(
      `Aksiyon #${action.action_no} tamamlandı.`
    );
  }

  function openEvidenceForm(
    type: "document" | "photo",
    actionId?: number | null
  ) {
    setEvidenceType(type);
    setEvidenceActionId(
      actionId ? String(actionId) : ""
    );

    setDocumentCategory(
      actionId
        ? "Aksiyon Kanıtı"
        : "Uygunsuzluk Dokümanı"
    );

    setPhotoCategory(
      actionId
        ? "Aksiyon Sonrası"
        : "Uygunsuzluk Fotoğrafı"
    );

    setShowEvidenceForm(true);
    setMessage("");
    setError("");
  }

  function closeEvidenceForm() {
    setShowEvidenceForm(false);
    setEvidenceActionId("");
    setEvidenceType("document");
  }

  async function uploadEvidence(file: File) {
    if (!item) return;

    setUploading(true);
    setMessage("");
    setError("");

    const maxSize = 20 * 1024 * 1024;

    if (file.size > maxSize) {
      setError(
        "Dosya boyutu 20 MB'dan büyük olamaz."
      );
      setUploading(false);
      return;
    }

    const isImage =
      file.type.startsWith("image/");

    const actualType = isImage
      ? "photo"
      : evidenceType;

    const selectedActionId =
      evidenceActionId
        ? Number(evidenceActionId)
        : null;

    const safeFileName = file.name
      .replace(
        /[^\w.\-ğüşöçıİĞÜŞÖÇ ]/gi,
        "_"
      )
      .replace(/\s+/g, "_");

    const uniqueName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)}-${safeFileName}`;

    const folder = selectedActionId
      ? `aksiyon-${selectedActionId}`
      : "genel";

    const filePath = `${item.nonconformity_no}/${folder}/${uniqueName}`;

    const { error: uploadError } =
      await supabase.storage
        .from("uygunsuzluk-aksiyon-belgeleri")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType:
            file.type || undefined,
        });

    if (uploadError) {
      setError(
        `Dosya yüklenemedi: ${uploadError.message}`
      );
      setUploading(false);
      return;
    }

    const { data: publicUrlData } =
      supabase.storage
        .from("uygunsuzluk-aksiyon-belgeleri")
        .getPublicUrl(filePath);

    const fileUrl =
      publicUrlData.publicUrl;

    if (actualType === "photo") {
      const { data: photoData, error: photoError } =
        await supabase
          .from("nonconformity_photos")
          .insert({
            nonconformity_id: item.id,
            action_id: selectedActionId,
            photo_name: file.name,
            file_path: filePath,
            file_url: fileUrl,
            photo_category:
              photoCategory,
            uploaded_by:
              "Kalite Kullanıcısı",
          })
          .select()
          .single();

      if (photoError) {
        await supabase.storage
          .from(
            "uygunsuzluk-aksiyon-belgeleri"
          )
          .remove([filePath]);

        setError(
          `Fotoğraf kaydı oluşturulamadı: ${photoError.message}`
        );
        setUploading(false);
        return;
      }

      setPhotos((current) => [
        photoData as NonconformityPhoto,
        ...current,
      ]);

      const action = actions.find(
        (currentAction) =>
          currentAction.id ===
          selectedActionId
      );

      await addHistory(
        "Fotoğraf Eklendi",
        action
          ? `Aksiyon #${action.action_no} için "${file.name}" fotoğrafı eklendi.`
          : `"${file.name}" uygunsuzluk fotoğrafı olarak eklendi.`,
        null,
        file.name
      );

      setMessage(
        `"${file.name}" başarıyla yüklendi.`
      );
    } else {
      const { data: documentData, error: documentError } =
        await supabase
          .from("nonconformity_documents")
          .insert({
            nonconformity_id: item.id,
            action_id: selectedActionId,
            document_name: file.name,
            file_path: filePath,
            file_url: fileUrl,
            document_type:
              file.type || null,
            document_category:
              documentCategory,
            uploaded_by:
              "Kalite Kullanıcısı",
          })
          .select()
          .single();

      if (documentError) {
        await supabase.storage
          .from(
            "uygunsuzluk-aksiyon-belgeleri"
          )
          .remove([filePath]);

        setError(
          `Doküman kaydı oluşturulamadı: ${documentError.message}`
        );
        setUploading(false);
        return;
      }

      setDocuments((current) => [
        documentData as NonconformityDocument,
        ...current,
      ]);

      const action = actions.find(
        (currentAction) =>
          currentAction.id ===
          selectedActionId
      );

      await addHistory(
        "Doküman Eklendi",
        action
          ? `Aksiyon #${action.action_no} için "${file.name}" dokümanı eklendi.`
          : `"${file.name}" uygunsuzluk dokümanı olarak eklendi.`,
        null,
        file.name
      );

      setMessage(
        `"${file.name}" başarıyla yüklendi.`
      );
    }

    closeEvidenceForm();
    setUploading(false);
  }

  async function deleteDocument(
    document: NonconformityDocument
  ) {
    if (!item) return;

    const confirmed = window.confirm(
      `"${document.document_name}" dosyası silinecek. Emin misiniz?`
    );

    if (!confirmed) return;

    const deleteKey = `document-${document.id}`;

    setDeletingFileId(deleteKey);
    setMessage("");
    setError("");

    const { error: storageError } =
      await supabase.storage
        .from(
          "uygunsuzluk-aksiyon-belgeleri"
        )
        .remove([document.file_path]);

    if (storageError) {
      console.error(
        "Storage dosyası silinemedi:",
        storageError.message
      );
    }

    const { error: deleteError } =
      await supabase
        .from("nonconformity_documents")
        .delete()
        .eq("id", document.id);

    if (deleteError) {
      setError(
        `Doküman silinemedi: ${deleteError.message}`
      );
      setDeletingFileId(null);
      return;
    }

    const action = actions.find(
      (currentAction) =>
        currentAction.id ===
        document.action_id
    );

    await addHistory(
      "Doküman Silindi",
      action
        ? `Aksiyon #${action.action_no} için "${document.document_name}" dokümanı silindi.`
        : `"${document.document_name}" dokümanı silindi.`,
      document.document_name,
      null
    );

    setDocuments((current) =>
      current.filter(
        (currentDocument) =>
          currentDocument.id !== document.id
      )
    );

    setMessage(
      `"${document.document_name}" silindi.`
    );

    setDeletingFileId(null);
  }

  async function deletePhoto(
    photo: NonconformityPhoto
  ) {
    if (!item) return;

    const confirmed = window.confirm(
      `"${photo.photo_name}" fotoğrafı silinecek. Emin misiniz?`
    );

    if (!confirmed) return;

    const deleteKey = `photo-${photo.id}`;

    setDeletingFileId(deleteKey);
    setMessage("");
    setError("");

    const { error: storageError } =
      await supabase.storage
        .from(
          "uygunsuzluk-aksiyon-belgeleri"
        )
        .remove([photo.file_path]);

    if (storageError) {
      console.error(
        "Storage fotoğrafı silinemedi:",
        storageError.message
      );
    }

    const { error: deleteError } =
      await supabase
        .from("nonconformity_photos")
        .delete()
        .eq("id", photo.id);

    if (deleteError) {
      setError(
        `Fotoğraf silinemedi: ${deleteError.message}`
      );
      setDeletingFileId(null);
      return;
    }

    const action = actions.find(
      (currentAction) =>
        currentAction.id ===
        photo.action_id
    );

    await addHistory(
      "Fotoğraf Silindi",
      action
        ? `Aksiyon #${action.action_no} için "${photo.photo_name}" fotoğrafı silindi.`
        : `"${photo.photo_name}" fotoğrafı silindi.`,
      photo.photo_name,
      null
    );

    setPhotos((current) =>
      current.filter(
        (currentPhoto) =>
          currentPhoto.id !== photo.id
      )
    );

    setMessage(
      `"${photo.photo_name}" silindi.`
    );

    setDeletingFileId(null);
  }

  const overdue = useMemo(() => {
    if (!item) return false;

    return isOverdue(item);
  }, [item]);

  const actionStats = useMemo(() => {
    const total = actions.length;

    const completed = actions.filter(
      (action) =>
        action.status === "Tamamlandı"
    ).length;

    const open = actions.filter(
      (action) =>
        action.status !== "Tamamlandı" &&
        action.status !== "İptal"
    ).length;

    const overdueCount = actions.filter(
      (action) =>
        isActionOverdue(action)
    ).length;

    return {
      total,
      completed,
      open,
      overdue: overdueCount,
    };
  }, [actions]);

  const totalEvidence =
    documents.length + photos.length;

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />

            <p className="mt-3 text-sm text-slate-500">
              Uygunsuzluk yükleniyor...
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!item) {
    return (
      <AppShell>
        <div className="box-border w-full min-w-0 px-8 py-6">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-center gap-3 text-red-700">
              <AlertTriangle className="h-5 w-5" />

              <p className="font-semibold">
                {error ||
                  "Uygunsuzluk bulunamadı."}
              </p>
            </div>

            <Link
              href="/uygunsuzluklar"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Uygunsuzluklara Dön
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="box-border w-full min-w-0 max-w-full overflow-x-hidden px-8 py-6">
        <div className="w-full min-w-0 max-w-full space-y-5">

          {/* HEADER */}
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <Link
                href="/uygunsuzluklar"
                className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-blue-600"
              >
                <ArrowLeft className="h-4 w-4" />
                Uygunsuzluklara Dön
              </Link>

              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <ShieldAlert className="h-6 w-6" />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                      {item.nonconformity_no}
                    </h1>

                    <span
                      className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${getStatusClasses(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>

                    <span
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold ${getPriorityClasses(
                        item.priority
                      )}`}
                    >
                      {item.priority}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    {item.subject}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Durum Güncelle
              </label>

              <select
                value={item.status}
                disabled={savingStatus}
                onChange={(event) =>
                  updateStatus(
                    event.target.value
                  )
                }
                className="h-10 min-w-[190px] rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                {statusOptions.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {message && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {message}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {/* KPI */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Uygunsuzluk Tarihi
                  </p>

                  <p className="mt-2 text-lg font-bold text-slate-900">
                    {formatDate(
                      item.nonconformity_date
                    )}
                  </p>
                </div>

                <CalendarDays className="h-5 w-5 text-blue-500" />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Kaynak
                  </p>

                  <p className="mt-2 text-lg font-bold text-slate-900">
                    {item.source}
                  </p>
                </div>

                <FileText className="h-5 w-5 text-slate-400" />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Hedef Tarih
                  </p>

                  <p
                    className={`mt-2 text-lg font-bold ${
                      overdue
                        ? "text-red-600"
                        : "text-slate-900"
                    }`}
                  >
                    {formatDate(
                      item.target_date
                    )}
                  </p>
                </div>

                {overdue ? (
                  <XCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <Clock3 className="h-5 w-5 text-slate-400" />
                )}
              </div>

              {overdue && (
                <p className="mt-2 text-xs font-bold text-red-600">
                  Termin tarihi geçti
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Sorumlu
                  </p>

                  <p className="mt-2 text-lg font-bold text-slate-900">
                    {item.responsible ||
                      "-"}
                  </p>
                </div>

                <UserRound className="h-5 w-5 text-slate-400" />
              </div>
            </div>
          </div>

          {/* GENEL BİLGİLER */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-base font-bold text-slate-900">
                  Genel Bilgiler
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Müşteri
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {item.customer ||
                      "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Proje Kodu
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {item.project_code ||
                      "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Ürün / Proses
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {item.product_process ||
                      "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Kapanış Tarihi
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {formatDate(
                      item.closed_date
                    )}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Uygunsuzluk Konusu
                  </p>

                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">
                    {item.subject}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Açıklama
                  </p>

                  <div className="mt-2 rounded-xl bg-slate-50 p-4">
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {item.description ||
                        "Açıklama girilmemiş."}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-base font-bold text-slate-900">
                  Durum Akışı
                </h2>
              </div>

              <div className="space-y-4 p-6">
                {statusOptions.map(
                  (status, index) => {
                    const currentIndex =
                      statusOptions.indexOf(
                        item.status
                      );

                    const active =
                      index <= currentIndex;

                    return (
                      <div
                        key={status}
                        className="flex items-start gap-3"
                      >
                        <div
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                            active
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {active ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <span className="text-xs font-bold">
                              {index + 1}
                            </span>
                          )}
                        </div>

                        <div>
                          <p
                            className={`text-sm font-semibold ${
                              active
                                ? "text-slate-900"
                                : "text-slate-400"
                            }`}
                          >
                            {status}
                          </p>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </section>
          </div>

          {/* KANIT / DOSYA YÖNETİMİ */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Paperclip className="h-5 w-5 text-blue-600" />

                  <h2 className="text-base font-bold text-slate-900">
                    Fotoğraf ve Kanıtlar
                  </h2>

                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                    {totalEvidence}
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Uygunsuzluğa ve aksiyonlara ait fotoğraf, rapor ve kanıt dosyalarını yönetin.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  openEvidenceForm("document")
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <Upload className="h-4 w-4" />
                Dosya / Fotoğraf Ekle
              </button>
            </div>

            {showEvidenceForm && (
              <div className="border-b border-blue-100 bg-blue-50/40 p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Yeni Kanıt Ekle
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Dosyayı uygunsuzluğa veya belirli bir aksiyona bağlayabilirsiniz.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      closeEvidenceForm
                    }
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-600">
                      Kanıt Türü
                    </label>

                    <select
                      value={evidenceType}
                      onChange={(event) =>
                        setEvidenceType(
                          event.target
                            .value as
                            | "document"
                            | "photo"
                        )
                      }
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="document">
                        Doküman
                      </option>
                      <option value="photo">
                        Fotoğraf
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-600">
                      Bağlı Aksiyon
                    </label>

                    <select
                      value={
                        evidenceActionId
                      }
                      onChange={(event) =>
                        setEvidenceActionId(
                          event.target.value
                        )
                      }
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">
                        Genel Uygunsuzluk
                      </option>

                      {actions.map(
                        (action) => (
                          <option
                            key={action.id}
                            value={action.id}
                          >
                            #{action.action_no} -{" "}
                            {action.action_description.substring(
                              0,
                              55
                            )}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {evidenceType ===
                  "document" ? (
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600">
                        Doküman Kategorisi
                      </label>

                      <select
                        value={
                          documentCategory
                        }
                        onChange={(event) =>
                          setDocumentCategory(
                            event.target
                              .value
                          )
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      >
                        {documentCategoryOptions.map(
                          (category) => (
                            <option
                              key={category}
                              value={category}
                            >
                              {category}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600">
                        Fotoğraf Kategorisi
                      </label>

                      <select
                        value={
                          photoCategory
                        }
                        onChange={(event) =>
                          setPhotoCategory(
                            event.target
                              .value
                          )
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      >
                        {photoCategoryOptions.map(
                          (category) => (
                            <option
                              key={category}
                              value={category}
                            >
                              {category}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  )}

                  <div className="flex items-end">
                    <label className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700">
                      <Upload className="h-4 w-4" />

                      {uploading
                        ? "Yükleniyor..."
                        : "Dosya Seç"}

                      <input
                        type="file"
                        className="hidden"
                        disabled={uploading}
                        accept={
                          evidenceType ===
                          "photo"
                            ? "image/*"
                            : undefined
                        }
                        onChange={(
                          event
                        ) => {
                          const file =
                            event.target
                              .files?.[0];

                          if (file) {
                            uploadEvidence(
                              file
                            );
                          }

                          event.target.value =
                            "";
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* FOTOĞRAFLAR */}
            <div className="border-b border-slate-200 p-6">
              <div className="mb-4 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-slate-500" />

                <h3 className="text-sm font-bold text-slate-800">
                  Fotoğraflar
                </h3>

                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                  {photos.length}
                </span>
              </div>

              {photos.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-5 py-8 text-center">
                  <ImageIcon className="mx-auto h-7 w-7 text-slate-300" />

                  <p className="mt-2 text-xs text-slate-400">
                    Henüz fotoğraf eklenmemiş.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {photos.map((photo) => {
                    const action =
                      actions.find(
                        (currentAction) =>
                          currentAction.id ===
                          photo.action_id
                      );

                    return (
                      <div
                        key={photo.id}
                        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                      >
                        <a
                          href={
                            photo.file_url
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={
                              photo.file_url
                            }
                            alt={
                              photo.photo_name
                            }
                            className="h-44 w-full object-cover transition hover:scale-[1.02]"
                          />
                        </a>

                        <div className="p-3">
                          <p
                            className="truncate text-xs font-bold text-slate-700"
                            title={
                              photo.photo_name
                            }
                          >
                            {photo.photo_name}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
                              {
                                photo.photo_category
                              }
                            </span>

                            {action && (
                              <span className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">
                                Aksiyon #
                                {
                                  action.action_no
                                }
                              </span>
                            )}
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400">
                              {formatDateTime(
                                photo.uploaded_at
                              )}
                            </span>

                            <button
                              type="button"
                              disabled={
                                deletingFileId ===
                                `photo-${photo.id}`
                              }
                              onClick={() =>
                                deletePhoto(
                                  photo
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              <Trash2 className="h-3 w-3" />

                              {deletingFileId ===
                              `photo-${photo.id}`
                                ? "Siliniyor"
                                : "Sil"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* DOKÜMANLAR */}
            <div className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />

                <h3 className="text-sm font-bold text-slate-800">
                  Dokümanlar
                </h3>

                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                  {documents.length}
                </span>
              </div>

              {documents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-5 py-8 text-center">
                  <File className="mx-auto h-7 w-7 text-slate-300" />

                  <p className="mt-2 text-xs text-slate-400">
                    Henüz doküman eklenmemiş.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {documents.map(
                    (document) => {
                      const action =
                        actions.find(
                          (
                            currentAction
                          ) =>
                            currentAction.id ===
                            document.action_id
                        );

                      return (
                        <div
                          key={
                            document.id
                          }
                          className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                              <FileText className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                              <p
                                className="truncate text-sm font-semibold text-slate-700"
                                title={
                                  document.document_name
                                }
                              >
                                {
                                  document.document_name
                                }
                              </p>

                              <div className="mt-1 flex flex-wrap gap-1.5">
                                <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
                                  {
                                    document.document_category
                                  }
                                </span>

                                {action && (
                                  <span className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">
                                    Aksiyon #
                                    {
                                      action.action_no
                                    }
                                  </span>
                                )}
                              </div>

                              <p className="mt-1 text-[10px] text-slate-400">
                                {formatDateTime(
                                  document.uploaded_at
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <a
                              href={
                                document.file_url
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Aç
                            </a>

                            <button
                              type="button"
                              disabled={
                                deletingFileId ===
                                `document-${document.id}`
                              }
                              onClick={() =>
                                deleteDocument(
                                  document
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />

                              {deletingFileId ===
                              `document-${document.id}`
                                ? "Siliniyor..."
                                : "Sil"}
                            </button>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </section>

          {/* AKSİYONLAR */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-blue-600" />

                  <h2 className="text-base font-bold text-slate-900">
                    Düzeltici / Önleyici Aksiyonlar
                  </h2>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Uygunsuzluğun giderilmesi için tanımlanan aksiyonlar.
                </p>
              </div>

              <button
                type="button"
                onClick={openNewActionForm}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Yeni Aksiyon
              </button>
            </div>

            <div className="grid grid-cols-2 border-b border-slate-200 lg:grid-cols-4">
              <div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Toplam
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {actionStats.total}
                </p>
              </div>

              <div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Açık
                </p>

                <p className="mt-2 text-2xl font-bold text-amber-600">
                  {actionStats.open}
                </p>
              </div>

              <div className="border-r border-slate-200 p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Tamamlanan
                </p>

                <p className="mt-2 text-2xl font-bold text-emerald-600">
                  {actionStats.completed}
                </p>
              </div>

              <div className="p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Geciken
                </p>

                <p className="mt-2 text-2xl font-bold text-red-600">
                  {actionStats.overdue}
                </p>
              </div>
            </div>

            {showActionForm && (
              <div className="border-b border-blue-100 bg-blue-50/40 p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {editingActionId
                        ? "Aksiyonu Düzenle"
                        : "Yeni Aksiyon"}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Aksiyon bilgilerini eksiksiz giriniz.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      closeActionForm
                    }
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-600">
                      Aksiyon No
                    </label>

                    <input
                      type="number"
                      min="1"
                      value={
                        actionForm.action_no
                      }
                      onChange={(event) =>
                        setActionForm({
                          ...actionForm,
                          action_no:
                            Number(
                              event.target.value
                            ) || 1,
                        })
                      }
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-600">
                      Aksiyon Türü
                    </label>

                    <select
                      value={
                        actionForm.action_type
                      }
                      onChange={(event) =>
                        setActionForm({
                          ...actionForm,
                          action_type:
                            event.target.value,
                        })
                      }
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    >
                      {actionTypeOptions.map(
                        (type) => (
                          <option
                            key={type}
                            value={type}
                          >
                            {type}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-600">
                      Sorumlu
                    </label>

                    <input
                      type="text"
                      value={
                        actionForm.responsible
                      }
                      onChange={(event) =>
                        setActionForm({
                          ...actionForm,
                          responsible:
                            event.target.value,
                        })
                      }
                      placeholder="Sorumlu kişi"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-600">
                      Durum
                    </label>

                    <select
                      value={
                        actionForm.status
                      }
                      onChange={(event) =>
                        setActionForm({
                          ...actionForm,
                          status:
                            event.target.value,
                        })
                      }
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    >
                      {actionStatusOptions.map(
                        (status) => (
                          <option
                            key={status}
                            value={status}
                          >
                            {status}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="md:col-span-2 xl:col-span-4">
                    <label className="mb-1.5 block text-xs font-bold text-slate-600">
                      Aksiyon Açıklaması *
                    </label>

                    <textarea
                      value={
                        actionForm.action_description
                      }
                      onChange={(event) =>
                        setActionForm({
                          ...actionForm,
                          action_description:
                            event.target.value,
                        })
                      }
                      rows={3}
                      placeholder="Yapılacak aksiyonu açık ve ölçülebilir şekilde yazınız."
                      className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-600">
                      Hedef Tarih
                    </label>

                    <input
                      type="date"
                      value={
                        actionForm.target_date
                      }
                      onChange={(event) =>
                        setActionForm({
                          ...actionForm,
                          target_date:
                            event.target.value,
                        })
                      }
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-600">
                      Tamamlanma Tarihi
                    </label>

                    <input
                      type="date"
                      value={
                        actionForm.completion_date
                      }
                      onChange={(event) =>
                        setActionForm({
                          ...actionForm,
                          completion_date:
                            event.target.value,
                        })
                      }
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-xs font-bold text-slate-600">
                      Etkinlik Kontrolü
                    </label>

                    <textarea
                      value={
                        actionForm.effectiveness_check
                      }
                      onChange={(event) =>
                        setActionForm({
                          ...actionForm,
                          effectiveness_check:
                            event.target.value,
                        })
                      }
                      rows={2}
                      placeholder="Aksiyonun etkinliğinin nasıl kontrol edileceği..."
                      className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div className="md:col-span-2 xl:col-span-4">
                    <label className="mb-1.5 block text-xs font-bold text-slate-600">
                      Etkinlik Sonucu
                    </label>

                    <textarea
                      value={
                        actionForm.effectiveness_result
                      }
                      onChange={(event) =>
                        setActionForm({
                          ...actionForm,
                          effectiveness_result:
                            event.target.value,
                        })
                      }
                      rows={2}
                      placeholder="Kontrol sonucunu ve aksiyonun etkili olup olmadığını yazınız..."
                      className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={
                      closeActionForm
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <X className="h-4 w-4" />
                    Vazgeç
                  </button>

                  <button
                    type="button"
                    onClick={saveAction}
                    disabled={
                      savingAction
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />

                    {savingAction
                      ? "Kaydediliyor..."
                      : editingActionId
                      ? "Değişiklikleri Kaydet"
                      : "Aksiyonu Kaydet"}
                  </button>
                </div>
              </div>
            )}

            {actions.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <ClipboardList className="mx-auto h-9 w-9 text-slate-300" />

                <p className="mt-3 text-sm font-semibold text-slate-600">
                  Henüz aksiyon tanımlanmamış.
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Uygunsuzluğun giderilmesi için ilk aksiyonu ekleyebilirsiniz.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {actions.map((action) => {
                  const actionOverdue =
                    isActionOverdue(
                      action
                    );

                  const actionDocuments =
                    documents.filter(
                      (document) =>
                        document.action_id ===
                        action.id
                    );

                  const actionPhotos =
                    photos.filter(
                      (photo) =>
                        photo.action_id ===
                        action.id
                    );

                  return (
                    <div
                      key={action.id}
                      className="p-6 transition hover:bg-slate-50/50"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="flex min-w-0 flex-1 gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">
                            #{action.action_no}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                {action.action_type}
                              </span>

                              <span
                                className={`rounded-lg border px-2 py-1 text-xs font-bold ${getActionStatusClasses(
                                  action.status
                                )}`}
                              >
                                {action.status}
                              </span>

                              {actionOverdue && (
                                <span className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-600">
                                  Termin Gecikti
                                </span>
                              )}
                            </div>

                            <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-800">
                              {
                                action.action_description
                              }
                            </p>

                            <div className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                              <div>
                                <span className="font-bold text-slate-400">
                                  Sorumlu
                                </span>

                                <p className="mt-1 font-semibold text-slate-700">
                                  {action.responsible ||
                                    "-"}
                                </p>
                              </div>

                              <div>
                                <span className="font-bold text-slate-400">
                                  Hedef
                                </span>

                                <p
                                  className={`mt-1 font-semibold ${
                                    actionOverdue
                                      ? "text-red-600"
                                      : "text-slate-700"
                                  }`}
                                >
                                  {formatDate(
                                    action.target_date
                                  )}
                                </p>
                              </div>

                              <div>
                                <span className="font-bold text-slate-400">
                                  Tamamlanma
                                </span>

                                <p className="mt-1 font-semibold text-slate-700">
                                  {formatDate(
                                    action.completion_date
                                  )}
                                </p>
                              </div>

                              <div>
                                <span className="font-bold text-slate-400">
                                  Güncelleme
                                </span>

                                <p className="mt-1 font-semibold text-slate-700">
                                  {formatDateTime(
                                    action.updated_at
                                  )}
                                </p>
                              </div>
                            </div>

                            {(action.effectiveness_check ||
                              action.effectiveness_result) && (
                              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                                {action.effectiveness_check && (
                                  <div className="rounded-xl bg-slate-50 p-3">
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                      Etkinlik Kontrolü
                                    </p>

                                    <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">
                                      {
                                        action.effectiveness_check
                                      }
                                    </p>
                                  </div>
                                )}

                                {action.effectiveness_result && (
                                  <div className="rounded-xl bg-emerald-50 p-3">
                                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
                                      Etkinlik Sonucu
                                    </p>

                                    <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-emerald-700">
                                      {
                                        action.effectiveness_result
                                      }
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* AKSİYON KANITLARI */}
                            <div className="mt-5 rounded-xl border border-slate-200 bg-white">
                              <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-2">
                                  <Paperclip className="h-4 w-4 text-blue-600" />

                                  <div>
                                    <p className="text-xs font-bold text-slate-700">
                                      Aksiyon Kanıtları
                                    </p>

                                    <p className="text-[11px] text-slate-400">
                                      Bu aksiyona bağlı fotoğraf ve dokümanlar.
                                    </p>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    openEvidenceForm(
                                      "document",
                                      action.id
                                    )
                                  }
                                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                                >
                                  <Upload className="h-4 w-4" />
                                  Kanıt Ekle
                                </button>
                              </div>

                              {actionDocuments.length ===
                                0 &&
                              actionPhotos.length ===
                                0 ? (
                                <div className="px-4 py-5 text-center">
                                  <File className="mx-auto h-6 w-6 text-slate-300" />

                                  <p className="mt-2 text-xs text-slate-400">
                                    Bu aksiyona henüz kanıt dosyası eklenmemiş.
                                  </p>
                                </div>
                              ) : (
                                <div className="divide-y divide-slate-100">
                                  {actionDocuments.map(
                                    (
                                      document
                                    ) => (
                                      <div
                                        key={`action-document-${document.id}`}
                                        className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                                      >
                                        <div className="flex min-w-0 items-center gap-3">
                                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                            <FileText className="h-4 w-4" />
                                          </div>

                                          <div className="min-w-0">
                                            <p className="truncate text-xs font-semibold text-slate-700">
                                              {
                                                document.document_name
                                              }
                                            </p>

                                            <p className="mt-0.5 text-[11px] text-slate-400">
                                              {
                                                document.document_category
                                              }{" "}
                                              •{" "}
                                              {formatDateTime(
                                                document.uploaded_at
                                              )}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-2">
                                          <a
                                            href={
                                              document.file_url
                                            }
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50"
                                          >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            Aç
                                          </a>

                                          <button
                                            type="button"
                                            onClick={() =>
                                              deleteDocument(
                                                document
                                              )
                                            }
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-[11px] font-bold text-red-600 transition hover:bg-red-50"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            Sil
                                          </button>
                                        </div>
                                      </div>
                                    )
                                  )}

                                  {actionPhotos.map(
                                    (photo) => (
                                      <div
                                        key={`action-photo-${photo.id}`}
                                        className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                                      >
                                        <div className="flex min-w-0 items-center gap-3">
                                          <img
                                            src={
                                              photo.file_url
                                            }
                                            alt={
                                              photo.photo_name
                                            }
                                            className="h-12 w-12 shrink-0 rounded-lg object-cover"
                                          />

                                          <div className="min-w-0">
                                            <p className="truncate text-xs font-semibold text-slate-700">
                                              {
                                                photo.photo_name
                                              }
                                            </p>

                                            <p className="mt-0.5 text-[11px] text-slate-400">
                                              {
                                                photo.photo_category
                                              }{" "}
                                              •{" "}
                                              {formatDateTime(
                                                photo.uploaded_at
                                              )}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-2">
                                          <a
                                            href={
                                              photo.file_url
                                            }
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50"
                                          >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            Aç
                                          </a>

                                          <button
                                            type="button"
                                            onClick={() =>
                                              deletePhoto(
                                                photo
                                              )
                                            }
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-[11px] font-bold text-red-600 transition hover:bg-red-50"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            Sil
                                          </button>
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {action.status !==
                            "Tamamlandı" &&
                            action.status !==
                              "İptal" && (
                              <button
                                type="button"
                                onClick={() =>
                                  completeAction(
                                    action
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                Tamamla
                              </button>
                            )}

                          <button
                            type="button"
                            onClick={() =>
                              openEditActionForm(
                                action
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
                          >
                            <Pencil className="h-4 w-4" />
                            Düzenle
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteAction(
                                action
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            Sil
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* KÖK NEDEN */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-base font-bold text-slate-900">
                Kök Neden Analizi
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Kök neden çalışması ve analiz bilgileri burada tutulacak.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Analiz Yöntemi
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-800">
                  {item.analysis_method ||
                    "Henüz belirlenmedi"}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Kök Neden Kategorisi
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-800">
                  {item.root_cause_category ||
                    "Henüz belirlenmedi"}
                </p>
              </div>

              <div className="md:col-span-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Kök Neden
                </p>

                <div className="mt-2 rounded-xl bg-slate-50 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {item.root_cause ||
                      "Henüz kök neden tanımlanmadı."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ETKİNLİK */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-base font-bold text-slate-900">
                Etkinlik Kontrolü
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Kontrol
                </p>

                <div className="mt-2 rounded-xl bg-slate-50 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {item.effectiveness_check ||
                      "Henüz etkinlik kontrolü yapılmadı."}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Sonuç
                </p>

                <div className="mt-2 rounded-xl bg-slate-50 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {item.effectiveness_result ||
                      "Henüz etkinlik sonucu girilmedi."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* GEÇMİŞ */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-slate-500" />

                  <h2 className="text-base font-bold text-slate-900">
                    İşlem Geçmişi
                  </h2>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Uygunsuzluk üzerinde yapılan işlemler.
                </p>
              </div>

              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                {history.length} kayıt
              </span>
            </div>

            {history.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <History className="mx-auto h-7 w-7 text-slate-300" />

                <p className="mt-2 text-sm text-slate-500">
                  Henüz işlem geçmişi bulunmuyor.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {history.map(
                  (historyItem) => (
                    <div
                      key={historyItem.id}
                      className="flex gap-4 px-6 py-5"
                    >
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                        <History className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-bold text-slate-800">
                            {
                              historyItem.action_type
                            }
                          </p>

                          <span className="text-xs text-slate-400">
                            {formatDateTime(
                              historyItem.created_at
                            )}
                          </span>
                        </div>

                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {
                            historyItem.description
                          }
                        </p>

                        {(historyItem.old_value ||
                          historyItem.new_value) && (
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            {historyItem.old_value && (
                              <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">
                                {
                                  historyItem.old_value
                                }
                              </span>
                            )}

                            {historyItem.old_value &&
                              historyItem.new_value && (
                                <span className="text-slate-400">
                                  →
                                </span>
                              )}

                            {historyItem.new_value && (
                              <span className="rounded-md bg-blue-50 px-2 py-1 font-semibold text-blue-700">
                                {
                                  historyItem.new_value
                                }
                              </span>
                            )}
                          </div>
                        )}

                        {historyItem.user_name && (
                          <p className="mt-2 text-xs text-slate-400">
                            İşlemi yapan:{" "}
                            {
                              historyItem.user_name
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          {/* ALT BİLGİ */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-slate-400">
                Son güncelleme
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-700">
                {formatDateTime(
                  item.updated_at
                )}
              </p>
            </div>

            <Link
              href="/uygunsuzluklar"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Listeye Dön
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}