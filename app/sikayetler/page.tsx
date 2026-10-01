"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import AppShell from "@/app/components/AppShell";

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
  company_id: number;
};

type UserProfile = {
  role: string | null;
  company_id: number | null;
};

const STATUS_OPTIONS = [
  "Tümü",
  "Açık",
  "Araştırılıyor",
  "İnceleniyor",
  "Aksiyon Bekliyor",
  "Kapatıldı",
];

const PRIORITY_OPTIONS = [
  "Tümü",
  "Düşük",
  "Orta",
  "Yüksek",
  "Kritik",
];

function statusClass(status: string) {
  switch (status) {
    case "Kapatıldı":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "İnceleniyor":
    case "Araştırılıyor":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "Aksiyon Bekliyor":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "Açık":
      return "bg-red-50 text-red-700 border-red-200";

    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function priorityClass(priority: string) {
  switch (priority) {
    case "Kritik":
      return "bg-red-50 text-red-700 border-red-200";

    case "Yüksek":
      return "bg-orange-50 text-orange-700 border-orange-200";

    case "Orta":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "Düşük":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function formatDate(date: string | null) {
  if (!date) return "-";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("tr-TR");
}

function escapeCsv(value: string) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export default function SikayetlerPage() {
  const router = useRouter();

  /*
   * ÖNEMLİ:
   * Login sayfasıyla AYNI Supabase client kullanılıyor.
   */
  const supabase = createClient();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tümü");
  const [priorityFilter, setPriorityFilter] = useState("Tümü");
  const [customerFilter, setCustomerFilter] = useState("Tümü");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [profile, setProfile] = useState<UserProfile>({
    role: null,
    company_id: null,
  });

  const [roleLoading, setRoleLoading] = useState(true);

  const canCreateComplaint =
    profile.role === "Yönetici" ||
    profile.role === "Kalite Sorumlusu" ||
    profile.role === "Kalite Kontrol";

  /*
   * KULLANICI + PROFİL
   */
  async function loadProfile() {
    try {
      setRoleLoading(true);
      setError("");

      /*
       * Login ile aynı client üzerinden session alıyoruz.
       */
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          "Supabase session hatası:",
          sessionError
        );

        setProfile({
          role: null,
          company_id: null,
        });

        setRoleLoading(false);

        setError(
          `Oturum bilgisi alınamadı: ${sessionError.message}`
        );

        return null;
      }

      if (!session?.user) {
        console.error(
          "Aktif Supabase session bulunamadı."
        );

        setProfile({
          role: null,
          company_id: null,
        });

        setRoleLoading(false);

        setError(
          "Aktif kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın."
        );

        return null;
      }

      const userId = session.user.id;

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("role, company_id")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error(
          "Profil bilgisi alınamadı:",
          profileError
        );

        setProfile({
          role: null,
          company_id: null,
        });

        setRoleLoading(false);

        setError(
          `Kullanıcı profili alınamadı: ${profileError.message}`
        );

        return null;
      }

      const loadedProfile: UserProfile = {
        role: profileData?.role ?? null,
        company_id:
          profileData?.company_id !== null &&
          profileData?.company_id !== undefined
            ? Number(profileData.company_id)
            : null,
      };

      setProfile(loadedProfile);
      setRoleLoading(false);

      return loadedProfile;
    } catch (err: any) {
      console.error(
        "Profil yükleme hatası:",
        err
      );

      setProfile({
        role: null,
        company_id: null,
      });

      setRoleLoading(false);

      setError(
        err?.message ||
          "Kullanıcı bilgileri yüklenirken hata oluştu."
      );

      return null;
    }
  }

  /*
   * ŞİKAYETLERİ YÜKLE
   */
  async function loadComplaints(
    companyId: number | null,
    showLoading = true
  ) {
    if (showLoading) {
      setLoading(true);
    }

    if (!companyId) {
      setComplaints([]);
      setLoading(false);

      setError(
        "Firma bilgisi bulunamadı."
      );

      return;
    }

    try {
      const {
        data,
        error: complaintsError,
      } = await supabase
        .from("complaints")
        .select("*")
        .eq("company_id", companyId)
        .order("complaint_date", {
          ascending: false,
        });

      if (complaintsError) {
        console.error(
          "Şikayet kayıtları alınamadı:",
          complaintsError
        );

        setComplaints([]);

        setError(
          `Şikayet kayıtları yüklenemedi: ${complaintsError.message}`
        );

        return;
      }

      setComplaints(
        (data || []) as Complaint[]
      );

      setError("");
    } catch (err: any) {
      console.error(
        "Şikayet yükleme hatası:",
        err
      );

      setComplaints([]);

      setError(
        err?.message ||
          "Şikayet kayıtları yüklenirken hata oluştu."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * İLK YÜKLEME
   */
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      const loadedProfile =
        await loadProfile();

      if (!mounted) return;

      if (loadedProfile?.company_id) {
        await loadComplaints(
          loadedProfile.company_id,
          true
        );
      } else {
        setLoading(false);
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * FİRMA DEĞİŞİNCE KAYITLARI YENİLE
   */
  useEffect(() => {
    if (!profile.company_id) {
      return;
    }

    loadComplaints(
      profile.company_id,
      false
    );
  }, [profile.company_id]);

  /*
   * SAYFA ODAKLANDIĞINDA YENİLE
   */
  useEffect(() => {
    if (!profile.company_id) {
      return;
    }

    function handleFocus() {
      loadComplaints(
        profile.company_id,
        false
      );
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        loadComplaints(
          profile.company_id,
          false
        );
      }
    }

    const interval =
      window.setInterval(() => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          loadComplaints(
            profile.company_id,
            false
          );
        }
      }, 10000);

    window.addEventListener(
      "focus",
      handleFocus
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      window.clearInterval(interval);
    };
  }, [profile.company_id]);

  async function refreshComplaints() {
    if (!profile.company_id) {
      setError(
        "Firma bilgisi bulunamadı."
      );
      return;
    }

    await loadComplaints(
      profile.company_id,
      false
    );
  }

  const customers = useMemo(() => {
    const values = complaints
      .map((item) => item.customer)
      .filter(Boolean);

    return [
      "Tümü",
      ...Array.from(
        new Set(values)
      ).sort(),
    ];
  }, [complaints]);

  const filteredComplaints =
    useMemo(() => {
      const query = search
        .trim()
        .toLocaleLowerCase(
          "tr-TR"
        );

      return complaints.filter(
        (item) => {
          const searchableText = [
            item.complaint_no,
            item.customer,
            item.subject,
            item.project_code || "",
            item.product_process || "",
            item.responsible || "",
          ]
            .join(" ")
            .toLocaleLowerCase(
              "tr-TR"
            );

          const matchesSearch =
            !query ||
            searchableText.includes(
              query
            );

          const matchesStatus =
            statusFilter === "Tümü" ||
            item.status ===
              statusFilter;

          const matchesPriority =
            priorityFilter === "Tümü" ||
            item.priority ===
              priorityFilter;

          const matchesCustomer =
            customerFilter === "Tümü" ||
            item.customer ===
              customerFilter;

          const matchesStartDate =
            !startDate ||
            item.complaint_date >=
              startDate;

          const matchesEndDate =
            !endDate ||
            item.complaint_date <=
              endDate;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesPriority &&
            matchesCustomer &&
            matchesStartDate &&
            matchesEndDate
          );
        }
      );
    }, [
      complaints,
      search,
      statusFilter,
      priorityFilter,
      customerFilter,
      startDate,
      endDate,
    ]);

  const statistics =
    useMemo(() => {
      const investigationStatuses = [
        "Araştırılıyor",
        "İnceleniyor",
      ];

      return {
        total: complaints.length,

        open: complaints.filter(
          (x) =>
            x.status === "Açık"
        ).length,

        investigation:
          complaints.filter(
            (x) =>
              investigationStatuses.includes(
                x.status
              )
          ).length,

        action: complaints.filter(
          (x) =>
            x.status ===
            "Aksiyon Bekliyor"
        ).length,

        closed: complaints.filter(
          (x) =>
            x.status ===
            "Kapatıldı"
        ).length,

        critical:
          complaints.filter(
            (x) =>
              x.priority ===
              "Kritik"
          ).length,

        high: complaints.filter(
          (x) =>
            x.priority ===
            "Yüksek"
        ).length,
      };
    }, [complaints]);

  const statusDistribution =
    useMemo(() => {
      const total =
        complaints.length || 1;

      return [
        {
          label: "Açık",
          count: statistics.open,
          percent: Math.round(
            (statistics.open /
              total) *
              100
          ),
          className:
            "bg-red-500",
        },
        {
          label:
            "Araştırılıyor / İnceleniyor",
          count:
            statistics.investigation,
          percent: Math.round(
            (statistics.investigation /
              total) *
              100
          ),
          className:
            "bg-blue-500",
        },
        {
          label:
            "Aksiyon Bekliyor",
          count:
            statistics.action,
          percent: Math.round(
            (statistics.action /
              total) *
              100
          ),
          className:
            "bg-amber-500",
        },
        {
          label: "Kapatıldı",
          count:
            statistics.closed,
          percent: Math.round(
            (statistics.closed /
              total) *
              100
          ),
          className:
            "bg-emerald-500",
        },
      ];
    }, [
      complaints,
      statistics,
    ]);

  function clearFilters() {
    setSearch("");
    setStatusFilter("Tümü");
    setPriorityFilter("Tümü");
    setCustomerFilter("Tümü");
    setStartDate("");
    setEndDate("");
  }

  function exportCsv() {
    const headers = [
      "Şikayet No",
      "Müşteri",
      "Konu",
      "Şikayet Tarihi",
      "Durum",
      "Öncelik",
      "Proje Kodu",
      "Ürün / Proses",
      "Sorumlu",
    ];

    const rows =
      filteredComplaints.map(
        (item) => [
          item.complaint_no,
          item.customer,
          item.subject,
          formatDate(
            item.complaint_date
          ),
          item.status,
          item.priority,
          item.project_code ||
            "",
          item.product_process ||
            "",
          item.responsible ||
            "",
        ]
      );

    const csv = [
      headers
        .map(escapeCsv)
        .join(";"),
      ...rows.map((row) =>
        row
          .map(escapeCsv)
          .join(";")
      ),
    ].join("\n");

    const blob = new Blob(
      ["\ufeff" + csv],
      {
        type:
          "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement(
        "a"
      );

    link.href = url;

    link.download =
      `isotec-sikayetler-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <div className="box-border w-full min-w-0 max-w-full overflow-x-hidden px-8 py-6">
        <div className="w-full min-w-0 max-w-full space-y-6">

          {/* HEADER */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                Kalite Yönetim Sistemi
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Müşteri Şikayetleri
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Müşteri kaynaklı kalite şikayetlerini takip edin,
                yönetin ve analiz edin.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">

              <button
                onClick={exportCsv}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <span className="text-base">
                  ↓
                </span>
                Dışa Aktar
              </button>

              {!roleLoading &&
                canCreateComplaint && (
                  <button
                    onClick={() =>
                      router.push(
                        "/sikayetler/yeni"
                      )
                    }
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1264d8] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0d56bb]"
                  >
                    <span className="text-lg leading-none">
                      +
                    </span>
                    Yeni Şikayet
                  </button>
                )}
            </div>
          </div>

          {/* KPI */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Toplam Şikayet
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {statistics.total}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  #
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-400">
                Sistemde kayıtlı tüm şikayetler
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Açık Şikayetler
                  </p>

                  <p className="mt-2 text-3xl font-bold text-red-600">
                    {statistics.open}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  !
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-400">
                Henüz kapatılmamış kayıtlar
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Aksiyon Bekleyen
                  </p>

                  <p className="mt-2 text-3xl font-bold text-amber-600">
                    {statistics.action}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  ↗
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-400">
                Düzeltici faaliyet gerektiren kayıtlar
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Kapatılan
                  </p>

                  <p className="mt-2 text-3xl font-bold text-emerald-600">
                    {statistics.closed}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  ✓
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-400">
                Tamamlanmış şikayetler
              </p>
            </div>

          </div>

          {/* FILTERS */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Şikayet Filtreleri
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Kayıtları istediğiniz kriterlere göre filtreleyin.
                  </p>
                </div>

                <button
                  onClick={clearFilters}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Filtreleri Temizle
                </button>

              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-6">

              <div className="xl:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Arama
                </label>

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                  placeholder="No, müşteri, konu, proje..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Durum
                </label>

                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value
                    )
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:bg-white"
                >
                  {STATUS_OPTIONS.map(
                    (item) => (
                      <option
                        key={item}
                      >
                        {item}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Öncelik
                </label>

                <select
                  value={priorityFilter}
                  onChange={(e) =>
                    setPriorityFilter(
                      e.target.value
                    )
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:bg-white"
                >
                  {PRIORITY_OPTIONS.map(
                    (item) => (
                      <option
                        key={item}
                      >
                        {item}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Müşteri
                </label>

                <select
                  value={customerFilter}
                  onChange={(e) =>
                    setCustomerFilter(
                      e.target.value
                    )
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:bg-white"
                >
                  {customers.map(
                    (item) => (
                      <option
                        key={item}
                      >
                        {item}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Başlangıç
                </label>

                <input
                  type="date"
                  value={startDate}
                  onChange={(e) =>
                    setStartDate(
                      e.target.value
                    )
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Bitiş
                </label>

                <input
                  type="date"
                  value={endDate}
                  onChange={(e) =>
                    setEndDate(
                      e.target.value
                    )
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:bg-white"
                />
              </div>

            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
              <span className="text-xs text-slate-500">
                Filtrelenen kayıt:
              </span>

              <span className="ml-1 text-xs font-bold text-slate-800">
                {filteredComplaints.length}
              </span>
            </div>

          </div>

          {/* MAIN */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">

            {/* TABLE */}
            <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Şikayet Kayıtları
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Güncel müşteri şikayetleri
                  </p>
                </div>

                <button
                  onClick={
                    refreshComplaints
                  }
                  className="self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  ↻ Yenile
                </button>

              </div>

              {error && (
                <div className="m-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="flex min-h-[300px] items-center justify-center">
                  <div className="text-sm text-slate-500">
                    Şikayet kayıtları yükleniyor...
                  </div>
                </div>
              ) : filteredComplaints.length ===
                0 ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center px-5 text-center">

                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-400">
                    ?
                  </div>

                  <h3 className="text-sm font-bold text-slate-800">
                    Kayıt bulunamadı
                  </h3>

                  <p className="mt-1 max-w-sm text-xs text-slate-400">
                    Seçtiğiniz filtrelere uygun şikayet kaydı bulunmuyor.
                  </p>

                </div>
              ) : (
                <div className="w-full overflow-x-auto">

                  <table className="w-full min-w-[900px] border-collapse">

                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">

                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                          Şikayet
                        </th>

                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                          Müşteri
                        </th>

                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                          Konu
                        </th>

                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                          Tarih
                        </th>

                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                          Öncelik
                        </th>

                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                          Durum
                        </th>

                        <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                          İşlem
                        </th>

                      </tr>
                    </thead>

                    <tbody>

                      {filteredComplaints.map(
                        (item) => (
                          <tr
                            key={item.id}
                            onClick={() =>
                              router.push(
                                `/sikayetler/${encodeURIComponent(
                                  item.complaint_no
                                )}`
                              )
                            }
                            className="cursor-pointer border-b border-slate-100 transition hover:bg-blue-50/40"
                          >

                            <td className="px-5 py-4">

                              <div className="text-sm font-bold text-blue-600">
                                {item.complaint_no}
                              </div>

                              {item.project_code && (
                                <div className="mt-1 text-xs text-slate-400">
                                  {item.project_code}
                                </div>
                              )}

                            </td>

                            <td className="px-5 py-4">

                              <div className="max-w-[180px] truncate text-sm font-semibold text-slate-800">
                                {item.customer}
                              </div>

                            </td>

                            <td className="px-5 py-4">

                              <div className="max-w-[260px]">

                                <div className="truncate text-sm font-semibold text-slate-800">
                                  {item.subject}
                                </div>

                                {item.product_process && (
                                  <div className="mt-1 truncate text-xs text-slate-400">
                                    {item.product_process}
                                  </div>
                                )}

                              </div>

                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                              {formatDate(
                                item.complaint_date
                              )}
                            </td>

                            <td className="px-5 py-4">

                              <span
                                className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-bold ${priorityClass(
                                  item.priority
                                )}`}
                              >
                                {item.priority}
                              </span>

                            </td>

                            <td className="px-5 py-4">

                              <span
                                className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-bold ${statusClass(
                                  item.status
                                )}`}
                              >
                                {item.status}
                              </span>

                            </td>

                            <td className="px-5 py-4 text-right">

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();

                                  router.push(
                                    `/sikayetler/${encodeURIComponent(
                                      item.complaint_no
                                    )}`
                                  );
                                }}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                              >
                                Detay
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

            {/* RIGHT SUMMARY */}
            <div className="space-y-5">

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

                <div className="mb-5">

                  <h2 className="text-sm font-bold text-slate-900">
                    Durum Dağılımı
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    Tüm şikayetlerin mevcut durumu
                  </p>

                </div>

                <div className="space-y-5">

                  {statusDistribution.map(
                    (item) => (
                      <div
                        key={item.label}
                      >

                        <div className="mb-2 flex items-center justify-between">

                          <div className="flex items-center gap-2">

                            <span
                              className={`h-2.5 w-2.5 rounded-full ${item.className}`}
                            />

                            <span className="text-xs font-semibold text-slate-600">
                              {item.label}
                            </span>

                          </div>

                          <div className="text-xs font-bold text-slate-800">
                            {item.count}
                          </div>

                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                          <div
                            className={`h-full rounded-full ${item.className}`}
                            style={{
                              width: `${item.percent}%`,
                            }}
                          />

                        </div>

                        <div className="mt-1 text-right text-[10px] text-slate-400">
                          %{item.percent}
                        </div>

                      </div>
                    )
                  )}

                </div>

              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

                <h2 className="text-sm font-bold text-slate-900">
                  Öncelik Özeti
                </h2>

                <div className="mt-4 space-y-3">

                  <div className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 px-3 py-2.5">
                    <span className="text-xs font-semibold text-red-700">
                      Kritik
                    </span>

                    <span className="text-sm font-bold text-red-700">
                      {statistics.critical}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-orange-100 bg-orange-50 px-3 py-2.5">
                    <span className="text-xs font-semibold text-orange-700">
                      Yüksek
                    </span>

                    <span className="text-sm font-bold text-orange-700">
                      {statistics.high}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <span className="text-xs font-semibold text-slate-600">
                      Diğer
                    </span>

                    <span className="text-sm font-bold text-slate-700">
                      {Math.max(
                        0,
                        statistics.total -
                          statistics.critical -
                          statistics.high
                      )}
                    </span>
                  </div>

                </div>

              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">

                <div className="flex items-start gap-3">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
                    i
                  </div>

                  <div>

                    <h3 className="text-sm font-bold text-blue-900">
                      Şikayet Yönetimi
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-blue-700">
                      Bir şikayet kaydına girerek 8D çalışmasını,
                      fotoğrafları, dokümanları ve aksiyonları
                      yönetebilirsiniz.
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>
      </div>
    </AppShell>
  );
}