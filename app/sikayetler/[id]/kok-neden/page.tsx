"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  GitBranch,
  AlertTriangle,
} from "lucide-react";

import AppShell from "@/app/components/AppShell";
import { supabase } from "@/app/lib/supabase";

type Complaint = {
  id: number;
  complaint_no: string;
  customer: string;
  subject: string;
  description: string | null;
};

type FiveWhy = {
  id?: number;
  why_no: number;
  question: string;
  answer: string;
};

type IshikawaCause = {
  id?: number;
  category: string;
  cause_description: string;
  is_root_cause: boolean;
};

const whyQuestions = [
  "Neden bu şikayet meydana geldi?",
  "Bu durum neden oluşmaya devam etti?",
  "Bir önceki neden neden gerçekleşti?",
  "Bu neden neden önlenemedi?",
  "Sistemde bu duruma neden izin verildi?",
];

const ishikawaCategories = [
  "İnsan",
  "Makine",
  "Metot",
  "Malzeme",
  "Ölçüm",
  "Çevre",
];

const analysisMethods = [
  "5 Neden",
  "Balık Kılçığı",
  "5 Neden + Balık Kılçığı",
  "Diğer",
];

const rootCauseCategories = [
  "İnsan",
  "Makine",
  "Metot",
  "Malzeme",
  "Ölçüm",
  "Çevre",
  "Yönetim / Sistem",
  "Tedarikçi",
  "Diğer",
];

