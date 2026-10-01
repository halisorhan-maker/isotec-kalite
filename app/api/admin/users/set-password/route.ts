import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return jsonError(
        "Sunucu Supabase yapılandırması eksik. Ortam değişkenlerini kontrol edin.",
        500
      );
    }

    const authorization = request.headers.get("authorization");

    const accessToken = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : null;

    if (!accessToken) {
      return jsonError("Yetkilendirme bilgisi bulunamadı.", 401);
    }

    const body = await request.json();

    const userId = String(body?.userId || "").trim();
    const password = String(body?.password || "");

    if (!userId) {
      return jsonError("Kullanıcı ID bilgisi eksik.");
    }

    if (password.length < 8) {
      return jsonError("Şifre en az 8 karakter olmalıdır.");
    }

    const supabaseAuth = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const {
      data: { user: currentUser },
      error: currentUserError,
    } = await supabaseAuth.auth.getUser(accessToken);

    if (currentUserError || !currentUser) {
      return jsonError(
        "Yönetici oturumu doğrulanamadı. Lütfen tekrar giriş yapın.",
        401
      );
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const {
      data: currentProfile,
      error: currentProfileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id, company_id, role, is_active")
      .eq("id", currentUser.id)
      .single();

    if (
      currentProfileError ||
      !currentProfile ||
      currentProfile.role !== "Yönetici" ||
      !currentProfile.is_active
    ) {
      return jsonError(
        "Bu işlem için Yönetici yetkisi gereklidir.",
        403
      );
    }

    const {
      data: targetProfile,
      error: targetProfileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id, company_id, email, full_name, is_active")
      .eq("id", userId)
      .single();

    if (targetProfileError || !targetProfile) {
      return jsonError("Hedef kullanıcı bulunamadı.", 404);
    }

    if (targetProfile.company_id !== currentProfile.company_id) {
      return jsonError(
        "Bu kullanıcı aynı firmaya bağlı değil.",
        403
      );
    }

    if (!targetProfile.is_active) {
      return jsonError(
        "Pasif kullanıcı için şifre güncellenemez."
      );
    }

    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
      });

    if (updateError) {
      console.error(
        "Supabase Auth şifre güncelleme hatası:",
        updateError
      );

      return jsonError(
        updateError.message ||
          "Kullanıcı şifresi güncellenemedi.",
        500
      );
    }

    return NextResponse.json({
      success: true,
      message: "Kullanıcı şifresi başarıyla güncellendi.",
    });
  } catch (error: any) {
    console.error("Şifre güncelleme API hatası:", error);

    return jsonError(
      error?.message ||
        "Kullanıcı şifresi güncellenemedi.",
      500
    );
  }
}