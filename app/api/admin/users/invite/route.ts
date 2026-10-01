import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    /*
     * 1) İstek yapan mevcut kullanıcıyı kontrol et
     */
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // Server Component / Route Handler ortamında bazı durumlarda
              // cookie yazımı mümkün olmayabilir.
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          message: "Oturum bulunamadı.",
        },
        { status: 401 }
      );
    }

    /*
     * 2) Mevcut kullanıcının profilini ve şirketini bul
     */
    const { data: currentProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, company_id, role, is_active")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !currentProfile ||
      !currentProfile.company_id ||
      !currentProfile.is_active ||
      currentProfile.role !== "Yönetici"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Bu işlem için yönetici yetkisi gereklidir.",
        },
        { status: 403 }
      );
    }

    /*
     * 3) Form verilerini al
     */
    const body = await request.json();

    const fullName =
      typeof body.full_name === "string"
        ? body.full_name.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const role =
      typeof body.role === "string" && body.role.trim()
        ? body.role.trim()
        : "İzleyici";

    if (!fullName) {
      return NextResponse.json(
        {
          success: false,
          message: "Ad Soyad zorunludur.",
        },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: "E-posta adresi zorunludur.",
        },
        { status: 400 }
      );
    }

    /*
     * 4) E-posta formatını kontrol et
     */
    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          message: "Geçerli bir e-posta adresi giriniz.",
        },
        { status: 400 }
      );
    }

    /*
     * 5) İzin verilen rolleri kontrol et
     */
    const allowedRoles = [
      "Yönetici",
      "Kalite Sorumlusu",
      "Kalite Kontrol",
      "Üretim",
      "İzleyici",
    ];

    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        {
          success: false,
          message: "Geçersiz kullanıcı rolü.",
        },
        { status: 400 }
      );
    }

    /*
     * 6) SERVICE ROLE client
     *
     * Bu anahtar kesinlikle frontend'e gönderilmez.
     */
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          message:
            "SUPABASE_SERVICE_ROLE_KEY sunucu ortamında tanımlı değil.",
        },
        { status: 500 }
      );
    }

    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    /*
     * 7) Aynı şirket içerisinde aynı e-posta ile
     * profil var mı kontrol et
     */
    const { data: existingProfile } = await adminSupabase
      .from("profiles")
      .select("id, email, company_id")
      .eq("email", email)
      .eq("company_id", currentProfile.company_id)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bu e-posta adresi zaten bu firmada kayıtlı.",
        },
        { status: 409 }
      );
    }

    /*
     * 8) Supabase Auth kullanıcısını davet et
     *
     * Kullanıcıya Supabase tarafından davet e-postası gönderilir.
     */
    const { data: invitedUser, error: inviteError } =
      await adminSupabase.auth.admin.inviteUserByEmail(
        email,
        {
          data: {
            full_name: fullName,
            company_id: currentProfile.company_id,
            role,
          },
        }
      );

    if (inviteError || !invitedUser.user) {
      return NextResponse.json(
        {
          success: false,
          message:
            inviteError?.message ||
            "Kullanıcı daveti oluşturulamadı.",
        },
        { status: 400 }
      );
    }

    /*
     * 9) Kullanıcıyı profiles tablosuna bağla
     */
    const { data: newProfile, error: insertError } =
      await adminSupabase
        .from("profiles")
        .insert({
          id: invitedUser.user.id,
          company_id: currentProfile.company_id,
          full_name: fullName,
          email,
          role,
          is_active: true,
        })
        .select(
          "id, company_id, full_name, email, role, is_active"
        )
        .single();

    /*
     * 10) Profile oluşturulamazsa Auth kullanıcısını
     * yetim bırakmamak için sil
     */
    if (insertError || !newProfile) {
      await adminSupabase.auth.admin.deleteUser(
        invitedUser.user.id
      );

      return NextResponse.json(
        {
          success: false,
          message:
            insertError?.message ||
            "Kullanıcı profili oluşturulamadı.",
        },
        { status: 500 }
      );
    }

    /*
     * 11) Başarılı sonuç
     */
    return NextResponse.json(
      {
        success: true,
        message:
          "Kullanıcı başarıyla davet edildi. Davet e-postası gönderildi.",
        user: newProfile,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Kullanıcı davet hatası:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Beklenmeyen bir sunucu hatası oluştu.",
      },
      { status: 500 }
    );
  }
}