import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  console.log("PROXY ÇALIŞIYOR:", request.nextUrl.pathname);

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  /*
   * KULLANICI GİRİŞ YAPMAMIŞSA
   *
   * Aşağıdaki sayfalar giriş gerektirmez:
   * /login
   * /auth/callback
   * /update-password
   */
  if (
    !user &&
    pathname !== "/login" &&
    !pathname.startsWith("/auth/callback") &&
    pathname !== "/update-password"
  ) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  /*
   * KULLANICI ZATEN GİRİŞ YAPMIŞSA
   * login ekranına tekrar girmesin.
   */
  if (user && pathname === "/login") {
    return NextResponse.redirect(
      new URL("/", request.url)
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};