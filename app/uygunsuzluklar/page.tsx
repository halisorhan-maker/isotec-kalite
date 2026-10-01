"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Filter,
  Plus,
  Search,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import AppShell from "../components/AppShell";
import { supabase } from "../lib/supabase";

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

const statusOptions = [
  "Tümü",
  "Açık",
  "İnceleniyor",
  "Aksiyon Bekliyor",
  "Doğrulama",
  "Kapatıldı",
];

const priorityOptions = ["Tümü", "Düşük", "Orta", "Yüksek", "Kritik"];

function formatDate(date: string | null) {
  if (!date) return "-";

  return new Date(`${date}T00:00:00`).toLocaleDateString("tr-TR");
}

function isOverdue(item: Nonconformity) {
  if (!item.target_date || item.status === "Kapatıldı") return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(`${item.target_date}T00:00:00`);

  return target < today;
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

export default function UygunsuzluklarPage() {
  const [items, setItems] = useState<Nonconformity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tümü");
  const [priorityFilter, setPriorityFilter] = useState("Tümü");

  async function loadNonconformities() {
    setLoading(true);
    setError("");

    const { data, error: queryError } = await supabase
      .from("nonconformities")
      .select("*")
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(`Uygunsuzluklar yüklenemedi: ${queryError.message}`);
      setItems([]);
      setLoading(false);
      return;
    }

    setItems((data ?? []) as Nonconformity[]);
    setLoading(false);
  }

  useEffect(() => {
    loadNonconformities();
  }, []);

  const filteredItems = useMemo(() => {
    const searchText = search.trim().toLocaleLowerCase("tr-TR");

    return items.filter((item) => {
      const matchesSearch =
        !searchText ||
        [
          item.nonconformity_no,
          item.customer,
          item.project_code,
          item.product_process,
          item.subject,
          item.description,
          item.responsible,
          item.source,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLocaleLowerCase("tr-TR").includes(searchText)
          );

      const matchesStatus =
        statusFilter === "Tümü" || item.status === statusFilter;

      const matchesPriority =
        priorityFilter === "Tümü" || item.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [items, search, statusFilter, priorityFilter]);

  const totalCount = items.length;

  const openCount = items.filter(
    (item) => item.status !== "Kapatıldı"
  ).length;

  const criticalCount = items.filter(
    (item) => item.priority === "Kritik" && item.status !== "Kapatıldı"
  ).length;

  const overdueCount = items.filter(isOverdue).length;

  const closedCount = items.filter(
    (item) => item.status === "Kapatıldı"
  ).length;

  const statusCounts = {
    Açık: items.filter((item) => item.status === "Açık").length,
    İnceleniyor: items.filter((item) => item.status === "İnceleniyor").length,
    "Aksiyon Bekliyor": items.filter(
      (item) => item.status === "Aksiyon Bekliyor"
    ).length,
    Doğrulama: items.filter((item) => item.status === "Doğrulama").length,
    Kapatıldı: closedCount,
  };

  return (
    <AppShell>
      <div className="box-border w-full min-w-0 max-w-full overflow-x-hidden px-8 py-6">
        <div className="w-full min-w-0 max-w-full space-y-6">
          {/* HEADER */}
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-sm text-slate-500">
                <ShieldAlert className="h-4 w-4" />
                Kalite Yönetim Sistemi
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Uygunsuzluklar
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Kalite uygunsuzluklarını, aksiyonlarını ve kapanış durumlarını
                takip edin.
              </p>
            </div>

            <Link
              href="/uygunsuzluklar/yeni"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1769e0] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#125bc2]"
            >
              <Plus className="h-4 w-4" />
              Yeni Uygunsuzluk
            </Link>
          </div>

          {/* KPI */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Toplam
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {totalCount}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <ShieldAlert className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Açık / İşlemde
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {openCount}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Clock3 className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Kritik
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {criticalCount}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Geciken
                  </p>
                  <p className="mt-2 text-2xl font-bold text-red-600">
                    {overdueCount}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <XCircle className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Kapatılan
                  </p>
                  <p className="mt-2 text-2xl font-bold text-emerald-600">
                    {closedCount}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>

          {/* STATUS SUMMARY */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Durum Dağılımı
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Mevcut uygunsuzlukların durumlara göre dağılımı
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {Object.entries(statusCounts).map(([status, count]) => (
                <button
                  key={status}
                  type="button"
                  onClick={() =>
                    setStatusFilter(statusFilter === status ? "Tümü" : status)
                  }
                  className={`rounded-xl border p-4 text-left transition ${
                    statusFilter === status
                      ? "border-blue-300 bg-blue-50"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <p className="text-xs font-medium text-slate-500">
                    {status}
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {count}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* FILTERS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Uygunsuzluk no, müşteri, proje, ürün, konu..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "Tümü" ? "Tüm Durumlar" : option}
                    </option>
                  ))}
                </select>

                <select
                  value={priorityFilter}
                  onChange={(event) => setPriorityFilter(event.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  {priorityOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "Tümü" ? "Tüm Öncelikler" : option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Uygunsuzluk Kayıtları
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {filteredItems.length} kayıt gösteriliyor
                </p>
              </div>
            </div>

            {error ? (
              <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            ) : loading ? (
              <div className="px-5 py-16 text-center">
                <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
                <p className="mt-3 text-sm text-slate-500">
                  Uygunsuzluklar yükleniyor...
                </p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <ShieldAlert className="h-6 w-6" />
                </div>

                <h3 className="mt-4 text-base font-semibold text-slate-800">
                  Uygunsuzluk bulunamadı
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Arama veya filtre kriterlerinizi değiştirebilir ya da yeni
                  bir uygunsuzluk oluşturabilirsiniz.
                </p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[1100px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Uygunsuzluk
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Tarih
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Kaynak
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Proje / Ürün
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Konu
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Öncelik
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Durum
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Termin
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                        İşlem
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((item) => {
                      const overdue = isOverdue(item);

                      return (
                        <tr
                          key={item.id}
                          className="group transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <Link
                              href={`/uygunsuzluklar/${item.nonconformity_no}`}
                              className="font-bold text-blue-700 hover:text-blue-900"
                            >
                              {item.nonconformity_no}
                            </Link>

                            <p className="mt-1 max-w-[220px] truncate text-xs text-slate-500">
                              {item.customer || "Müşteri belirtilmemiş"}
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-700">
                            {formatDate(item.nonconformity_date)}
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                              {item.source}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <p className="max-w-[180px] truncate text-sm font-semibold text-slate-800">
                              {item.project_code || "-"}
                            </p>

                            <p className="mt-1 max-w-[180px] truncate text-xs text-slate-500">
                              {item.product_process || "-"}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="max-w-[240px] truncate text-sm font-semibold text-slate-800">
                              {item.subject}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-bold ${getPriorityClasses(
                                item.priority
                              )}`}
                            >
                              {item.priority}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex whitespace-nowrap rounded-lg border px-2.5 py-1 text-xs font-bold ${getStatusClasses(
                                item.status
                              )}`}
                            >
                              {item.status}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            {item.target_date ? (
                              <div
                                className={`flex items-center gap-1.5 text-sm font-medium ${
                                  overdue
                                    ? "text-red-600"
                                    : "text-slate-700"
                                }`}
                              >
                                <CalendarDays className="h-4 w-4" />
                                {formatDate(item.target_date)}
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400">
                                -
                              </span>
                            )}

                            {overdue && (
                              <p className="mt-1 text-[11px] font-bold text-red-600">
                                Gecikti
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <Link
                              href={`/uygunsuzluklar/${item.nonconformity_no}`}
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            >
                              Detay
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
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
      </div>
    </AppShell>
  );
}