"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "./components/AppShell";
import { supabase } from "./lib/supabase";

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
};

type Action = {
  id: number;
  complaint_id: number;
  action_no: number;
  action_description: string;
  responsible: string | null;
  target_date: string | null;
  completion_date: string | null;
  status: string;
  effectiveness_check: string | null;
  effectiveness_result: string | null;
};

const todayIso = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

const formatDate = (date: string | null) => {
  if (!date) return "-";

  const d = new Date(date);

  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getStatusClass = (status: string) => {
  switch (status) {
    case "Açık":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "Devam Ediyor":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Kapandı":
    case "Kapanan":
    case "Tamamlandı":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
};

const getPriorityClass = (priority: string) => {
  switch (priority) {
    case "Yüksek":
      return "bg-red-50 text-red-700 border-red-200";
    case "Orta":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Düşük":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
};

const isActionOverdue = (action: Action) => {
  if (!action.target_date) return false;
  if (action.status === "Tamamlandı" || action.status === "İptal") return false;

  return action.target_date < todayIso();
};

const isActionCompleted = (action: Action) => {
  return (
    action.status === "Tamamlandı" ||
    Boolean(action.completion_date)
  );
};

export default function DashboardPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      const [complaintsResult, actionsResult] = await Promise.all([
        supabase
          .from("complaints")
          .select(
            "id, complaint_no, customer, subject, complaint_date, status, priority, project_code, product_process, responsible"
          )
          .order("complaint_date", { ascending: false }),

        supabase
          .from("complaint_8d_actions")
          .select(
            "id, complaint_id, action_no, action_description, responsible, target_date, completion_date, status, effectiveness_check, effectiveness_result"
          )
          .order("target_date", { ascending: true }),
      ]);

      if (complaintsResult.error) {
        setError(
          `Şikayet verileri alınamadı: ${complaintsResult.error.message}`
        );
      } else {
        setComplaints((complaintsResult.data || []) as Complaint[]);
      }

      if (actionsResult.error) {
        setError(
          `8D aksiyon verileri alınamadı: ${actionsResult.error.message}`
        );
      } else {
        setActions((actionsResult.data || []) as Action[]);
      }

      setLoading(false);
    };

    loadDashboard();
  }, []);

  const statistics = useMemo(() => {
    const total = complaints.length;

    const open = complaints.filter(
      (item) => item.status === "Açık"
    ).length;

    const ongoing = complaints.filter(
      (item) =>
        item.status === "Devam Ediyor" ||
        item.status === "Devam ediyor"
    ).length;

    const closed = complaints.filter(
      (item) =>
        item.status === "Kapandı" ||
        item.status === "Kapanan" ||
        item.status === "Tamamlandı"
    ).length;

    const overdueActions = actions.filter(isActionOverdue).length;

    const completedActions = actions.filter(isActionCompleted).length;

    const actionProgress =
      actions.length > 0
        ? Math.round((completedActions / actions.length) * 100)
        : 0;

    return {
      total,
      open,
      ongoing,
      closed,
      overdueActions,
      completedActions,
      actionProgress,
    };
  }, [complaints, actions]);

  const statusData = useMemo(() => {
    const statuses = [
      { name: "Açık", color: "bg-blue-500" },
      { name: "Devam Ediyor", color: "bg-amber-500" },
      { name: "Kapandı", color: "bg-emerald-500" },
    ];

    return statuses.map((item) => {
      const count = complaints.filter((x) => {
        if (item.name === "Kapandı") {
          return (
            x.status === "Kapandı" ||
            x.status === "Kapanan" ||
            x.status === "Tamamlandı"
          );
        }

        return x.status === item.name;
      }).length;

      const percentage =
        complaints.length > 0
          ? Math.round((count / complaints.length) * 100)
          : 0;

      return {
        ...item,
        count,
        percentage,
      };
    });
  }, [complaints]);

  const priorityData = useMemo(() => {
    return [
      {
        name: "Yüksek",
        count: complaints.filter((x) => x.priority === "Yüksek").length,
        color: "bg-red-500",
      },
      {
        name: "Orta",
        count: complaints.filter((x) => x.priority === "Orta").length,
        color: "bg-amber-500",
      },
      {
        name: "Düşük",
        count: complaints.filter((x) => x.priority === "Düşük").length,
        color: "bg-emerald-500",
      },
    ];
  }, [complaints]);

  const monthlyData = useMemo(() => {
    const now = new Date();

    const months = Array.from({ length: 6 }).map((_, index) => {
      const d = new Date(
        now.getFullYear(),
        now.getMonth() - (5 - index),
        1
      );

      return {
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleDateString("tr-TR", {
          month: "short",
        }),
      };
    });

    return months.map((month) => {
      const count = complaints.filter((complaint) => {
        const date = new Date(complaint.complaint_date);

        return (
          date.getFullYear() === month.year &&
          date.getMonth() === month.month
        );
      }).length;

      return {
        ...month,
        count,
      };
    });
  }, [complaints]);

  const maxMonthlyValue = Math.max(
    ...monthlyData.map((item) => item.count),
    1
  );

  const recentComplaints = complaints.slice(0, 6);

  const importantActions = useMemo(() => {
    return actions
      .filter(
        (action) =>
          isActionOverdue(action) ||
          (
            action.target_date &&
            !isActionCompleted(action)
          )
      )
      .slice(0, 6);
  }, [actions]);

  if (loading) {
    return (
      <AppShell>
        <div className="min-h-[calc(100vh-70px)] bg-[#f6f8fb] px-8 py-7">
          <div className="flex min-h-[500px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#1769ff]" />
              <p className="text-sm font-medium text-slate-500">
                Dashboard verileri yükleniyor...
              </p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="box-border w-full min-w-0 max-w-full overflow-x-hidden bg-[#f6f8fb] px-8 py-7">
        <div className="w-full min-w-0 max-w-full space-y-6">

          {/* HEADER */}
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#1769ff]">
                Kalite Yönetim Sistemi
              </p>

              <h1 className="text-2xl font-bold tracking-tight text-[#0c1c32]">
                Kalite Dashboard
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Şikayet, 8D ve düzeltici faaliyetlerin genel durumu
              </p>
            </div>

            <div className="flex gap-3">
              <Link
                href="/sikayetler/yeni"
                className="inline-flex items-center gap-2 rounded-lg bg-[#1769ff] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f58dc]"
              >
                <span className="text-lg leading-none">+</span>
                Yeni Şikayet
              </Link>

              <Link
                href="/sikayetler"
                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Tüm Şikayetler
              </Link>
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* KPI CARDS */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">

            <DashboardCard
              title="Toplam Şikayet"
              value={statistics.total}
              subtitle="Sistemdeki toplam kayıt"
              icon="▦"
              iconClass="bg-blue-50 text-blue-600"
            />

            <DashboardCard
              title="Açık"
              value={statistics.open}
              subtitle="İşlem bekleyen"
              icon="!"
              iconClass="bg-red-50 text-red-600"
            />

            <DashboardCard
              title="Devam Eden"
              value={statistics.ongoing}
              subtitle="Aktif çalışmalar"
              icon="↻"
              iconClass="bg-amber-50 text-amber-600"
            />

            <DashboardCard
              title="Kapanan"
              value={statistics.closed}
              subtitle="Tamamlanan kayıtlar"
              icon="✓"
              iconClass="bg-emerald-50 text-emerald-600"
            />

            <DashboardCard
              title="Geciken Aksiyon"
              value={statistics.overdueActions}
              subtitle="Termin aşılmış"
              icon="!"
              iconClass="bg-red-50 text-red-600"
              danger={statistics.overdueActions > 0}
            />

          </div>

          {/* MAIN GRID */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">

            {/* MONTHLY CHART */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#0c1c32]">
                    Aylık Şikayet Trendi
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Son 6 aya ait şikayet kayıtları
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                  Son 6 Ay
                </div>
              </div>

              <div className="flex h-[245px] items-end gap-4 border-b border-l border-slate-100 px-4 pb-0 pt-5">
                {monthlyData.map((item) => {
                  const height =
                    item.count === 0
                      ? 4
                      : Math.max(
                          12,
                          Math.round(
                            (item.count / maxMonthlyValue) * 190
                          )
                        );

                  return (
                    <div
                      key={`${item.year}-${item.month}`}
                      className="flex h-full flex-1 flex-col items-center justify-end"
                    >
                      <span className="mb-2 text-xs font-semibold text-slate-600">
                        {item.count}
                      </span>

                      <div
                        className="w-full max-w-[52px] rounded-t-lg bg-[#1769ff] transition-all hover:bg-[#0f58dc]"
                        style={{ height }}
                        title={`${item.count} şikayet`}
                      />

                      <span className="mt-3 text-[11px] font-medium capitalize text-slate-400">
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* STATUS */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-6">
                <h2 className="text-base font-bold text-[#0c1c32]">
                  Şikayet Durumu
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Mevcut kayıtların dağılımı
                </p>
              </div>

              <div className="space-y-5">
                {statusData.map((item) => (
                  <div key={item.name}>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${item.color}`}
                        />

                        <span className="text-sm font-medium text-slate-700">
                          {item.name}
                        </span>
                      </div>

                      <span className="text-sm font-bold text-[#0c1c32]">
                        {item.count}
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${item.color}`}
                        style={{
                          width: `${item.percentage}%`,
                        }}
                      />
                    </div>

                    <div className="mt-1 text-right text-[11px] text-slate-400">
                      %{item.percentage}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* SECOND GRID */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">

            {/* RECENT COMPLAINTS */}
            <section className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-base font-bold text-[#0c1c32]">
                    Son Şikayetler
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Sisteme en son girilen kayıtlar
                  </p>
                </div>

                <Link
                  href="/sikayetler"
                  className="text-xs font-semibold text-[#1769ff] hover:underline"
                >
                  Tümünü Gör →
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        No
                      </th>

                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Müşteri
                      </th>

                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Konu
                      </th>

                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Tarih
                      </th>

                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Durum
                      </th>

                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Öncelik
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentComplaints.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-12 text-center text-sm text-slate-400"
                        >
                          Henüz şikayet kaydı bulunmuyor.
                        </td>
                      </tr>
                    ) : (
                      recentComplaints.map((complaint) => (
                        <tr
                          key={complaint.id}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                        >
                          <td className="px-5 py-4">
                            <Link
                              href={`/sikayetler/${encodeURIComponent(
                                complaint.complaint_no
                              )}`}
                              className="text-sm font-bold text-[#1769ff] hover:underline"
                            >
                              {complaint.complaint_no}
                            </Link>
                          </td>

                          <td className="px-5 py-4">
                            <div className="text-sm font-semibold text-slate-700">
                              {complaint.customer}
                            </div>
                          </td>

                          <td className="max-w-[270px] px-5 py-4">
                            <div className="truncate text-sm font-medium text-slate-700">
                              {complaint.subject}
                            </div>

                            {complaint.project_code && (
                              <div className="mt-1 text-[11px] text-slate-400">
                                {complaint.project_code}
                              </div>
                            )}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                            {formatDate(complaint.complaint_date)}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                                complaint.status
                              )}`}
                            >
                              {complaint.status}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getPriorityClass(
                                complaint.priority
                              )}`}
                            >
                              {complaint.priority}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* PRIORITY */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-6">
                <h2 className="text-base font-bold text-[#0c1c32]">
                  Öncelik Dağılımı
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Şikayetlerin öncelik seviyeleri
                </p>
              </div>

              <div className="space-y-5">
                {priorityData.map((item) => {
                  const percentage =
                    complaints.length > 0
                      ? Math.round(
                          (item.count / complaints.length) * 100
                        )
                      : 0;

                  return (
                    <div key={item.name}>
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${item.color}`}
                          />

                          <span className="text-sm font-medium text-slate-700">
                            {item.name}
                          </span>
                        </div>

                        <span className="text-sm font-bold text-[#0c1c32]">
                          {item.count}
                        </span>
                      </div>

                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${item.color}`}
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-7 border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    8D Aksiyon İlerlemesi
                  </span>

                  <span className="text-sm font-bold text-[#0c1c32]">
                    %{statistics.actionProgress}
                  </span>
                </div>

                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#1769ff]"
                    style={{
                      width: `${statistics.actionProgress}%`,
                    }}
                  />
                </div>

                <p className="mt-2 text-[11px] text-slate-400">
                  {statistics.completedActions} / {actions.length} aksiyon tamamlandı
                </p>
              </div>
            </section>
          </div>

          {/* ACTIONS */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-base font-bold text-[#0c1c32]">
                  Takip Edilmesi Gereken 8D Aksiyonları
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Açık ve gecikmiş aksiyonlar
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600">
                  {statistics.overdueActions} gecikmiş
                </span>

                <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600">
                  {actions.length - statistics.completedActions} açık
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Aksiyon
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Sorumlu
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Termin
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Durum
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Etkinlik
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      İşlem
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {importantActions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-12 text-center"
                      >
                        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                          ✓
                        </div>

                        <p className="text-sm font-semibold text-slate-700">
                          Takip edilmesi gereken aksiyon yok
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Açık veya gecikmiş 8D aksiyonu bulunmuyor.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    importantActions.map((action) => {
                      const overdue = isActionOverdue(action);

                      return (
                        <tr
                          key={action.id}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                        >
                          <td className="max-w-[420px] px-5 py-4">
                            <div className="flex items-start gap-3">
                              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                                D{action.action_no}
                              </span>

                              <div>
                                <p className="text-sm font-semibold text-slate-700">
                                  {action.action_description}
                                </p>

                                {overdue && (
                                  <p className="mt-1 text-xs font-semibold text-red-600">
                                    Termin tarihi aşılmış durumda
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {action.responsible || "-"}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <span
                              className={`text-sm font-semibold ${
                                overdue
                                  ? "text-red-600"
                                  : "text-slate-600"
                              }`}
                            >
                              {formatDate(action.target_date)}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                overdue
                                  ? "border-red-200 bg-red-50 text-red-700"
                                  : "border-amber-200 bg-amber-50 text-amber-700"
                              }`}
                            >
                              {overdue ? "Gecikti" : action.status}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span className="text-xs text-slate-500">
                              {action.effectiveness_check || "Kontrol bekliyor"}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <Link
                              href={`/sikayetler/${encodeURIComponent(
                                complaints.find(
                                  (x) => x.id === action.complaint_id
                                )?.complaint_no || ""
                              )}/8d`}
                              className="text-xs font-semibold text-[#1769ff] hover:underline"
                            >
                              8D'yi Aç →
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* FOOTER INFO */}
          <div className="flex flex-col justify-between gap-2 pb-4 text-[11px] text-slate-400 sm:flex-row">
            <span>
              ISOTEC Enerji A.Ş. • Kalite Yönetim Sistemi
            </span>

            <span>
              Veriler Supabase üzerinden anlık olarak alınmaktadır.
            </span>
          </div>

        </div>
      </div>
    </AppShell>
  );
}

function DashboardCard({
  title,
  value,
  subtitle,
  icon,
  iconClass,
  danger = false,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: string;
  iconClass: string;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        danger
          ? "border-red-200"
          : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500">
            {title}
          </p>

          <p
            className={`mt-2 text-3xl font-bold tracking-tight ${
              danger ? "text-red-600" : "text-[#0c1c32]"
            }`}
          >
            {value}
          </p>

          <p className="mt-1 text-[11px] text-slate-400">
            {subtitle}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}