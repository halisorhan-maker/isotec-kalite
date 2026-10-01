"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Edit3,
  Plus,
  Save,
  Target,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";
import AppShell from "@/app/components/AppShell";
import { supabase } from "@/app/lib/supabase";

type Complaint = {
  id: number;
  complaint_no: string;
  customer: string;
  subject: string;
};

type Action = {
  id: number;
  complaint_id: number;
  complaint_8d_id: number | null;
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

type ActionForm = {
  action_type: string;
  action_description: string;
  responsible: string;
  target_date: string;
  completion_date: string;
  status: string;
  effectiveness_check: string;
  effectiveness_result: string;
};

const emptyForm: ActionForm = {
  action_type: "Düzeltici Faaliyet",
  action_description: "",
  responsible: "",
  target_date: "",
  completion_date: "",
  status: "Açık",
  effectiveness_check: "",
  effectiveness_result: "",
};

const statusOptions = [
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
];

function formatDate(value: string | null) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("tr-TR");
}

function isOverdue(action: Action) {
  if (!action.target_date) return false;
  if (action.status === "Tamamlandı" || action.status === "İptal") {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(`${action.target_date}T00:00:00`);

  return target < today;
}

function statusClasses(status: string) {
  switch (status) {
    case "Tamamlandı":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "Devam Ediyor":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "İptal":
      return "bg-slate-100 text-slate-500 border-slate-200";

    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

function inputClass() {
  return "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
}

export default function AksiyonlarPage() {
  const params = useParams();
  const router = useRouter();

  const complaintNo = Array.isArray(params.id)
    ? params.id[0]
    : (params.id as string);

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [actions, setActions] = useState<Action[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingAction, setEditingAction] = useState<Action | null>(null);

  const [form, setForm] = useState<ActionForm>(emptyForm);

  async function loadData() {
    if (!complaintNo) return;

    setLoading(true);
    setError("");

    const { data: complaintData, error: complaintError } =
      await supabase
        .from("complaints")
        .select("id, complaint_no, customer, subject")
        .eq("complaint_no", complaintNo)
        .limit(1);

    if (complaintError) {
      setError(`Şikayet yüklenemedi: ${complaintError.message}`);
      setLoading(false);
      return;
    }

    if (!complaintData || complaintData.length === 0) {
      setError("Şikayet bulunamadı.");
      setLoading(false);
      return;
    }

    const currentComplaint = complaintData[0] as Complaint;
    setComplaint(currentComplaint);

    const { data: actionData, error: actionError } =
      await supabase
        .from("complaint_8d_actions")
        .select("*")
        .eq("complaint_id", currentComplaint.id)
        .order("action_no", { ascending: true });

    if (actionError) {
      setError(`Aksiyonlar yüklenemedi: ${actionError.message}`);
      setLoading(false);
      return;
    }

    setActions((actionData || []) as Action[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [complaintNo]);

  function openNewAction() {
    setEditingAction(null);

    setForm({
      ...emptyForm,
      action_type: "Düzeltici Faaliyet",
      status: "Açık",
    });

    setMessage("");
    setError("");
    setShowForm(true);
  }

  function openEditAction(action: Action) {
    setEditingAction(action);

    setForm({
      action_type: action.action_type || "Düzeltici Faaliyet",
      action_description: action.action_description || "",
      responsible: action.responsible || "",
      target_date: action.target_date || "",
      completion_date: action.completion_date || "",
      status: action.status || "Açık",
      effectiveness_check: action.effectiveness_check || "",
      effectiveness_result: action.effectiveness_result || "",
    });

    setMessage("");
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingAction(null);
    setForm(emptyForm);
  }

  async function saveAction() {
    if (!complaint) return;

    setMessage("");
    setError("");

    if (!form.action_description.trim()) {
      setError("Faaliyet / yapılacak iş alanı zorunludur.");
      return;
    }

    setSaving(true);

    if (editingAction) {
      const updatedAt = new Date().toISOString();

      const { data, error: updateError } = await supabase
        .from("complaint_8d_actions")
        .update({
          action_type: form.action_type,
          action_description: form.action_description.trim(),
          responsible: form.responsible.trim() || null,
          target_date: form.target_date || null,
          completion_date: form.completion_date || null,
          status: form.status,
          effectiveness_check:
            form.effectiveness_check.trim() || null,
          effectiveness_result:
            form.effectiveness_result.trim() || null,
          updated_at: updatedAt,
        })
        .eq("id", editingAction.id)
        .select()
        .single();

      if (updateError) {
        setError(`Aksiyon güncellenemedi: ${updateError.message}`);
        setSaving(false);
        return;
      }

      setActions((prev) =>
        prev.map((item) =>
          item.id === editingAction.id ? (data as Action) : item
        )
      );

      setMessage("Aksiyon başarıyla güncellendi.");
    } else {
      const nextActionNo =
        actions.length > 0
          ? Math.max(...actions.map((item) => item.action_no)) + 1
          : 1;

      const { data, error: insertError } = await supabase
        .from("complaint_8d_actions")
        .insert({
          complaint_id: complaint.id,
          action_no: nextActionNo,
          action_type: form.action_type,
          action_description: form.action_description.trim(),
          responsible: form.responsible.trim() || null,
          target_date: form.target_date || null,
          completion_date: form.completion_date || null,
          status: form.status,
          effectiveness_check:
            form.effectiveness_check.trim() || null,
          effectiveness_result:
            form.effectiveness_result.trim() || null,
        })
        .select()
        .single();

      if (insertError) {
        setError(`Aksiyon oluşturulamadı: ${insertError.message}`);
        setSaving(false);
        return;
      }

      setActions((prev) => [...prev, data as Action]);
      setMessage("Yeni aksiyon başarıyla oluşturuldu.");
    }

    setSaving(false);
    setShowForm(false);
    setEditingAction(null);
    setForm(emptyForm);
  }

  async function deleteAction(action: Action) {
    const confirmed = window.confirm(
      `${action.action_no}. aksiyonu silmek istediğinize emin misiniz?`
    );

    if (!confirmed) return;

    setDeletingId(action.id);
    setMessage("");
    setError("");

    const { error: deleteError } = await supabase
      .from("complaint_8d_actions")
      .delete()
      .eq("id", action.id);

    if (deleteError) {
      setError(`Aksiyon silinemedi: ${deleteError.message}`);
      setDeletingId(null);
      return;
    }

    setActions((prev) => prev.filter((item) => item.id !== action.id));

    setMessage("Aksiyon silindi.");
    setDeletingId(null);
  }

  const statistics = useMemo(() => {
    const total = actions.length;

    const open = actions.filter(
      (item) => item.status === "Açık"
    ).length;

    const inProgress = actions.filter(
      (item) => item.status === "Devam Ediyor"
    ).length;

    const completed = actions.filter(
      (item) => item.status === "Tamamlandı"
    ).length;

    const overdue = actions.filter((item) => isOverdue(item)).length;

    return {
      total,
      open,
      inProgress,
      completed,
      overdue,
    };
  }, [actions]);

  const completionRate =
    statistics.total > 0
      ? Math.round(
          (statistics.completed / statistics.total) * 100
        )
      : 0;

  if (loading) {
    return (
      <AppShell>
        <div className="p-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
            <p className="mt-4 text-sm text-slate-500">
              Aksiyonlar yükleniyor...
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-[#f6f8fb] p-6 lg:p-8">
        <div className="mx-auto max-w-[1500px]">
          {/* HEADER */}
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <button
                onClick={() =>
                  router.push(
                    `/sikayetler/${encodeURIComponent(complaintNo)}`
                  )
                }
                className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-blue-600"
              >
                <ArrowLeft size={17} />
                Şikayet Detayına Dön
              </button>

              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-800">
                  Aksiyon Takibi
                </h1>

                {complaint && (
                  <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                    {complaint.complaint_no}
                  </span>
                )}
              </div>

              {complaint && (
                <p className="mt-1 text-sm text-slate-500">
                  {complaint.customer} · {complaint.subject}
                </p>
              )}
            </div>

            <button
              onClick={openNewAction}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus size={18} />
              Yeni Aksiyon
            </button>
          </div>

          {/* MESSAGES */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {/* KPI */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              title="Toplam Aksiyon"
              value={statistics.total}
              icon={<Target size={20} />}
              iconClass="bg-blue-50 text-blue-600"
            />

            <KpiCard
              title="Açık"
              value={statistics.open}
              icon={<Clock3 size={20} />}
              iconClass="bg-amber-50 text-amber-600"
            />

            <KpiCard
              title="Devam Ediyor"
              value={statistics.inProgress}
              icon={<Edit3 size={20} />}
              iconClass="bg-indigo-50 text-indigo-600"
            />

            <KpiCard
              title="Tamamlandı"
              value={statistics.completed}
              icon={<CheckCircle2 size={20} />}
              iconClass="bg-emerald-50 text-emerald-600"
            />

            <KpiCard
              title="Geciken"
              value={statistics.overdue}
              icon={<AlertTriangle size={20} />}
              iconClass="bg-red-50 text-red-600"
            />
          </div>

          {/* PROGRESS */}
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Aksiyon Tamamlama Oranı
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Tamamlanan aksiyonların toplam aksiyonlara oranı
                </p>
              </div>

              <span className="text-lg font-bold text-slate-800">
                %{completionRate}
              </span>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          {/* ACTION LIST */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  Faaliyetler
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Şikayete bağlı düzeltici ve önleyici faaliyetler
                </p>
              </div>

              <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                {actions.length} kayıt
              </span>
            </div>

            {actions.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Target size={26} />
                </div>

                <h3 className="mt-4 text-base font-semibold text-slate-700">
                  Henüz aksiyon bulunmuyor
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                  Bu şikayet için henüz herhangi bir düzeltici veya önleyici
                  faaliyet tanımlanmamış.
                </p>

                <button
                  onClick={openNewAction}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <Plus size={17} />
                  İlk Aksiyonu Oluştur
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        No
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Faaliyet
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Sorumlu
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Hedef Tarih
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Tamamlanma
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Durum
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                        İşlem
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {actions.map((action) => {
                      const overdue = isOverdue(action);

                      return (
                        <tr
                          key={action.id}
                          className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4 align-top">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-700">
                              {action.action_no}
                            </div>
                          </td>

                          <td className="max-w-[430px] px-5 py-4 align-top">
                            <div className="flex flex-col gap-1.5">
                              <span className="inline-flex w-fit rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600">
                                {action.action_type}
                              </span>

                              <p className="text-sm font-medium leading-6 text-slate-700">
                                {action.action_description}
                              </p>

                              {overdue && (
                                <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                                  <AlertTriangle size={13} />
                                  Hedef tarihi geçti
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4 align-top text-sm text-slate-600">
                            {action.responsible || "-"}
                          </td>

                          <td className="px-5 py-4 align-top text-sm text-slate-600">
                            {formatDate(action.target_date)}
                          </td>

                          <td className="px-5 py-4 align-top text-sm text-slate-600">
                            {formatDate(action.completion_date)}
                          </td>

                          <td className="px-5 py-4 align-top">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(
                                action.status
                              )}`}
                            >
                              {action.status}
                            </span>
                          </td>

                          <td className="px-5 py-4 align-top">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => openEditAction(action)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                              >
                                <Edit3 size={14} />
                                Düzenle
                              </button>

                              <button
                                onClick={() => deleteAction(action)}
                                disabled={deletingId === action.id}
                                className="inline-flex items-center justify-center rounded-lg border border-red-100 bg-white px-3 py-2 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Aksiyonu sil"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* MODAL */}
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    {editingAction
                      ? "Aksiyonu Düzenle"
                      : "Yeni Aksiyon Oluştur"}
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    Şikayet için yapılacak faaliyeti ve takip bilgilerini
                    tanımlayın.
                  </p>
                </div>

                <button
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5 p-6">
                {/* TYPE / STATUS */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Aksiyon Tipi">
                    <select
                      value={form.action_type}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          action_type: e.target.value,
                        })
                      }
                      className={inputClass()}
                    >
                      {actionTypeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Durum">
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          status: e.target.value,
                        })
                      }
                      className={inputClass()}
                    >
                      {statusOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                {/* DESCRIPTION */}
                <Field label="Faaliyet / Yapılacak İş" required>
                  <textarea
                    value={form.action_description}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        action_description: e.target.value,
                      })
                    }
                    rows={4}
                    placeholder="Yapılacak faaliyeti açık ve ölçülebilir şekilde yazın..."
                    className={`${inputClass()} resize-none`}
                  />
                </Field>

                {/* RESPONSIBLE / DATE */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Field label="Sorumlu">
                    <input
                      type="text"
                      value={form.responsible}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          responsible: e.target.value,
                        })
                      }
                      placeholder="Sorumlu kişi"
                      className={inputClass()}
                    />
                  </Field>

                  <Field label="Hedef Tarih">
                    <input
                      type="date"
                      value={form.target_date}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          target_date: e.target.value,
                        })
                      }
                      className={inputClass()}
                    />
                  </Field>

                  <Field label="Tamamlanma Tarihi">
                    <input
                      type="date"
                      value={form.completion_date}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          completion_date: e.target.value,
                        })
                      }
                      className={inputClass()}
                    />
                  </Field>
                </div>

                {/* EFFECTIVENESS */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-slate-700">
                      Etkinlik Kontrolü
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Faaliyetin gerçekten problemi ortadan kaldırıp
                      kaldırmadığını değerlendirin.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Field label="Etkinlik Kontrolü">
                      <textarea
                        value={form.effectiveness_check}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            effectiveness_check: e.target.value,
                          })
                        }
                        rows={3}
                        placeholder="Kontrol yöntemi, kontrol tarihi veya kontrol kriterini yazın..."
                        className={`${inputClass()} resize-none`}
                      />
                    </Field>

                    <Field label="Etkinlik Sonucu">
                      <textarea
                        value={form.effectiveness_result}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            effectiveness_result: e.target.value,
                          })
                        }
                        rows={3}
                        placeholder="Faaliyet sonucunda elde edilen sonucu yazın..."
                        className={`${inputClass()} resize-none`}
                      />
                    </Field>
                  </div>
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
                <button
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Vazgeç
                </button>

                <button
                  onClick={saveAction}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={17} />
                  {saving
                    ? "Kaydediliyor..."
                    : editingAction
                    ? "Değişiklikleri Kaydet"
                    : "Aksiyonu Kaydet"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function KpiCard({
  title,
  value,
  icon,
  iconClass,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-800">
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
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
      <label className="mb-2 block text-xs font-semibold text-slate-600">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {children}
    </div>
  );
}