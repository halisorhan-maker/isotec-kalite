"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import { supabase } from "@/app/lib/supabase";

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
  created_at?: string;
  updated_at?: string;
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

const emptyEightD: EightD = {
  complaint_id: 0,
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

const steps = [
  {
    key: "d1_team",
    code: "D1",
    title: "Ekip",
    description: "8D çalışmasına katılan ekip ve sorumluluklar.",
  },
  {
    key: "d2_problem",
    code: "D2",
    title: "Problemin Tanımlanması",
    description: "Problemin ne olduğu, nerede ve ne zaman oluştuğu.",
  },
  {
    key: "d3_containment",
    code: "D3",
    title: "Geçici Önlem",
    description:
      "Problemin müşteriye ve üretime etkisini sınırlayan önlemler.",
  },
  {
    key: "d4_root_cause",
    code: "D4",
    title: "Kök Neden",
    description: "Kök neden analizi ve nedenin doğrulanması.",
  },
  {
    key: "d5_corrective_action",
    code: "D5",
    title: "Kalıcı Düzeltici Faaliyet",
    description:
      "Kök nedeni ortadan kaldıracak kalıcı faaliyetler.",
  },
  {
    key: "d6_implementation",
    code: "D6",
    title: "Uygulama",
    description:
      "Düzeltici faaliyetlerin uygulanması ve doğrulanması.",
  },
  {
    key: "d7_prevention",
    code: "D7",
    title: "Tekrarın Önlenmesi",
    description:
      "Benzer problemlerin tekrar oluşmasını engelleyecek sistematik önlemler.",
  },
  {
    key: "d8_closure",
    code: "D8",
    title: "Kapanış",
    description:
      "8D sonucunun değerlendirilmesi ve kapatılması.",
  },
] as const;

function formatDate(date: string | null | undefined) {
  if (!date) return "-";

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("tr-TR");
}

function getTodayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isActionCompleted(action: Action) {
  return (
    action.status === "Tamamlandı" ||
    Boolean(action.completion_date)
  );
}

function isActionCancelled(action: Action) {
  return action.status === "İptal";
}

function isActionOverdue(action: Action) {
  if (!action.target_date) return false;

  if (isActionCompleted(action) || isActionCancelled(action)) {
    return false;
  }

  return action.target_date < getTodayIso();
}

function getStatusClass(status: string) {
  if (status === "Tamamlandı") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (status === "İptal") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  if (status === "Devam Ediyor") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  return "bg-amber-50 text-amber-700 border-amber-200";
}

function getPriorityClass(priority: string) {
  if (priority === "Yüksek") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  if (priority === "Düşük") {
    return "bg-slate-50 text-slate-600 border-slate-200";
  }

  return "bg-amber-50 text-amber-700 border-amber-200";
}

export default function EightDPage() {
  const params = useParams();
  const complaintNo = String(params.id);

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [eightD, setEightD] = useState<EightD | null>(null);
  const [actions, setActions] = useState<Action[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);

  const [activeStep, setActiveStep] = useState(0);
  const [showActionForm, setShowActionForm] = useState(false);

  const [actionForm, setActionForm] =
    useState<ActionForm>(emptyAction);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [actionFilter, setActionFilter] = useState("Tümü");

  useEffect(() => {
    loadData();
  }, [complaintNo]);

  async function loadData() {
    setLoading(true);
    setError("");

    const { data: complaintData, error: complaintError } =
      await supabase
        .from("complaints")
        .select("*")
        .eq("complaint_no", complaintNo)
        .single();

    if (complaintError || !complaintData) {
      setError("Şikayet kaydı bulunamadı.");
      setLoading(false);
      return;
    }

    const currentComplaint = complaintData as Complaint;
    setComplaint(currentComplaint);

    const { data: eightDData, error: eightDError } =
      await supabase
        .from("complaint_8d")
        .select("*")
        .eq("complaint_id", currentComplaint.id)
        .maybeSingle();

    if (eightDError) {
      setError(eightDError.message);
      setLoading(false);
      return;
    }

    if (eightDData) {
      setEightD(eightDData as EightD);

      const { data: actionData, error: actionError } =
        await supabase
          .from("complaint_8d_actions")
          .select("*")
          .eq("complaint_id", currentComplaint.id)
          .order("action_no", { ascending: true });

      if (actionError) {
        setError(actionError.message);
        setLoading(false);
        return;
      }

      setActions((actionData || []) as Action[]);
    } else {
      setEightD({
        ...emptyEightD,
        complaint_id: currentComplaint.id,
      });

      setActions([]);
    }

    setLoading(false);
  }

  async function saveEightD() {
    if (!complaint || !eightD) return;

    setSaving(true);
    setMessage("");
    setError("");

    const payload = {
      complaint_id: complaint.id,
      d1_team: eightD.d1_team,
      d2_problem: eightD.d2_problem,
      d3_containment: eightD.d3_containment,
      d4_root_cause: eightD.d4_root_cause,
      d5_corrective_action: eightD.d5_corrective_action,
      d6_implementation: eightD.d6_implementation,
      d7_prevention: eightD.d7_prevention,
      d8_closure: eightD.d8_closure,
      d4_method: eightD.d4_method,
      d4_root_cause_category: eightD.d4_root_cause_category,
      action_responsible: eightD.action_responsible,
      target_date: eightD.target_date || null,
      completion_date: eightD.completion_date || null,
      status: eightD.status,
    };

    const { data, error: saveError } = await supabase
      .from("complaint_8d")
      .upsert(payload, {
        onConflict: "complaint_id",
      })
      .select()
      .single();

    if (saveError) {
      setError(saveError.message);
    } else {
      setEightD(data as EightD);
      setMessage("8D kaydı başarıyla kaydedildi.");
    }

    setSaving(false);
  }

  async function updateComplaintStatus(status: string) {
    if (!complaint) return;

    const { error: statusError } = await supabase
      .from("complaints")
      .update({ status })
      .eq("id", complaint.id);

    if (statusError) {
      setError(statusError.message);
      return;
    }

    setComplaint({
      ...complaint,
      status,
    });

    setMessage(
      `Şikayet durumu "${status}" olarak güncellendi.`
    );
  }

  function openNewAction() {
    const nextNo =
      actions.length > 0
        ? Math.max(
            ...actions.map((item) => item.action_no)
          ) + 1
        : 1;

    setActionForm({
      ...emptyAction,
      action_no: nextNo,
    });

    setShowActionForm(true);
    setMessage("");
    setError("");
  }

  async function saveAction() {
    if (!complaint) return;

    if (!actionForm.action_description.trim()) {
      setError("Aksiyon açıklaması giriniz.");
      return;
    }

    setActionSaving(true);
    setMessage("");
    setError("");

    let currentEightD: EightD | null = eightD;

    if (!currentEightD) {
      const { data: createdEightD, error: createError } =
        await supabase
          .from("complaint_8d")
          .insert({
            ...emptyEightD,
            complaint_id: complaint.id,
          })
          .select()
          .single();

      if (createError || !createdEightD) {
        setError(
          createError?.message ||
            "8D kaydı oluşturulamadı."
        );
        setActionSaving(false);
        return;
      }

      currentEightD = createdEightD as EightD;
      setEightD(currentEightD);
    }

    if (!currentEightD) {
      setError("8D kaydı bulunamadı.");
      setActionSaving(false);
      return;
    }

    const payload = {
      complaint_id: complaint.id,
      complaint_8d_id: currentEightD.id ?? null,
      action_no: Number(actionForm.action_no),
      action_type: actionForm.action_type,
      action_description:
        actionForm.action_description.trim(),
      responsible:
        actionForm.responsible.trim() || null,
      target_date: actionForm.target_date || null,
      completion_date:
        actionForm.completion_date || null,
      status: actionForm.status,
      effectiveness_check:
        actionForm.effectiveness_check.trim() || null,
      effectiveness_result:
        actionForm.effectiveness_result.trim() || null,
    };

    const editingId = actionForm.id;

    if (editingId) {
      const { data, error: updateError } =
        await supabase
          .from("complaint_8d_actions")
          .update(payload)
          .eq("id", editingId)
          .select()
          .single();

      if (updateError) {
        setError(updateError.message);
        setActionSaving(false);
        return;
      }

      setActions((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? (data as Action)
            : item
        )
      );

      setMessage("Aksiyon başarıyla güncellendi.");
    } else {
      const { data, error: insertError } =
        await supabase
          .from("complaint_8d_actions")
          .insert(payload)
          .select()
          .single();

      if (insertError) {
        setError(insertError.message);
        setActionSaving(false);
        return;
      }

      setActions((prev) =>
        [...prev, data as Action].sort(
          (a, b) => a.action_no - b.action_no
        )
      );

      setMessage("Yeni aksiyon başarıyla eklendi.");
    }

    setActionForm({
      ...emptyAction,
      action_no:
        Math.max(
          ...actions.map((item) => item.action_no),
          Number(actionForm.action_no)
        ) + 1,
    });

    setShowActionForm(false);
    setActionSaving(false);
  }

  function editAction(action: Action) {
    setActionForm({
      id: action.id,
      action_no: action.action_no,
      action_type: action.action_type,
      action_description: action.action_description,
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

    setShowActionForm(true);
    setMessage("");
    setError("");
  }

  async function deleteAction(action: Action) {
    const confirmed = window.confirm(
      `Aksiyon ${action.action_no} silinsin mi?`
    );

    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from("complaint_8d_actions")
      .delete()
      .eq("id", action.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setActions((prev) =>
      prev.filter((item) => item.id !== action.id)
    );

    setMessage("Aksiyon silindi.");
  }

  function updateEightDField(
    field: keyof EightD,
    value: string
  ) {
    setEightD((current) => {
      if (!current) return current;

      return {
        ...current,
        [field]: value,
      };
    });
  }

  const completedSteps = useMemo(() => {
    if (!eightD) return 0;

    return steps.filter((step) => {
      const value = eightD[step.key];

      return (
        typeof value === "string" &&
        value.trim().length > 0
      );
    }).length;
  }, [eightD]);

  const progressPercent = Math.round(
    (completedSteps / steps.length) * 100
  );

  const completedActionCount = useMemo(
    () => actions.filter(isActionCompleted).length,
    [actions]
  );

  const openActionCount = useMemo(
    () =>
      actions.filter(
        (action) =>
          !isActionCompleted(action) &&
          !isActionCancelled(action)
      ).length,
    [actions]
  );

  const overdueActionCount = useMemo(
    () => actions.filter(isActionOverdue).length,
    [actions]
  );

  const cancelledActionCount = useMemo(
    () =>
      actions.filter((action) =>
        isActionCancelled(action)
      ).length,
    [actions]
  );

  const actionProgressPercent =
    actions.length > 0
      ? Math.round(
          (completedActionCount / actions.length) * 100
        )
      : 0;

  const effectivenessCompletedCount = useMemo(
    () =>
      actions.filter(
        (action) =>
          Boolean(action.effectiveness_check) ||
          Boolean(action.effectiveness_result)
      ).length,
    [actions]
  );

  const filteredActions = useMemo(() => {
    if (actionFilter === "Tümü") return actions;

    if (actionFilter === "Geciken") {
      return actions.filter(isActionOverdue);
    }

    if (actionFilter === "Tamamlandı") {
      return actions.filter(isActionCompleted);
    }

    return actions.filter(
      (action) => action.status === actionFilter
    );
  }, [actions, actionFilter]);

  function renderStepContent(): ReactNode {
    if (!complaint || !eightD) return null;

    const textareaStyle: React.CSSProperties = {
      position: "relative",
      zIndex: 10000,
      pointerEvents: "auto",
      userSelect: "text",
      WebkitUserSelect: "text",
      cursor: "text",
    };

    const step = steps[activeStep];

    if (step.key === "d1_team") {
      return (
        <div className="space-y-5">
          <FieldLabel
            title="8D Ekibi"
            description="Problemin çözümünde görev alan kişiler ve görevlerini yazınız."
          />

          <textarea
            value={eightD.d1_team}
            onChange={(e) =>
              updateEightDField(
                "d1_team",
                e.currentTarget.value
              )
            }
            placeholder="Örn. Kalite Müdürü, Üretim Sorumlusu, Proje Sorumlusu..."
            style={textareaStyle}
            autoFocus
            className="min-h-[180px] w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          />
        </div>
      );
    }

    if (step.key === "d2_problem") {
      return (
        <div className="space-y-5">
          <FieldLabel
            title="Problem Tanımı"
            description="Problemi ölçülebilir ve açık şekilde tanımlayınız."
          />

          <textarea
            value={eightD.d2_problem}
            onChange={(e) =>
              updateEightDField(
                "d2_problem",
                e.currentTarget.value
              )
            }
            placeholder="Problemin ne olduğunu, nerede ve ne zaman oluştuğunu, miktarı ve etkisini açıklayınız."
            style={textareaStyle}
            className="min-h-[220px] w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          />

          <InfoBox>
            İyi bir D2 tanımı; ürün, proje, miktar, tarih,
            proses ve gözlenen uygunsuzluğu mümkün olduğunca
            net içermelidir.
          </InfoBox>
        </div>
      );
    }

    if (step.key === "d3_containment") {
      return (
        <div className="space-y-5">
          <FieldLabel
            title="Geçici / Acil Önlemler"
            description="Kök neden bulunana kadar problemin etkisini sınırlandırmak için alınan önlemler."
          />

          <textarea
            value={eightD.d3_containment}
            onChange={(e) =>
              updateEightDField(
                "d3_containment",
                e.currentTarget.value
              )
            }
            placeholder="Örn. Stok karantinası, sevkiyat durdurma, %100 kontrol, müşteriye bilgilendirme..."
            style={textareaStyle}
            className="min-h-[220px] w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          />
        </div>
      );
    }

    if (step.key === "d4_root_cause") {
      return (
        <div className="space-y-5">
          <FieldLabel
            title="Kök Neden Analizi"
            description="Problemin oluşmasına neden olan temel sebebi belirleyiniz."
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Analiz Yöntemi
              </label>

              <select
                value={eightD.d4_method}
                onChange={(e) =>
                  updateEightDField(
                    "d4_method",
                    e.currentTarget.value
                  )
                }
                style={{
                  position: "relative",
                  zIndex: 10000,
                  pointerEvents: "auto",
                }}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              >
                <option value="">Seçiniz</option>
                <option value="5 Neden">5 Neden</option>
                <option value="Balık Kılçığı">
                  Balık Kılçığı
                </option>
                <option value="Pareto">Pareto</option>
                <option value="FMEA">FMEA</option>
                <option value="Diğer">Diğer</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Kök Neden Kategorisi
              </label>

              <select
                value={
                  eightD.d4_root_cause_category
                }
                onChange={(e) =>
                  updateEightDField(
                    "d4_root_cause_category",
                    e.currentTarget.value
                  )
                }
                style={{
                  position: "relative",
                  zIndex: 10000,
                  pointerEvents: "auto",
                }}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              >
                <option value="">Seçiniz</option>
                <option value="İnsan">İnsan</option>
                <option value="Makine">Makine</option>
                <option value="Metot">Metot</option>
                <option value="Malzeme">Malzeme</option>
                <option value="Ölçüm">Ölçüm</option>
                <option value="Çevre">Çevre</option>
                <option value="Tedarikçi">
                  Tedarikçi
                </option>
                <option value="Tasarım">Tasarım</option>
                <option value="Diğer">Diğer</option>
              </select>
            </div>
          </div>

          <textarea
            value={eightD.d4_root_cause}
            onChange={(e) =>
              updateEightDField(
                "d4_root_cause",
                e.currentTarget.value
              )
            }
            placeholder="Analiz sonucunda tespit edilen kök nedeni ayrıntılı şekilde yazınız."
            style={textareaStyle}
            className="min-h-[220px] w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          />
        </div>
      );
    }

    if (step.key === "d5_corrective_action") {
      return (
        <div className="space-y-5">
          <FieldLabel
            title="Kalıcı Düzeltici Faaliyet"
            description="Kök nedeni ortadan kaldırmak için uygulanacak kalıcı faaliyetleri tanımlayınız."
          />

          <textarea
            value={eightD.d5_corrective_action}
            onChange={(e) =>
              updateEightDField(
                "d5_corrective_action",
                e.currentTarget.value
              )
            }
            placeholder="Alınacak kalıcı aksiyonları açıklayınız."
            style={textareaStyle}
            className="min-h-[220px] w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          />

          <InfoBox>
            Detaylı aksiyon takibini aşağıdaki{" "}
            <b>Aksiyon Yönetimi</b> bölümünden ayrıca
            oluşturabilirsiniz.
          </InfoBox>
        </div>
      );
    }

    if (step.key === "d6_implementation") {
      return (
        <div className="space-y-5">
          <FieldLabel
            title="Uygulama ve Doğrulama"
            description="Düzeltici faaliyetlerin ne zaman ve nasıl uygulandığını belirtiniz."
          />

          <textarea
            value={eightD.d6_implementation}
            onChange={(e) =>
              updateEightDField(
                "d6_implementation",
                e.currentTarget.value
              )
            }
            placeholder="Faaliyetlerin uygulama tarihi, yapılan kontroller ve doğrulama sonuçları..."
            style={textareaStyle}
            className="min-h-[220px] w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          />
        </div>
      );
    }

    if (step.key === "d7_prevention") {
      return (
        <div className="space-y-5">
          <FieldLabel
            title="Tekrarın Önlenmesi"
            description="Benzer problemin başka ürün veya proseslerde de oluşmasını engelleyecek önlemler."
          />

          <textarea
            value={eightD.d7_prevention}
            onChange={(e) =>
              updateEightDField(
                "d7_prevention",
                e.currentTarget.value
              )
            }
            placeholder="Prosedür, talimat, kontrol planı, eğitim, FMEA, teknik resim vb. güncellemeleri..."
            style={textareaStyle}
            className="min-h-[220px] w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          />
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <FieldLabel
          title="8D Kapanış"
          description="Müşteri iletişimi, etkinlik doğrulaması ve kapanış bilgisini giriniz."
        />

        <textarea
          value={eightD.d8_closure}
          onChange={(e) =>
            updateEightDField(
              "d8_closure",
              e.currentTarget.value
            )
          }
          placeholder="8D sonucunu, müşteri bilgilendirmesini ve kapanış değerlendirmesini yazınız."
          style={textareaStyle}
          className="min-h-[220px] w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <InputField
            label="Sorumlu"
            value={eightD.action_responsible}
            onChange={(value) =>
              updateEightDField(
                "action_responsible",
                value
              )
            }
          />

          <InputField
            label="Hedef Tarih"
            type="date"
            value={eightD.target_date}
            onChange={(value) =>
              updateEightDField(
                "target_date",
                value
              )
            }
          />

          <InputField
            label="Tamamlanma Tarihi"
            type="date"
            value={eightD.completion_date}
            onChange={(value) =>
              updateEightDField(
                "completion_date",
                value
              )
            }
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 text-sm text-slate-500 shadow-sm">
            8D kaydı yükleniyor...
          </div>
        </div>
      </AppShell>
    );
  }

  if (!complaint || !eightD) {
    return (
      <AppShell>
        <div className="box-border w-full px-8 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error || "Kayıt bulunamadı."}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="box-border w-full min-w-0 max-w-full overflow-x-hidden px-8 py-6">
        <div className="w-full min-w-0 max-w-full space-y-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <Link
                  href="/sikayetler"
                  className="hover:text-blue-600"
                >
                  Şikayetler
                </Link>

                <span>/</span>

                <Link
                  href={`/sikayetler/${complaint.complaint_no}`}
                  className="hover:text-blue-600"
                >
                  {complaint.complaint_no}
                </Link>

                <span>/</span>
                <span>8D</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  8D Problem Çözme
                </h1>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${getPriorityClass(
                    complaint.priority
                  )}`}
                >
                  {complaint.priority}
                </span>

                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {complaint.status}
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                {complaint.complaint_no} ·{" "}
                {complaint.customer} ·{" "}
                {complaint.subject}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/sikayetler/${complaint.complaint_no}`}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Şikayete Dön
              </Link>

              <button
                onClick={saveEightD}
                disabled={saving}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-[#0c1c32] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#142945] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Kaydediliyor..."
                  : "8D'yi Kaydet"}
              </button>
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="8D İlerleme"
              value={`${progressPercent}%`}
              detail={`${completedSteps} / 8 adım tamamlandı`}
              icon="◈"
            />

            <KpiCard
              title="Toplam Aksiyon"
              value={String(actions.length)}
              detail={`${completedActionCount} tamamlandı`}
              icon="✓"
            />

            <KpiCard
              title="Geciken Aksiyon"
              value={String(overdueActionCount)}
              detail={
                overdueActionCount > 0
                  ? "Termin tarihi geçmiş"
                  : "Geciken aksiyon yok"
              }
              icon="!"
              danger={overdueActionCount > 0}
            />

            <KpiCard
              title="Aksiyon İlerlemesi"
              value={`${actionProgressPercent}%`}
              detail={`${openActionCount} açık · ${cancelledActionCount} iptal`}
              icon="↗"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  8D İlerleme
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Her adımı tamamladıkça 8D ilerleme oranı
                  güncellenir.
                </p>
              </div>

              <div className="text-sm font-bold text-slate-800">
                {progressPercent}%
              </div>
            </div>

            <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{
                  width: `${progressPercent}%`,
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
              {steps.map((step, index) => {
                const completed =
                  eightD[step.key].trim().length > 0;

                const active = index === activeStep;

                return (
                  <button
                    key={step.key}
                    onClick={() =>
                      setActiveStep(index)
                    }
                    className={`rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-blue-300 bg-blue-50"
                        : completed
                        ? "border-emerald-200 bg-emerald-50/60"
                        : "border-slate-200 bg-slate-50 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">
                        {step.code}
                      </span>

                      {completed ? (
                        <span className="text-xs font-bold text-emerald-600">
                          ✓
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">
                          ○
                        </span>
                      )}
                    </div>

                    <div className="mt-2 text-xs font-semibold leading-4 text-slate-800">
                      {step.title}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-blue-600">
                      {steps[activeStep].code}
                    </div>

                    <h2 className="mt-1 text-lg font-bold text-slate-900">
                      {steps[activeStep].title}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {steps[activeStep].description}
                    </p>
                  </div>

                  <div className="hidden rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 md:block">
                    Adım {activeStep + 1} / 8
                  </div>
                </div>
              </div>

              <div
                className="relative z-[9999] p-6"
                style={{
                  position: "relative",
                  zIndex: 9999,
                  pointerEvents: "auto",
                }}
              >
                {renderStepContent()}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  disabled={activeStep === 0}
                  onClick={() =>
                    setActiveStep((value) =>
                      Math.max(0, value - 1)
                    )
                  }
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Önceki Adım
                </button>

                <button
                  disabled={
                    activeStep === steps.length - 1
                  }
                  onClick={() =>
                    setActiveStep((value) =>
                      Math.min(
                        steps.length - 1,
                        value + 1
                      )
                    )
                  }
                  className="rounded-lg bg-[#0c1c32] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sonraki Adım →
                </button>
              </div>
            </div>

            <div className="min-w-0 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900">
                  Şikayet Bilgileri
                </h3>

                <div className="mt-4 space-y-4">
                  <InfoRow label="Şikayet No" value={complaint.complaint_no} />
                  <InfoRow label="Müşteri" value={complaint.customer} />
                  <InfoRow label="Konu" value={complaint.subject} />
                  <InfoRow
                    label="Şikayet Tarihi"
                    value={formatDate(complaint.complaint_date)}
                  />
                  <InfoRow
                    label="Proje"
                    value={complaint.project_code || "-"}
                  />
                  <InfoRow
                    label="Proses"
                    value={complaint.product_process || "-"}
                  />
                  <InfoRow
                    label="Sorumlu"
                    value={complaint.responsible || "-"}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900">
                  8D Durumu
                </h3>

                <div className="mt-4 space-y-3">
                  <select
                    value={eightD.status}
                    onChange={(e) =>
                      updateEightDField(
                        "status",
                        e.currentTarget.value
                      )
                    }
                    style={{
                      position: "relative",
                      zIndex: 9999,
                      pointerEvents: "auto",
                    }}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  >
                    <option value="Taslak">Taslak</option>
                    <option value="Devam Ediyor">
                      Devam Ediyor
                    </option>
                    <option value="Tamamlandı">
                      Tamamlandı
                    </option>
                    <option value="İptal">İptal</option>
                  </select>

                  <button
                    onClick={() =>
                      updateComplaintStatus(
                        complaint.status === "Kapalı"
                          ? "Açık"
                          : "Kapalı"
                      )
                    }
                    className={`w-full rounded-lg border px-4 py-2.5 text-sm font-semibold ${
                      complaint.status === "Kapalı"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {complaint.status === "Kapalı"
                      ? "Şikayeti Aç"
                      : "Şikayeti Kapat"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-bold text-slate-900">
                      Aksiyon Yönetimi
                    </h2>

                    {overdueActionCount > 0 && (
                      <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
                        {overdueActionCount} gecikmiş
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    Düzeltici faaliyetleri, sorumluları,
                    terminleri ve etkinlik kontrollerini
                    takip edin.
                  </p>
                </div>

                <button
                  onClick={openNewAction}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  + Yeni Aksiyon
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-slate-100 md:grid-cols-5">
              <MiniStat label="Toplam" value={actions.length} />
              <MiniStat label="Açık" value={openActionCount} />
              <MiniStat
                label="Geciken"
                value={overdueActionCount}
                danger={overdueActionCount > 0}
              />
              <MiniStat
                label="Tamamlanan"
                value={completedActionCount}
              />
              <MiniStat
                label="Etkinlik Kontrolü"
                value={effectivenessCompletedCount}
              />
            </div>

            {showActionForm && (
              <div className="border-b border-slate-100 bg-slate-50/70 p-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {actionForm.id
                          ? "Aksiyonu Düzenle"
                          : "Yeni Aksiyon"}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Aksiyonun sorumlusu, termin tarihi
                        ve etkinlik kontrolünü
                        tanımlayabilirsiniz.
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        setShowActionForm(false)
                      }
                      className="text-sm font-semibold text-slate-400 hover:text-slate-700"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <InputField
                      label="Aksiyon No"
                      type="number"
                      value={String(actionForm.action_no)}
                      onChange={(value) =>
                        setActionForm((prev) => ({
                          ...prev,
                          action_no: Number(value),
                        }))
                      }
                    />

                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Aksiyon Tipi
                      </label>

                      <select
                        value={actionForm.action_type}
                        onChange={(e) =>
                          setActionForm((prev) => ({
                            ...prev,
                            action_type:
                              e.currentTarget.value,
                          }))
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                      >
                        <option value="Düzeltici Faaliyet">
                          Düzeltici Faaliyet
                        </option>
                        <option value="Önleyici Faaliyet">
                          Önleyici Faaliyet
                        </option>
                        <option value="Acil Önlem">
                          Acil Önlem
                        </option>
                        <option value="Kontrol">
                          Kontrol
                        </option>
                        <option value="Diğer">Diğer</option>
                      </select>
                    </div>

                    <InputField
                      label="Sorumlu"
                      value={actionForm.responsible}
                      onChange={(value) =>
                        setActionForm((prev) => ({
                          ...prev,
                          responsible: value,
                        }))
                      }
                    />

                    <InputField
                      label="Termin Tarihi"
                      type="date"
                      value={actionForm.target_date}
                      onChange={(value) =>
                        setActionForm((prev) => ({
                          ...prev,
                          target_date: value,
                        }))
                      }
                    />
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Aksiyon Açıklaması
                    </label>

                    <textarea
                      value={actionForm.action_description}
                      onChange={(e) =>
                        setActionForm((prev) => ({
                          ...prev,
                          action_description:
                            e.currentTarget.value,
                        }))
                      }
                      placeholder="Yapılacak faaliyeti açık ve ölçülebilir şekilde yazınız."
                      className="min-h-[120px] w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Durum
                      </label>

                      <select
                        value={actionForm.status}
                        onChange={(e) =>
                          setActionForm((prev) => ({
                            ...prev,
                            status: e.currentTarget.value,
                          }))
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                      >
                        <option value="Açık">Açık</option>
                        <option value="Devam Ediyor">
                          Devam Ediyor
                        </option>
                        <option value="Tamamlandı">
                          Tamamlandı
                        </option>
                        <option value="İptal">İptal</option>
                      </select>
                    </div>

                    <InputField
                      label="Tamamlanma Tarihi"
                      type="date"
                      value={actionForm.completion_date}
                      onChange={(value) =>
                        setActionForm((prev) => ({
                          ...prev,
                          completion_date: value,
                        }))
                      }
                    />

                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Etkinlik Kontrolü
                      </label>

                      <select
                        value={
                          actionForm.effectiveness_check
                        }
                        onChange={(e) =>
                          setActionForm((prev) => ({
                            ...prev,
                            effectiveness_check:
                              e.currentTarget.value,
                          }))
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                      >
                        <option value="">
                          Seçilmedi
                        </option>
                        <option value="Yapılmadı">
                          Yapılmadı
                        </option>
                        <option value="Yapıldı - Etkili">
                          Yapıldı - Etkili
                        </option>
                        <option value="Yapıldı - Etkisiz">
                          Yapıldı - Etkisiz
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Etkinlik Sonucu / Kanıt
                    </label>

                    <textarea
                      value={
                        actionForm.effectiveness_result
                      }
                      onChange={(e) =>
                        setActionForm((prev) => ({
                          ...prev,
                          effectiveness_result:
                            e.currentTarget.value,
                        }))
                      }
                      placeholder="Faaliyetin etkili olduğunu gösteren kontrol, ölçüm veya kanıtı yazınız."
                      className="min-h-[100px] w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>

                  <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <button
                      onClick={() =>
                        setShowActionForm(false)
                      }
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
                    >
                      Vazgeç
                    </button>

                    <button
                      onClick={saveAction}
                      disabled={actionSaving}
                      className="rounded-lg bg-[#0c1c32] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {actionSaving
                        ? "Kaydediliyor..."
                        : "Aksiyonu Kaydet"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                {[
                  "Tümü",
                  "Açık",
                  "Devam Ediyor",
                  "Tamamlandı",
                  "Geciken",
                  "İptal",
                ].map((filter) => (
                  <button
                    key={filter}
                    onClick={() =>
                      setActionFilter(filter)
                    }
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                      actionFilter === filter
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <div className="text-xs text-slate-400">
                {filteredActions.length} aksiyon
                gösteriliyor
              </div>
            </div>

            <div className="overflow-x-auto">
              {filteredActions.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-400">
                    ✓
                  </div>

                  <div className="mt-3 text-sm font-semibold text-slate-700">
                    Bu filtrede aksiyon bulunmuyor.
                  </div>

                  <p className="mt-1 text-xs text-slate-400">
                    Yeni aksiyon eklemek için
                    yukarıdaki butonu kullanabilirsiniz.
                  </p>
                </div>
              ) : (
                <table className="w-full min-w-[1050px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        No
                      </th>
                      <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Aksiyon
                      </th>
                      <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Sorumlu
                      </th>
                      <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Termin
                      </th>
                      <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Durum
                      </th>
                      <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Etkinlik
                      </th>
                      <th className="px-6 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        İşlem
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredActions.map((action) => {
                      const overdue =
                        isActionOverdue(action);

                      const completed =
                        isActionCompleted(action);

                      const effectiveness =
                        action.effectiveness_check ||
                        action.effectiveness_result;

                      return (
                        <tr
                          key={action.id}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                        >
                          <td className="px-6 py-4 align-top">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
                              {action.action_no}
                            </span>
                          </td>

                          <td className="max-w-[420px] px-4 py-4 align-top">
                            <div className="text-sm font-semibold text-slate-800">
                              {action.action_description}
                            </div>

                            <div className="mt-1 text-xs text-slate-400">
                              {action.action_type}
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top text-sm text-slate-600">
                            {action.responsible || "-"}
                          </td>

                          <td className="px-4 py-4 align-top">
                            <div
                              className={`text-sm font-semibold ${
                                overdue
                                  ? "text-red-700"
                                  : "text-slate-700"
                              }`}
                            >
                              {formatDate(action.target_date)}
                            </div>

                            {overdue && (
                              <div className="mt-1 text-[11px] font-bold text-red-600">
                                Gecikti
                              </div>
                            )}

                            {completed &&
                              action.completion_date && (
                                <div className="mt-1 text-[11px] text-emerald-600">
                                  Tamamlandı:{" "}
                                  {formatDate(
                                    action.completion_date
                                  )}
                                </div>
                              )}
                          </td>

                          <td className="px-4 py-4 align-top">
                            {overdue ? (
                              <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                                Gecikti
                              </span>
                            ) : (
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                                  action.status
                                )}`}
                              >
                                {action.status}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4 align-top">
                            {effectiveness ? (
                              <div>
                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                    action.effectiveness_check ===
                                    "Yapıldı - Etkili"
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : action.effectiveness_check ===
                                        "Yapıldı - Etkisiz"
                                      ? "border-red-200 bg-red-50 text-red-700"
                                      : "border-slate-200 bg-slate-50 text-slate-600"
                                  }`}
                                >
                                  {action.effectiveness_check ||
                                    "Kontrol Girildi"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">
                                Bekliyor
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4 align-top">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() =>
                                  editAction(action)
                                }
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                              >
                                Düzenle
                              </button>

                              <button
                                onClick={() =>
                                  deleteAction(action)
                                }
                                className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
                              >
                                Sil
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {actions.length > 0 && (
              <div className="border-t border-slate-100 px-6 py-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-800">
                      Aksiyon Tamamlama Oranı
                    </div>

                    <div className="mt-1 text-xs text-slate-400">
                      {completedActionCount} /{" "}
                      {actions.length} aksiyon
                      tamamlandı.
                    </div>
                  </div>

                  <div className="text-lg font-bold text-slate-900">
                    {actionProgressPercent}%
                  </div>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{
                      width: `${actionProgressPercent}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function FieldLabel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="text-sm font-bold text-slate-900">
        {title}
      </div>

      <div className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(e.currentTarget.value)
        }
        style={{
          position: "relative",
          zIndex: 9999,
          pointerEvents: "auto",
          userSelect: "text",
          WebkitUserSelect: "text",
          cursor: "text",
        }}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
      />
    </div>
  );
}

function InfoBox({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-700">
      {children}
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-1 break-words text-sm font-semibold text-slate-700">
        {value}
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  detail,
  icon,
  danger = false,
}: {
  title: string;
  value: string;
  detail: string;
  icon: string;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm ${
        danger
          ? "border-red-200"
          : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-400">
            {title}
          </div>

          <div
            className={`mt-2 text-2xl font-bold ${
              danger
                ? "text-red-700"
                : "text-slate-900"
            }`}
          >
            {value}
          </div>
        </div>

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold ${
            danger
              ? "bg-red-50 text-red-600"
              : "bg-blue-50 text-blue-600"
          }`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-2 text-xs text-slate-400">
        {detail}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="bg-white px-5 py-4">
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div
        className={`mt-1 text-xl font-bold ${
          danger
            ? "text-red-700"
            : "text-slate-800"
        }`}
      >
        {value}
      </div>
    </div>
  );
}