export default function KokNedenPage() {
  const params = useParams();
  const id = params?.id as string;

  const [complaint, setComplaint] =
    useState<Complaint | null>(null);

  const [analysisId, setAnalysisId] =
    useState<number | null>(null);

  const [analysisMethod, setAnalysisMethod] =
    useState("5 Neden");

  const [problemDefinition, setProblemDefinition] =
    useState("");

  const [rootCause, setRootCause] =
    useState("");

  const [rootCauseCategory, setRootCauseCategory] =
    useState("");

  const [conclusion, setConclusion] =
    useState("");

  const [status, setStatus] =
    useState("Taslak");

  const [fiveWhys, setFiveWhys] =
    useState<FiveWhy[]>(
      whyQuestions.map((question, index) => ({
        why_no: index + 1,
        question,
        answer: "",
      }))
    );

  const [ishikawaCauses, setIshikawaCauses] =
    useState<IshikawaCause[]>([]);

  const [newCauseCategory, setNewCauseCategory] =
    useState("İnsan");

  const [newCauseDescription, setNewCauseDescription] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  // =====================================================
  // ROL
  // =====================================================

  const [userRole, setUserRole] =
    useState<string | null>(null);

  const [roleLoading, setRoleLoading] =
    useState(true);

  const canEdit =
    userRole === "Yönetici" ||
    userRole === "Kalite Sorumlusu" ||
    userRole === "Kalite Kontrol";

  // =====================================================
  // SAYFA YÜKLENDİĞİNDE
  // =====================================================

  useEffect(() => {
    if (!id) return;

    loadUserRole();
    loadData();
  }, [id]);

  // =====================================================
  // KULLANICI ROLÜ
  // =====================================================

  async function loadUserRole() {
    setRoleLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserRole(null);
        return;
      }

      const {
        data,
        error: roleError,
      } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (roleError) {
        console.error(
          "Kullanıcı rolü alınamadı:",
          roleError
        );

        setUserRole(null);
        return;
      }

      setUserRole(data?.role || null);
    } catch (err) {
      console.error(
        "Kullanıcı rolü alınamadı:",
        err
      );

      setUserRole(null);
    } finally {
      setRoleLoading(false);
    }
  }

  // =====================================================
  // VERİLERİ YÜKLE
  // =====================================================

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const {
        data: complaintData,
        error: complaintError,
      } = await supabase
        .from("complaints")
        .select(
          "id, complaint_no, customer, subject, description"
        )
        .eq("complaint_no", id)
        .limit(1);

      if (complaintError) {
        throw complaintError;
      }

      const foundComplaint =
        complaintData?.[0];

      if (!foundComplaint) {
        setError("Şikayet bulunamadı.");
        setComplaint(null);
        setLoading(false);
        return;
      }

      setComplaint(foundComplaint);

      const {
        data: analysisData,
        error: analysisError,
      } = await supabase
        .from("complaint_root_cause_analysis")
        .select("*")
        .eq(
          "complaint_id",
          foundComplaint.id
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(1);

      if (analysisError) {
        throw analysisError;
      }

      const analysis =
        analysisData?.[0];

      if (!analysis) {
        setAnalysisId(null);

        setAnalysisMethod("5 Neden");

        setProblemDefinition(
          foundComplaint.description ||
            foundComplaint.subject ||
            ""
        );

        setRootCause("");
        setRootCauseCategory("");
        setConclusion("");
        setStatus("Taslak");

        setFiveWhys(
          whyQuestions.map(
            (question, index) => ({
              why_no: index + 1,
              question,
              answer: "",
            })
          )
        );

        setIshikawaCauses([]);

        setLoading(false);
        return;
      }

      setAnalysisId(analysis.id);

      setAnalysisMethod(
        analysis.analysis_method ||
          "5 Neden"
      );

      setProblemDefinition(
        analysis.problem_definition ||
          foundComplaint.description ||
          foundComplaint.subject ||
          ""
      );

      setRootCause(
        analysis.root_cause || ""
      );

      setRootCauseCategory(
        analysis.root_cause_category ||
          ""
      );

      setConclusion(
        analysis.conclusion || ""
      );

      setStatus(
        analysis.status || "Taslak"
      );

      const {
        data: whys,
        error: whysError,
      } = await supabase
        .from("complaint_five_whys")
        .select("*")
        .eq(
          "analysis_id",
          analysis.id
        )
        .order("why_no", {
          ascending: true,
        });

      if (whysError) {
        throw whysError;
      }

      const loadedWhys: FiveWhy[] =
        whyQuestions.map(
          (question, index) => {
            const existing =
              whys?.find(
                (why) =>
                  why.why_no ===
                  index + 1
              );

            return {
              id: existing?.id,
              why_no: index + 1,
              question,
              answer:
                existing?.answer || "",
            };
          }
        );

      setFiveWhys(loadedWhys);

      const {
        data: causes,
        error: causesError,
      } = await supabase
        .from(
          "complaint_ishikawa_causes"
        )
        .select("*")
        .eq(
          "analysis_id",
          analysis.id
        )
        .order("created_at", {
          ascending: true,
        });

      if (causesError) {
        throw causesError;
      }

      setIshikawaCauses(
        (causes || []) as IshikawaCause[]
      );

      setLoading(false);
    } catch (err: any) {
      console.error(
        "Kök neden yükleme hatası:",
        err
      );

      setError(
        err?.message ||
          "Kök neden analizi yüklenemedi."
      );

      setLoading(false);
    }
  }

  // =====================================================
  // 5 NEDEN GÜNCELLE
  // =====================================================

  function updateWhy(
    index: number,
    answer: string
  ) {
    if (!canEdit) return;

    setFiveWhys((current) =>
      current.map((why, i) =>
        i === index
          ? {
              ...why,
              answer,
            }
          : why
      )
    );
  }

  // =====================================================
  // ISHIKAWA NEDEN EKLE
  // =====================================================

  function addIshikawaCause() {
    if (!canEdit) return;

    const description =
      newCauseDescription.trim();

    if (!description) {
      setError(
        "Lütfen neden açıklamasını girin."
      );
      return;
    }

    setIshikawaCauses((current) => [
      ...current,
      {
        category: newCauseCategory,
        cause_description:
          description,
        is_root_cause: false,
      },
    ]);

    setNewCauseDescription("");
    setError("");
  }

  // =====================================================
  // ISHIKAWA NEDEN SİL
  // =====================================================

  function removeIshikawaCause(
    index: number
  ) {
    if (!canEdit) return;

    setIshikawaCauses((current) =>
      current.filter(
        (_, i) => i !== index
      )
    );
  }

  // =====================================================
  // KÖK NEDEN SEÇ
  // =====================================================

  function toggleRootCause(
    index: number
  ) {
    if (!canEdit) return;

    setIshikawaCauses((current) =>
      current.map((cause, i) =>
        i === index
          ? {
              ...cause,
              is_root_cause:
                !cause.is_root_cause,
            }
          : cause
      )
    );
  }

  // =====================================================
  // KAYDET
  // =====================================================

  async function saveAnalysis() {
    if (!complaint) return;

    if (!canEdit) {
      setError(
        "Bu işlem için yetkiniz bulunmamaktadır."
      );
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      let currentAnalysisId =
        analysisId;

      const payload = {
        complaint_id:
          complaint.id,

        analysis_method:
          analysisMethod,

        problem_definition:
          problemDefinition.trim() ||
          null,

        root_cause:
          rootCause.trim() || null,

        root_cause_category:
          rootCauseCategory || null,

        conclusion:
          conclusion.trim() || null,

        status,

        updated_at:
          new Date().toISOString(),
      };

      // =================================================
      // ANA ANALİZ KAYDI
      // =================================================

      if (currentAnalysisId) {
        const {
          error: updateError,
        } = await supabase
          .from(
            "complaint_root_cause_analysis"
          )
          .update(payload)
          .eq(
            "id",
            currentAnalysisId
          );

        if (updateError) {
          throw updateError;
        }
      } else {
        const {
          error: insertError,
        } = await supabase
          .from(
            "complaint_root_cause_analysis"
          )
          .insert(payload);

        if (insertError) {
          throw insertError;
        }

        const {
          data: insertedAnalysis,
          error:
            fetchAnalysisError,
        } = await supabase
          .from(
            "complaint_root_cause_analysis"
          )
          .select("id")
          .eq(
            "complaint_id",
            complaint.id
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(1);

        if (fetchAnalysisError) {
          throw fetchAnalysisError;
        }

        if (
          !insertedAnalysis ||
          insertedAnalysis.length === 0
        ) {
          throw new Error(
            "Kök neden analiz kaydı oluşturuldu ancak kayıt ID'si bulunamadı."
          );
        }

        currentAnalysisId =
          insertedAnalysis[0].id;

        setAnalysisId(
          currentAnalysisId
        );
      }

      if (!currentAnalysisId) {
        throw new Error(
          "Analiz ID'si bulunamadı."
        );
      }

      // =================================================
      // 5 NEDENLERİ TEMİZLE
      // =================================================

      const {
        error: deleteWhyError,
      } = await supabase
        .from(
          "complaint_five_whys"
        )
        .delete()
        .eq(
          "analysis_id",
          currentAnalysisId
        );

      if (deleteWhyError) {
        throw deleteWhyError;
      }

      // =================================================
      // 5 NEDENLERİ EKLE
      // =================================================

      const whyRows = fiveWhys
        .filter(
          (why) =>
            why.answer.trim()
              .length > 0
        )
        .map((why) => ({
          analysis_id:
            currentAnalysisId,
          why_no: why.why_no,
          question: why.question,
          answer:
            why.answer.trim(),
        }));

      if (whyRows.length > 0) {
        const {
          error: whyError,
        } = await supabase
          .from(
            "complaint_five_whys"
          )
          .insert(whyRows);

        if (whyError) {
          throw whyError;
        }
      }

      // =================================================
      // ISHIKAWA TEMİZLE
      // =================================================

      const {
        error:
          deleteCauseError,
      } = await supabase
        .from(
          "complaint_ishikawa_causes"
        )
        .delete()
        .eq(
          "analysis_id",
          currentAnalysisId
        );

      if (deleteCauseError) {
        throw deleteCauseError;
      }

      // =================================================
      // ISHIKAWA EKLE
      // =================================================

      const causeRows =
        ishikawaCauses
          .filter(
            (cause) =>
              cause.cause_description
                .trim()
                .length > 0
          )
          .map((cause) => ({
            analysis_id:
              currentAnalysisId,
            category:
              cause.category,
            cause_description:
              cause.cause_description.trim(),
            is_root_cause:
              cause.is_root_cause,
          }));

      if (causeRows.length > 0) {
        const {
          error: causeError,
        } = await supabase
          .from(
            "complaint_ishikawa_causes"
          )
          .insert(causeRows);

        if (causeError) {
          throw causeError;
        }
      }

      setMessage(
        "Kök neden analizi başarıyla kaydedildi."
      );

      await loadData();
    } catch (err: any) {
      console.error(
        "Kök neden kaydetme hatası:",
        err
      );

      setError(
        err?.message ||
          "Kök neden analizi kaydedilemedi."
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <AppShell>
        <div className="p-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
            Kök neden analizi yükleniyor...
          </div>
        </div>
      </AppShell>
    );
  }

  // =====================================================
  // ŞİKAYET YOK
  // =====================================================

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

  // =====================================================
  // ANA EKRAN
  // =====================================================

  return (
    <AppShell>
      <div className="box-border w-full min-w-0 max-w-full overflow-x-hidden px-8 py-6">
        <div className="mx-auto w-full max-w-[1500px] space-y-6">

          {/* =================================================
              HEADER
          ================================================= */}

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                <Link
                  href={`/sikayetler/${complaint.complaint_no}`}
                  className="flex items-center gap-1 hover:text-blue-600"
                >
                  <ArrowLeft size={16} />
                  Şikayet Detayı
                </Link>

                <span>/</span>

                <span>
                  Kök Neden Analizi
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                  <GitBranch size={24} />
                </div>

                <div>
                  <h1 className="text-2xl font-semibold text-slate-900">
                    Kök Neden Analizi
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    {complaint.complaint_no} —{" "}
                    {complaint.subject}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Müşteri:{" "}
                    {complaint.customer}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">

              <div
                className={`rounded-xl border px-4 py-2 text-sm font-medium ${
                  status === "Tamamlandı"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : status ===
                      "Onaylandı"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                }`}
              >
                {status}
              </div>

              {!roleLoading &&
                canEdit && (
                  <button
                    type="button"
                    onClick={
                      saveAnalysis
                    }
                    disabled={saving}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save size={17} />

                    {saving
                      ? "Kaydediliyor..."
                      : "Analizi Kaydet"}
                  </button>
                )}

              {!roleLoading &&
                !canEdit && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
                    Salt Okunur
                  </div>
                )}
            </div>
          </div>

          {/* =================================================
              MESAJ
          ================================================= */}

          {message && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 size={17} />
              {message}
            </div>
          )}

          {/* =================================================
              HATA
          ================================================= */}

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle size={17} />
              {error}
            </div>
          )}

          {/* =================================================
              ANALİZ BİLGİLERİ
          ================================================= */}

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="font-semibold text-slate-900">
                Analiz Bilgileri
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Şikayetin kök neden analizini tanımlayın.
              </p>
            </div>

            <div className="grid gap-5 p-6 xl:grid-cols-3">

              {/* ANALİZ YÖNTEMİ */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Analiz Yöntemi
                </label>

                <select
                  value={
                    analysisMethod
                  }
                  onChange={(e) =>
                    setAnalysisMethod(
                      e.target.value
                    )
                  }
                  disabled={
                    roleLoading ||
                    !canEdit
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                >
                  {analysisMethods.map(
                    (method) => (
                      <option
                        key={method}
                        value={method}
                      >
                        {method}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* KÖK NEDEN KATEGORİSİ */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Kök Neden Kategorisi
                </label>

                <select
                  value={
                    rootCauseCategory
                  }
                  onChange={(e) =>
                    setRootCauseCategory(
                      e.target.value
                    )
                  }
                  disabled={
                    roleLoading ||
                    !canEdit
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="">
                    Seçiniz
                  </option>

                  {rootCauseCategories.map(
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

              {/* DURUM */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Analiz Durumu
                </label>

                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target.value
                    )
                  }
                  disabled={
                    roleLoading ||
                    !canEdit
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="Taslak">
                    Taslak
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

            <div className="grid gap-5 px-6 pb-6">

              {/* PROBLEM */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Problem Tanımı
                </label>

                <textarea
                  value={
                    problemDefinition
                  }
                  onChange={(e) =>
                    setProblemDefinition(
                      e.target.value
                    )
                  }
                  disabled={
                    roleLoading ||
                    !canEdit
                  }
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  placeholder="Şikayeti açık ve ölçülebilir şekilde tanımlayın..."
                />
              </div>

              {/* KÖK NEDEN */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Belirlenen Kök Neden
                </label>

                <textarea
                  value={rootCause}
                  onChange={(e) =>
                    setRootCause(
                      e.target.value
                    )
                  }
                  disabled={
                    roleLoading ||
                    !canEdit
                  }
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  placeholder="Analiz sonucunda belirlenen temel kök nedeni yazın..."
                />
              </div>

              {/* SONUÇ */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Sonuç / Değerlendirme
                </label>

                <textarea
                  value={conclusion}
                  onChange={(e) =>
                    setConclusion(
                      e.target.value
                    )
                  }
                  disabled={
                    roleLoading ||
                    !canEdit
                  }
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  placeholder="Analizin sonucunu ve değerlendirmeyi yazın..."
                />
              </div>
            </div>
          </section>

          {/* =================================================
              5 NEDEN
          ================================================= */}

          {(analysisMethod ===
            "5 Neden" ||
            analysisMethod ===
              "5 Neden + Balık Kılçığı") && (
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 px-6 py-5">
                <h2 className="font-semibold text-slate-900">
                  5 Neden Analizi
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Şikayetin görünen nedeninden sistemsel kök nedene doğru ilerleyin.
                </p>
              </div>

              <div className="space-y-4 p-6">

                {fiveWhys.map(
                  (why, index) => (
                    <div
                      key={
                        why.why_no
                      }
                      className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[100px_1fr]"
                    >
                      <div className="flex min-h-[80px] items-center justify-center rounded-xl bg-white">
                        <div className="text-center">

                          <div className="text-xs uppercase tracking-wide text-slate-400">
                            Neden
                          </div>

                          <div className="mt-1 text-2xl font-bold text-blue-600">
                            {why.why_no}
                          </div>

                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          {why.question}
                        </label>

                        <textarea
                          value={
                            why.answer
                          }
                          onChange={(e) =>
                            updateWhy(
                              index,
                              e.target.value
                            )
                          }
                          disabled={
                            roleLoading ||
                            !canEdit
                          }
                          rows={3}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                          placeholder="Cevabı yazın..."
                        />
                      </div>
                    </div>
                  )
                )}

              </div>
            </section>
          )}

          {/* =================================================
              ISHIKAWA
          ================================================= */}

          {(analysisMethod ===
            "Balık Kılçığı" ||
            analysisMethod ===
              "5 Neden + Balık Kılçığı") && (
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 px-6 py-5">
                <h2 className="font-semibold text-slate-900">
                  Balık Kılçığı — Ishikawa
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Olası nedenleri 6M yaklaşımıyla sınıflandırın.
                </p>
              </div>

              {/* NEDEN EKLE */}

              {canEdit && (
                <div className="border-b border-slate-100 bg-slate-50 p-6">
                  <div className="grid gap-3 xl:grid-cols-[220px_1fr_auto]">

                    <select
                      value={
                        newCauseCategory
                      }
                      onChange={(e) =>
                        setNewCauseCategory(
                          e.target.value
                        )
                      }
                      disabled={
                        roleLoading ||
                        !canEdit
                      }
                      className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      {ishikawaCategories.map(
                        (category) => (
                          <option
                            key={
                              category
                            }
                            value={
                              category
                            }
                          >
                            {category}
                          </option>
                        )
                      )}
                    </select>

                    <input
                      value={
                        newCauseDescription
                      }
                      onChange={(e) =>
                        setNewCauseDescription(
                          e.target.value
                        )
                      }
                      disabled={
                        roleLoading ||
                        !canEdit
                      }
                      placeholder="Olası nedeni yazın..."
                      className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />

                    <button
                      type="button"
                      onClick={
                        addIshikawaCause
                      }
                      disabled={
                        roleLoading ||
                        !canEdit
                      }
                      className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus size={17} />
                      Neden Ekle
                    </button>
                  </div>
                </div>
              )}

              {/* KATEGORİLER */}

              <div className="grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-3">

                {ishikawaCategories.map(
                  (category) => {

                    const categoryCauses =
                      ishikawaCauses
                        .map(
                          (
                            cause,
                            index
                          ) => ({
                            cause,
                            index,
                          })
                        )
                        .filter(
                          ({
                            cause,
                          }) =>
                            cause.category ===
                            category
                        );

                    return (
                      <div
                        key={
                          category
                        }
                        className="rounded-xl border border-slate-200"
                      >

                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">

                          <span className="text-sm font-semibold text-slate-800">
                            {category}
                          </span>

                          <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-500">
                            {
                              categoryCauses.length
                            }
                          </span>

                        </div>

                        <div className="space-y-2 p-3">

                          {categoryCauses.length ===
                          0 ? (
                            <div className="py-6 text-center text-xs text-slate-400">
                              Henüz neden eklenmedi.
                            </div>
                          ) : (
                            categoryCauses.map(
                              ({
                                cause,
                                index,
                              }) => (
                                <div
                                  key={`${category}-${index}`}
                                  className={`rounded-lg border p-3 ${
                                    cause.is_root_cause
                                      ? "border-emerald-300 bg-emerald-50"
                                      : "border-slate-200 bg-white"
                                  }`}
                                >

                                  <div className="flex items-start gap-2">

                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleRootCause(
                                          index
                                        )
                                      }
                                      disabled={
                                        roleLoading ||
                                        !canEdit
                                      }
                                      className={`mt-0.5 rounded-md p-1.5 ${
                                        cause.is_root_cause
                                          ? "bg-emerald-600 text-white"
                                          : "bg-slate-100 text-slate-400"
                                      } ${
                                        !canEdit
                                          ? "cursor-not-allowed opacity-60"
                                          : ""
                                      }`}
                                    >
                                      <CheckCircle2
                                        size={15}
                                      />
                                    </button>

                                    <div className="min-w-0 flex-1">

                                      <p className="text-sm text-slate-700">
                                        {
                                          cause.cause_description
                                        }
                                      </p>

                                      {cause.is_root_cause && (
                                        <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-700">
                                          Kök Neden
                                        </span>
                                      )}

                                    </div>

                                    {canEdit && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeIshikawaCause(
                                            index
                                          )
                                        }
                                        disabled={
                                          roleLoading ||
                                          !canEdit
                                        }
                                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        <Trash2
                                          size={15}
                                        />
                                      </button>
                                    )}

                                  </div>
                                </div>
                              )
                            )
                          )}

                        </div>
                      </div>
                    );
                  }
                )}

              </div>
            </section>
          )}

          {/* =================================================
              ÖZET
          ================================================= */}

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="font-semibold text-slate-900">
                Analiz Özeti
              </h2>
            </div>

            <div className="grid gap-5 p-6 md:grid-cols-3">

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Yöntem
                </div>

                <div className="mt-2 text-sm font-semibold text-slate-800">
                  {analysisMethod}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Kategori
                </div>

                <div className="mt-2 text-sm font-semibold text-slate-800">
                  {rootCauseCategory ||
                    "Belirlenmedi"}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Durum
                </div>

                <div className="mt-2 text-sm font-semibold text-slate-800">
                  {status}
                </div>
              </div>

            </div>

            <div className="px-6 pb-6">

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">

                <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Belirlenen Kök Neden
                </div>

                <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                  {rootCause ||
                    "Henüz kök neden belirlenmedi."}
                </div>

              </div>

            </div>
          </section>

          {/* =================================================
              ALT KAYDET
          ================================================= */}

          {canEdit && (
            <div className="flex justify-end pb-6">

              <button
                type="button"
                onClick={
                  saveAnalysis
                }
                disabled={
                  saving ||
                  roleLoading
                }
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={17} />

                {saving
                  ? "Kaydediliyor..."
                  : "Kök Neden Analizini Kaydet"}
              </button>

            </div>
          )}

        </div>
      </div>
    </AppShell>
  );
}