"use client";

import { useEffect, useState } from "react";

import {
  Building2,
  Users,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  CalendarDays,
  CheckCircle2,
  UserCircle2,
  Loader2,
  Save,
  Pencil,
  X,
  UserPlus,
  KeyRound,
} from "lucide-react";

import { createClient } from "../lib/supabase/client";

type Company = {
  id: number;
  name: string;
  tax_number: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  plan: string;
  status: string;
  created_at: string;
};

type Profile = {
  id: string;
  company_id: number | null;
  full_name: string | null;
  email: string | null;
  role: string;
  is_active: boolean;
};

export default function AyarlarPage() {
  const supabase = createClient();

  const [company, setCompany] = useState<Company | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userSaving, setUserSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [companyForm, setCompanyForm] = useState({
    name: "",
    tax_number: "",
    email: "",
    phone: "",
    address: "",
  });

  const [editingUser, setEditingUser] = useState<Profile | null>(null);

  const [userForm, setUserForm] = useState({
    full_name: "",
    role: "İzleyici",
    is_active: true,
  });

  const [passwordForm, setPasswordForm] = useState({
    password: "",
    passwordConfirm: "",
  });

  /* DAVET MODALI */
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteSaving, setInviteSaving] = useState(false);

  const [inviteForm, setInviteForm] = useState({
    full_name: "",
    email: "",
    role: "İzleyici",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setMessage("");
    setErrorMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, company_id, full_name, email, role, is_active")
      .eq("id", user.id)
      .single();

    if (profileError || !profileData?.company_id) {
      setLoading(false);
      setErrorMessage("Kullanıcı şirket bilgisi bulunamadı.");
      return;
    }

    const { data: companyData, error: companyError } = await supabase
      .from("companies")
      .select("*")
      .eq("id", profileData.company_id)
      .single();

    if (companyError) {
      setLoading(false);
      setErrorMessage("Firma bilgileri yüklenemedi.");
      return;
    }

    const { data: usersData, error: usersError } = await supabase
      .from("profiles")
      .select(
        "id, company_id, full_name, email, role, is_active, created_at"
      )
      .eq("company_id", profileData.company_id)
      .order("created_at", { ascending: true });

    if (usersError) {
      setErrorMessage(`Kullanıcılar yüklenemedi: ${usersError.message}`);
    }

    setCompany(companyData);
    setProfiles(usersData || []);

    setCompanyForm({
      name: companyData.name || "",
      tax_number: companyData.tax_number || "",
      email: companyData.email || "",
      phone: companyData.phone || "",
      address: companyData.address || "",
    });

    setLoading(false);
  }

  async function saveCompany() {
    if (!company) return;

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("companies")
      .update({
        name: companyForm.name,
        tax_number: companyForm.tax_number || null,
        email: companyForm.email || null,
        phone: companyForm.phone || null,
        address: companyForm.address || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", company.id);

    if (error) {
      setErrorMessage(`Kaydetme hatası: ${error.message}`);
      setSaving(false);
      return;
    }

    setCompany({
      ...company,
      name: companyForm.name,
      tax_number: companyForm.tax_number || null,
      email: companyForm.email || null,
      phone: companyForm.phone || null,
      address: companyForm.address || null,
    });

    setMessage("Firma bilgileri başarıyla güncellendi.");
    setSaving(false);
  }

  function openUserEdit(profile: Profile) {
    setEditingUser(profile);

    setUserForm({
      full_name: profile.full_name || "",
      role: profile.role || "İzleyici",
      is_active: profile.is_active,
    });

    setPasswordForm({
      password: "",
      passwordConfirm: "",
    });

    setMessage("");
    setErrorMessage("");
  }

  function closeUserEdit() {
    if (userSaving || passwordSaving) return;

    setEditingUser(null);

    setUserForm({
      full_name: "",
      role: "İzleyici",
      is_active: true,
    });

    setPasswordForm({
      password: "",
      passwordConfirm: "",
    });
  }

  async function saveUser() {
    if (!editingUser) return;

    if (!userForm.full_name.trim()) {
      setErrorMessage("Kullanıcı adı boş bırakılamaz.");
      return;
    }

    setUserSaving(true);
    setMessage("");
    setErrorMessage("");

    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: userForm.full_name.trim(),
        role: userForm.role,
        is_active: userForm.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingUser.id)
      .select("id, company_id, full_name, email, role, is_active")
      .single();

    if (error) {
      setErrorMessage(`Kullanıcı güncellenemedi: ${error.message}`);
      setUserSaving(false);
      return;
    }

    setProfiles((current) =>
      current.map((profile) =>
        profile.id === editingUser.id ? data : profile
      )
    );

    setEditingUser(data);
    setMessage("Kullanıcı bilgileri başarıyla güncellendi.");
    setUserSaving(false);
  }

  async function saveUserPassword() {
    if (!editingUser) return;

    const password = passwordForm.password;
    const passwordConfirm = passwordForm.passwordConfirm;

    setMessage("");
    setErrorMessage("");

    if (!password) {
      setErrorMessage("Yeni şifre giriniz.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Şifre en az 8 karakter olmalıdır.");
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMessage("Girilen şifreler birbiriyle eşleşmiyor.");
      return;
    }

    setPasswordSaving(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        setErrorMessage(
          "Yönetici oturumu alınamadı. Lütfen tekrar giriş yapın."
        );
        setPasswordSaving(false);
        return;
      }

      const response = await fetch("/api/admin/users/set-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: editingUser.id,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setErrorMessage(
          result.error ||
            result.message ||
            "Kullanıcı şifresi güncellenemedi."
        );

        setPasswordSaving(false);
        return;
      }

      setPasswordForm({
        password: "",
        passwordConfirm: "",
      });

      setMessage(
        `${editingUser.full_name || editingUser.email || "Kullanıcı"} için yeni şifre başarıyla belirlendi.`
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        "Şifre güncellenirken beklenmeyen bir hata oluştu."
      );
    } finally {
      setPasswordSaving(false);
    }
  }

  function openInviteModal() {
    setInviteForm({
      full_name: "",
      email: "",
      role: "İzleyici",
    });

    setMessage("");
    setErrorMessage("");
    setInviteModalOpen(true);
  }

  function closeInviteModal() {
    if (inviteSaving) return;

    setInviteModalOpen(false);

    setInviteForm({
      full_name: "",
      email: "",
      role: "İzleyici",
    });
  }

  async function inviteUser() {
    const fullName = inviteForm.full_name.trim();
    const email = inviteForm.email.trim().toLowerCase();

    if (!fullName) {
      setErrorMessage("Ad Soyad zorunludur.");
      return;
    }

    if (!email) {
      setErrorMessage("E-posta adresi zorunludur.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setErrorMessage("Geçerli bir e-posta adresi giriniz.");
      return;
    }

    setInviteSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setErrorMessage(
          "Yönetici oturumu alınamadı. Lütfen tekrar giriş yapın."
        );
        setInviteSaving(false);
        return;
      }

      const response = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          role: inviteForm.role,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setErrorMessage(
          result.message || result.error || "Kullanıcı daveti gönderilemedi."
        );

        setInviteSaving(false);
        return;
      }

      setInviteModalOpen(false);

      setInviteForm({
        full_name: "",
        email: "",
        role: "İzleyici",
      });

      setMessage(
        result.message ||
          "Kullanıcı başarıyla davet edildi. Davet e-postası gönderildi."
      );

      await loadSettings();
    } catch (error) {
      console.error(error);

      setErrorMessage(
        "Kullanıcı daveti sırasında beklenmeyen bir hata oluştu."
      );
    } finally {
      setInviteSaving(false);
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("tr-TR");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb]">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2 className="animate-spin" size={20} />
          Ayarlar yükleniyor...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      {/* HEADER */}
      <div className="border-b border-slate-200 bg-white px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-1 text-xs font-medium text-slate-400">
              Sistem / Ayarlar
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[#10233f]">
              Firma Yönetimi
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Firma bilgilerinizi ve sistem kullanıcılarını yönetin.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
            <ShieldCheck size={18} className="text-emerald-600" />

            <div>
              <div className="text-xs font-semibold text-emerald-700">
                Yönetici Yetkisi
              </div>

              <div className="text-[11px] text-emerald-600">
                Firma yöneticisi
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="p-8">
        {/* MESAJ */}
        {message && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={17} />
              {message}
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        {/* KPI */}
        <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-xl bg-blue-50 p-3">
                <Building2 size={21} className="text-blue-600" />
              </div>

              <span className="text-xs font-medium text-slate-400">
                Firma
              </span>
            </div>

            <div className="text-lg font-bold text-[#10233f]">
              {company?.name || "-"}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Aktif firma hesabı
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-xl bg-violet-50 p-3">
                <Users size={21} className="text-violet-600" />
              </div>

              <span className="text-xs font-medium text-slate-400">
                Kullanıcılar
              </span>
            </div>

            <div className="text-2xl font-bold text-[#10233f]">
              {profiles.length}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Firmaya bağlı kullanıcı
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-xl bg-emerald-50 p-3">
                <CreditCard size={21} className="text-emerald-600" />
              </div>

              <span className="text-xs font-medium text-slate-400">
                Paket
              </span>
            </div>

            <div className="text-lg font-bold text-[#10233f]">
              {company?.plan || "-"}
            </div>

            <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
              <CheckCircle2 size={13} />
              {company?.status || "-"}
            </div>
          </div>
        </div>

        {/* ANA ALAN */}
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          {/* FIRMA */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-50 p-2.5">
                  <Building2 size={20} className="text-blue-600" />
                </div>

                <div>
                  <h2 className="font-bold text-[#10233f]">
                    Firma Bilgileri
                  </h2>

                  <p className="text-xs text-slate-500">
                    Sistem üzerinde kayıtlı firma bilgileri
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-semibold text-slate-600">
                  Firma Adı
                </label>

                <input
                  value={companyForm.name}
                  onChange={(e) =>
                    setCompanyForm({
                      ...companyForm,
                      name: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">
                  Vergi Numarası
                </label>

                <input
                  value={companyForm.tax_number}
                  onChange={(e) =>
                    setCompanyForm({
                      ...companyForm,
                      tax_number: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">
                  Telefon
                </label>

                <div className="relative">
                  <Phone
                    size={16}
                    className="absolute left-3 top-3.5 text-slate-400"
                  />

                  <input
                    value={companyForm.phone}
                    onChange={(e) =>
                      setCompanyForm({
                        ...companyForm,
                        phone: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-semibold text-slate-600">
                  E-posta
                </label>

                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3 top-3.5 text-slate-400"
                  />

                  <input
                    type="email"
                    value={companyForm.email}
                    onChange={(e) =>
                      setCompanyForm({
                        ...companyForm,
                        email: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-semibold text-slate-600">
                  Adres
                </label>

                <div className="relative">
                  <MapPin
                    size={16}
                    className="absolute left-3 top-3.5 text-slate-400"
                  />

                  <textarea
                    rows={3}
                    value={companyForm.address}
                    onChange={(e) =>
                      setCompanyForm({
                        ...companyForm,
                        address: e.target.value,
                      })
                    }
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
              <div className="text-xs text-slate-500">
                Firma kaydı:
                <span className="ml-1 font-semibold text-slate-700">
                  {company ? formatDate(company.created_at) : "-"}
                </span>
              </div>

              <button
                onClick={saveCompany}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-[#12345a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0d2948] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}

                {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
              </button>
            </div>
          </section>

          {/* HESAP */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-violet-50 p-2.5">
                  <ShieldCheck size={20} className="text-violet-600" />
                </div>

                <div>
                  <h2 className="font-bold text-[#10233f]">
                    Hesap Bilgileri
                  </h2>

                  <p className="text-xs text-slate-500">
                    SaaS hesap ve üyelik bilgileri
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Paket
                </div>

                <div className="text-lg font-bold text-[#10233f]">
                  {company?.plan || "-"}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Hesap Durumu
                </div>

                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {company?.status || "-"}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Oluşturulma Tarihi
                </div>

                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <CalendarDays size={16} />
                  {company ? formatDate(company.created_at) : "-"}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* KULLANICILAR */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-50 p-2.5">
                <Users size={20} className="text-emerald-600" />
              </div>

              <div>
                <h2 className="font-bold text-[#10233f]">
                  Firma Kullanıcıları
                </h2>

                <p className="text-xs text-slate-500">
                  Bu firmaya bağlı kullanıcı hesapları
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                {profiles.length} Kullanıcı
              </div>

              <button
                onClick={openInviteModal}
                className="flex items-center gap-2 rounded-xl bg-[#12345a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0d2948]"
              >
                <UserPlus size={16} />
                Kullanıcı Davet Et
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500">
                    Kullanıcı
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold text-slate-500">
                    E-posta
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold text-slate-500">
                    Rol
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold text-slate-500">
                    Durum
                  </th>

                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500">
                    İşlem
                  </th>
                </tr>
              </thead>

              <tbody>
                {profiles.map((profile) => (
                  <tr
                    key={profile.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-blue-50 p-2">
                          <UserCircle2
                            size={19}
                            className="text-blue-600"
                          />
                        </div>

                        <div>
                          <div className="text-sm font-semibold text-slate-700">
                            {profile.full_name || "İsimsiz Kullanıcı"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {profile.email || "-"}
                    </td>

                    <td className="px-6 py-4">
                      <span className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
                        {profile.role}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {profile.is_active ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          Pasif
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openUserEdit(profile)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Pencil size={14} />
                        Düzenle
                      </button>
                    </td>
                  </tr>
                ))}

                {profiles.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-10 text-center text-sm text-slate-400"
                    >
                      Firma kullanıcısı bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck size={15} className="text-slate-400" />
              Kullanıcı davetleri güvenli sunucu tarafı yetkilendirme yapısı
              üzerinden gönderilir.
            </div>
          </div>
        </section>
      </main>

      {/* KULLANICI DÜZENLEME MODALI */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-blue-50 p-2">
                    <UserCircle2
                      size={19}
                      className="text-blue-600"
                    />
                  </div>

                  <h3 className="font-bold text-[#10233f]">
                    Kullanıcı Düzenle
                  </h3>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Kullanıcı yetkilerini, hesap durumunu ve şifresini yönetin.
                </p>
              </div>

              <button
                onClick={closeUserEdit}
                disabled={userSaving || passwordSaving}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {/* E-POSTA */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">
                  E-posta
                </label>

                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  <Mail size={16} />
                  {editingUser.email || "-"}
                </div>

                <p className="mt-1.5 text-[11px] text-slate-400">
                  E-posta adresi bu ekrandan değiştirilemez.
                </p>
              </div>

              {/* AD SOYAD */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">
                  Ad Soyad
                </label>

                <input
                  value={userForm.full_name}
                  onChange={(e) =>
                    setUserForm({
                      ...userForm,
                      full_name: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Ad Soyad"
                />
              </div>

              {/* ROL */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">
                  Sistem Rolü
                </label>

                <select
                  value={userForm.role}
                  onChange={(e) =>
                    setUserForm({
                      ...userForm,
                      role: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="Yönetici">Yönetici</option>

                  <option value="Kalite Sorumlusu">
                    Kalite Sorumlusu
                  </option>

                  <option value="Kalite Kontrol">
                    Kalite Kontrol
                  </option>

                  <option value="Üretim">Üretim</option>

                  <option value="İzleyici">İzleyici</option>
                </select>
              </div>

              {/* KULLANICI DURUMU */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-700">
                      Kullanıcı Durumu
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      Pasif kullanıcı sisteme giriş yapamaz.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setUserForm({
                        ...userForm,
                        is_active: !userForm.is_active,
                      })
                    }
                    className={`relative h-7 w-12 rounded-full transition ${
                      userForm.is_active
                        ? "bg-emerald-500"
                        : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                        userForm.is_active ? "left-6" : "left-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="mt-3">
                  {userForm.is_active ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      Pasif
                    </span>
                  )}
                </div>
              </div>

              {/* ŞİFRE BELİRLEME */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="mb-4 flex items-start gap-3">
                  <div className="rounded-lg bg-white p-2 shadow-sm">
                    <KeyRound
                      size={18}
                      className="text-amber-600"
                    />
                  </div>

                  <div>
                    <div className="text-sm font-bold text-slate-700">
                      Kullanıcı Şifresi
                    </div>

                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      Bu kullanıcı için yeni bir giriş şifresi
                      belirleyebilirsiniz.
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-600">
                      Yeni Şifre
                    </label>

                    <input
                      type="password"
                      value={passwordForm.password}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          password: e.target.value,
                        })
                      }
                      placeholder="En az 8 karakter"
                      disabled={passwordSaving}
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-600">
                      Yeni Şifre Tekrar
                    </label>

                    <input
                      type="password"
                      value={passwordForm.passwordConfirm}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          passwordConfirm: e.target.value,
                        })
                      }
                      placeholder="Şifreyi tekrar girin"
                      disabled={passwordSaving}
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-100"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={saveUserPassword}
                    disabled={passwordSaving}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {passwordSaving ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <KeyRound size={16} />
                    )}

                    {passwordSaving
                      ? "Şifre Güncelleniyor..."
                      : "Yeni Şifreyi Belirle"}
                  </button>

                  <div className="text-[11px] leading-5 text-slate-500">
                    Şifre en az 8 karakter olmalıdır. Yeni şifre
                    belirlendiğinde kullanıcının mevcut şifresi
                    geçersiz hale gelir.
                  </div>
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                onClick={closeUserEdit}
                disabled={userSaving || passwordSaving}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Vazgeç
              </button>

              <button
                onClick={saveUser}
                disabled={userSaving || passwordSaving}
                className="flex items-center gap-2 rounded-xl bg-[#12345a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0d2948] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {userSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}

                {userSaving
                  ? "Kaydediliyor..."
                  : "Kullanıcıyı Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KULLANICI DAVET MODALI */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-emerald-50 p-2">
                    <UserPlus
                      size={19}
                      className="text-emerald-600"
                    />
                  </div>

                  <h3 className="font-bold text-[#10233f]">
                    Kullanıcı Davet Et
                  </h3>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Yeni kullanıcıya sisteme giriş yapabilmesi için
                  davet e-postası gönderilir.
                </p>
              </div>

              <button
                onClick={closeInviteModal}
                disabled={inviteSaving}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            {/* BODY */}
            <div className="space-y-5 p-6">
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">
                  Ad Soyad
                </label>

                <input
                  autoFocus
                  value={inviteForm.full_name}
                  onChange={(e) =>
                    setInviteForm({
                      ...inviteForm,
                      full_name: e.target.value,
                    })
                  }
                  placeholder="Örn. Ahmet Yılmaz"
                  disabled={inviteSaving}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">
                  E-posta Adresi
                </label>

                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3 top-3.5 text-slate-400"
                  />

                  <input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) =>
                      setInviteForm({
                        ...inviteForm,
                        email: e.target.value,
                      })
                    }
                    placeholder="ornek@firma.com"
                    disabled={inviteSaving}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  />
                </div>

                <p className="mt-1.5 text-[11px] text-slate-400">
                  Davet bağlantısı bu adrese gönderilecektir.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">
                  Sistem Rolü
                </label>

                <select
                  value={inviteForm.role}
                  onChange={(e) =>
                    setInviteForm({
                      ...inviteForm,
                      role: e.target.value,
                    })
                  }
                  disabled={inviteSaving}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                >
                  <option value="Yönetici">Yönetici</option>

                  <option value="Kalite Sorumlusu">
                    Kalite Sorumlusu
                  </option>

                  <option value="Kalite Kontrol">
                    Kalite Kontrol
                  </option>

                  <option value="Üretim">Üretim</option>

                  <option value="İzleyici">İzleyici</option>
                </select>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <div className="flex gap-3">
                  <ShieldCheck
                    size={18}
                    className="mt-0.5 shrink-0 text-blue-600"
                  />

                  <div>
                    <div className="text-xs font-semibold text-blue-800">
                      Güvenli davet sistemi
                    </div>

                    <div className="mt-1 text-[11px] leading-5 text-blue-700">
                      Kullanıcı doğrudan oluşturulmaz. Supabase
                      üzerinden güvenli davet e-postası gönderilir
                      ve kullanıcı bu bağlantı üzerinden hesabını
                      aktifleştirir.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                onClick={closeInviteModal}
                disabled={inviteSaving}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Vazgeç
              </button>

              <button
                onClick={inviteUser}
                disabled={inviteSaving}
                className="flex items-center gap-2 rounded-xl bg-[#12345a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0d2948] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {inviteSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <UserPlus size={16} />
                )}

                {inviteSaving
                  ? "Davet Gönderiliyor..."
                  : "Davet Gönder"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}