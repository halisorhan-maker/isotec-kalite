"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Gauge,
  Plus,
  Search,
} from "lucide-react";

import AppShell from "@/app/components/AppShell";
import { createClient } from "@/app/lib/supabase/client";

type Calibration = {
  id: number;
  device_name: string;
  serial_no: string | null;
  last_calibration_date: string | null;
  next_calibration_date: string | null;
  status: string;
};

export default function Kalibrasyon() {
  const supabase = createClient();

  const [calibrations, setCalibrations] = useState<Calibration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tümü");

  useEffect(() => {
    const getCalibrations = async () => {
      setLoading(true);

      try {
        // Önce mevcut oturumu browser client üzerinden doğrula.
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error(
            "KALİBRASYON OTURUM KONTROLÜ HATASI:",
            sessionError
          );

          setCalibrations([]);
          setLoading(false);
          return;
        }

        if (!session?.user) {
          console.error(
            "Aktif kullanıcı oturumu bulunamadı."
          );

          setCalibrations([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("calibrations")
          .select("*")
          .order("id", { ascending: false });

        if (error) {
          console.error(
            "KALİBRASYONLAR YÜKLENEMEDİ:",
            error
          );

          setCalibrations([]);
          setLoading(false);
          return;
        }

        setCalibrations(
          (data || []) as Calibration[]
        );
      } catch (error) {
        console.error(
          "KALİBRASYON YÜKLEME HATASI:",
          error
        );

        setCalibrations([]);
      } finally {
        setLoading(false);
      }
    };

    getCalibrations();
  }, [supabase]);

  const totalCount = calibrations.length;

  const validCount = calibrations.filter(
    (item) => item.status === "Geçerli"
  ).length;

  const upcomingCount = calibrations.filter(
    (item) => item.status === "Yaklaşıyor"
  ).length;

  const expiredCount = calibrations.filter(
    (item) => item.status === "Süresi Geçmiş"
  ).length;

  const filteredCalibrations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return calibrations.filter((item) => {
      const matchesSearch =
        !query ||
        item.device_name?.toLowerCase().includes(query) ||
        item.serial_no?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "Tümü" ||
        item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [calibrations, search, statusFilter]);

  return (
    <AppShell>
      <div className="box-border w-full min-w-0 max-w-full overflow-x-hidden px-8 py-6">
        <div className="mx-auto w-full max-w-[1500px] space-y-6">

          {/* HEADER */}
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                <Gauge
                  size={16}
                  className="text-blue-600"
                />
                Kalite Yönetimi
                <span className="text-slate-300">
                  /
                </span>
                Kalibrasyon
              </div>

              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Kalibrasyon Yönetimi
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Ölçüm cihazları ve kalibrasyon durumlarının merkezi takibi
              </p>
            </div>

            <Link
              href="/kalibrasyon/yeni"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0c1c32] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#142a47]"
            >
              <Plus size={18} />
              Yeni Cihaz
            </Link>
          </div>

          {/* KPI KARTLARI */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Toplam Cihaz"
              value={String(totalCount)}
              description="Kayıtlı ölçüm cihazı"
              icon={<Gauge size={20} />}
              iconClass="bg-blue-50 text-blue-600"
            />

            <KpiCard
              title="Geçerli"
              value={String(validCount)}
              description="Kalibrasyonu geçerli"
              icon={<CheckCircle2 size={20} />}
              iconClass="bg-emerald-50 text-emerald-600"
            />

            <KpiCard
              title="Yaklaşan"
              value={String(upcomingCount)}
              description="30 gün içinde"
              icon={<Clock3 size={20} />}
              iconClass="bg-amber-50 text-amber-600"
            />

            <KpiCard
              title="Süresi Geçmiş"
              value={String(expiredCount)}
              description="Acil işlem gerekli"
              icon={<AlertTriangle size={20} />}
              iconClass="bg-red-50 text-red-600"
            />
          </div>

          {/* ANA TABLO */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            {/* TABLO BAŞLIK */}
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Kalibrasyon Takibi
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Cihazların güncel kalibrasyon durumları ve yaklaşan işlemler
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative">
                    <Search
                      size={17}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      value={search}
                      onChange={(e) =>
                        setSearch(e.target.value)
                      }
                      placeholder="Cihaz veya seri no ara..."
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-[250px]"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(e.target.value)
                    }
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="Tümü">
                      Tüm Durumlar
                    </option>
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
                </div>
              </div>
            </div>

            {/* ÖZET ŞERİDİ */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-6 py-3">
              <FilterChip
                label="Tümü"
                count={totalCount}
                active={statusFilter === "Tümü"}
                onClick={() =>
                  setStatusFilter("Tümü")
                }
              />

              <FilterChip
                label="Geçerli"
                count={validCount}
                active={statusFilter === "Geçerli"}
                onClick={() =>
                  setStatusFilter("Geçerli")
                }
              />

              <FilterChip
                label="Yaklaşıyor"
                count={upcomingCount}
                active={statusFilter === "Yaklaşıyor"}
                onClick={() =>
                  setStatusFilter("Yaklaşıyor")
                }
              />

              <FilterChip
                label="Süresi Geçmiş"
                count={expiredCount}
                active={
                  statusFilter === "Süresi Geçmiş"
                }
                onClick={() =>
                  setStatusFilter("Süresi Geçmiş")
                }
              />

              <div className="ml-auto text-xs text-slate-400">
                {filteredCalibrations.length} cihaz gösteriliyor
              </div>
            </div>

            {/* TABLO */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-white text-left">
                    <th className={thStyle}>
                      Cihaz
                    </th>

                    <th className={thStyle}>
                      Seri No
                    </th>

                    <th className={thStyle}>
                      Son Kalibrasyon
                    </th>

                    <th className={thStyle}>
                      Sonraki Kalibrasyon
                    </th>

                    <th className={thStyle}>
                      Kalan Gün
                    </th>

                    <th className={thStyle}>
                      Durum
                    </th>

                    <th
                      className={`${thStyle} text-right`}
                    >
                      İşlem
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-16 text-center text-sm text-slate-500"
                      >
                        Cihazlar yükleniyor...
                      </td>
                    </tr>
                  ) : filteredCalibrations.length ===
                    0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-16 text-center"
                      >
                        <div className="mx-auto flex max-w-sm flex-col items-center">
                          <div className="mb-3 rounded-2xl bg-slate-100 p-4 text-slate-400">
                            <Gauge size={25} />
                          </div>

                          <p className="text-sm font-semibold text-slate-700">
                            Cihaz bulunamadı
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Arama veya durum filtresini değiştirerek tekrar
                            deneyin.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCalibrations.map(
                      (calibration) => (
                        <CalibrationRow
                          key={calibration.id}
                          calibration={calibration}
                        />
                      )
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function KpiCard({
  title,
  value,
  description,
  icon,
  iconClass,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {title}
          </div>

          <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {value}
          </div>

          <div className="mt-1 text-xs text-slate-400">
            {description}
          </div>
        </div>

        <div
          className={`rounded-xl p-2.5 ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "bg-blue-600 text-white"
          : "bg-white text-slate-500 hover:bg-slate-100"
      }`}
    >
      {label}

      <span
        className={`ml-1.5 ${
          active
            ? "text-blue-100"
            : "text-slate-400"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function CalibrationRow({
  calibration,
}: {
  calibration: Calibration;
}) {
  const days = getRemainingDays(
    calibration.next_calibration_date
  );

  return (
    <tr className="group border-b border-slate-100 transition hover:bg-blue-50/40">
      <td className={tdStyle}>
        <Link
          href={`/kalibrasyon/${calibration.id}`}
          className="group/device inline-flex items-center gap-2"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition group-hover:bg-blue-100 group-hover:text-blue-600">
            <Gauge size={17} />
          </div>

          <div>
            <div className="font-semibold text-slate-800 transition group-hover:text-blue-700">
              {calibration.device_name}
            </div>

            <div className="mt-0.5 text-xs text-slate-400">
              Cihaz detayını görüntüle
            </div>
          </div>
        </Link>
      </td>

      <td className={tdStyle}>
        <span className="font-medium text-slate-600">
          {calibration.serial_no || "-"}
        </span>
      </td>

      <td className={tdStyle}>
        {formatDate(
          calibration.last_calibration_date
        )}
      </td>

      <td className={tdStyle}>
        {formatDate(
          calibration.next_calibration_date
        )}
      </td>

      <td className={tdStyle}>
        <span
          className={`font-semibold ${
            days === null
              ? "text-slate-400"
              : days < 0
              ? "text-red-600"
              : days <= 30
              ? "text-amber-600"
              : "text-slate-700"
          }`}
        >
          {days === null ? "-" : days}
        </span>
      </td>

      <td className={tdStyle}>
        <StatusBadge
          status={calibration.status}
        />
      </td>

      <td
        className={`${tdStyle} text-right`}
      >
        <Link
          href={`/kalibrasyon/${calibration.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        >
          Detay
          <ArrowUpRight size={14} />
        </Link>
      </td>
    </tr>
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

      {status}
    </span>
  );
}

function getRemainingDays(
  date: string | null
) {
  if (!date) return null;

  const target = new Date(date);
  const today = new Date();

  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return Math.ceil(
    (target.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

function formatDate(
  value: string | null
) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("tr-TR");
}

const thStyle =
  "px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400";

const tdStyle =
  "px-5 py-4 text-sm text-slate-600";