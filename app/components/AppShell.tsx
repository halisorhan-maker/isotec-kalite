"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState } from "react";
import { createClient } from "@/app/lib/supabase/client";

type IconName =
  | "message"
  | "plus"
  | "clock"
  | "search"
  | "pause"
  | "check"
  | "alert"
  | "refresh"
  | "pie"
  | "dashboard"
  | "calibration"
  | "warning"
  | "activity"
  | "report"
  | "settings"
  | "bell"
  | "user"
  | "menu"
  | "logout";

export function Icon({
  name,
  size = 18,
}: {
  name: IconName;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );

    case "message":
      return (
        <svg {...common}>
          <path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.5 8.5 0 0 1-3.5-.8L4 20l1.8-4A7.5 7.5 0 1 1 20 11.5Z" />
        </svg>
      );

    case "calibration":
      return (
        <svg {...common}>
          <path d="M4 20V10" />
          <path d="M10 20V4" />
          <path d="M16 20v-7" />
          <path d="M22 20V7" />
          <path d="M2 20h21" />
        </svg>
      );

    case "warning":
      return (
        <svg {...common}>
          <path d="M10.3 4.2 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );

    case "activity":
      return (
        <svg {...common}>
          <path d="M3 12h4l2.2-6 4.1 12 2.2-6H21" />
        </svg>
      );

    case "report":
      return (
        <svg {...common}>
          <path d="M5 20V10" />
          <path d="M12 20V4" />
          <path d="M19 20v-7" />
        </svg>
      );

    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20h-2.6v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.5-1H6v-2.6h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1L9 6.6l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V5h2.6v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1V14h-.1a1.7 1.7 0 0 0-1.1 1Z" />
        </svg>
      );

    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 5 5" />
        </svg>
      );

    case "bell":
      return (
        <svg {...common}>
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );

    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      );

    case "logout":
      return (
        <svg {...common}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      );

    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case "alert":
      return (
        <svg {...common}>
          <path d="M12 3 2.8 19h18.4L12 3Z" />
          <path d="M12 9v4" />
          <path d="M12 16h.01" />
        </svg>
      );

    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case "pause":
      return (
        <svg {...common}>
          <path d="M9 5v14" />
          <path d="M15 5v14" />
        </svg>
      );

    case "refresh":
      return (
        <svg {...common}>
          <path d="M20 11a8 8 0 0 0-14-5l-2 2" />
          <path d="M4 4v4h4" />
          <path d="M4 13a8 8 0 0 0 14 5l2-2" />
          <path d="M20 20v-4h-4" />
        </svg>
      );

    case "pie":
      return (
        <svg {...common}>
          <path d="M12 3v9h9" />
          <path d="M19.1 15A8 8 0 1 1 9 4.9" />
        </svg>
      );

    default:
      return null;
  }
}

const menuItems = [
  {
    label: "Dashboard",
    href: "/",
    icon: "dashboard" as IconName,
  },
  {
    label: "Şikayetler",
    href: "/sikayetler",
    icon: "message" as IconName,
  },
  {
    label: "Kalibrasyon",
    href: "/kalibrasyon",
    icon: "calibration" as IconName,
  },
  {
    label: "Uygunsuzluklar",
    href: "/uygunsuzluklar",
    icon: "warning" as IconName,
  },
  {
    label: "Düzeltici Faaliyetler",
    href: "/duzeltici-faaliyetler",
    icon: "activity" as IconName,
  },
  {
    label: "Raporlar",
    href: "/raporlar",
    icon: "report" as IconName,
  },
  {
    label: "Ayarlar",
    href: "/ayarlar",
    icon: "settings" as IconName,
  },
];

export default function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    const supabase = createClient();

    await supabase.auth.signOut();

    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="relative min-h-screen w-full min-w-0 overflow-x-hidden bg-[#f4f6f9] text-slate-900">

      {/* SIDEBAR */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-[245px] shrink-0 flex-col bg-[#0c1c32] text-white">

        {/* LOGO */}
        <div className="flex h-[82px] shrink-0 items-center border-b border-white/[0.07] px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-[18px] font-black">
              I
            </div>

            <div>
              <div className="text-[19px] font-bold tracking-wide">
                ISOTEC
              </div>

              <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
                Kalite Yönetim Sistemi
              </div>
            </div>
          </div>
        </div>

        {/* MENÜ */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-7">
          <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
            Ana Menü
          </div>

          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex h-[48px] items-center gap-3 rounded-xl px-4 text-[14px] font-semibold transition ${
                    active
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-950/20"
                      : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <span
                    className={
                      active
                        ? "text-white"
                        : "text-slate-500 group-hover:text-slate-300"
                    }
                  >
                    <Icon name={item.icon} size={19} />
                  </span>

                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ALT BİLGİ */}
        <div className="shrink-0 border-t border-white/[0.07] p-5">
          <div className="rounded-xl bg-white/[0.045] p-4">
            <div className="flex items-center gap-3">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </div>

              <div>
                <div className="text-[12px] font-semibold text-white">
                  Sistem Aktif
                </div>

                <div className="mt-0.5 text-[10px] text-slate-500">
                  Tüm servisler çalışıyor
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between px-1 text-[10px] text-slate-600">
            <span>ISOTEC KYS</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </aside>

      {/* ANA ALAN */}
      <div className="relative z-50 ml-[245px] min-h-screen w-[calc(100%_-_245px)] min-w-0 overflow-x-hidden">

        {/* TOPBAR */}
        <header className="sticky top-0 z-[200] flex h-[68px] w-full min-w-0 items-center justify-between border-b border-slate-200 bg-white/95 px-8 backdrop-blur">

          <div className="relative min-w-0 w-[390px] max-w-[45%]">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Icon name="search" size={18} />
            </div>

            <input
              placeholder="Sistemde ara..."
              className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-[13px] outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
            />

            <div className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 lg:flex">
              CTRL K
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-5">

            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <Icon name="bell" size={19} />

              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-blue-600" />
            </button>

            <div className="h-7 w-px bg-slate-200" />

            {/* KULLANICI ALANI */}
            <div className="relative z-[300]">

              <button
                type="button"
                onClick={() => setShowUserMenu((prev) => !prev)}
                className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-slate-50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#10243f] text-[12px] font-bold text-white">
                  HA
                </div>

                <div className="hidden text-left sm:block">
                  <div className="text-[12px] font-bold text-slate-800">
                    Halis Ahmet Orhan
                  </div>

                  <div className="mt-0.5 text-[10px] text-slate-400">
                    Kalite Mühendisi
                  </div>
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-[52px] z-[9999] w-[230px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">

                  <div className="border-b border-slate-100 px-4 py-3">
                    <div className="text-[12px] font-bold text-slate-800">
                      Halis Ahmet Orhan
                    </div>

                    <div className="mt-1 text-[10px] text-slate-400">
                      Kalite Mühendisi
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-[12px] font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Icon name="logout" size={17} />

                    <span>
                      {loggingOut ? "Çıkış yapılıyor..." : "Çıkış Yap"}
                    </span>
                  </button>

                </div>
              )}

            </div>

          </div>
        </header>

        {/* SAYFA İÇERİĞİ */}
        <main className="relative z-10 w-full min-w-0 max-w-full overflow-x-hidden pointer-events-auto">
          <div className="relative z-10 w-full pointer-events-auto">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}