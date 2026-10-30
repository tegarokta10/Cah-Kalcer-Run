import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAuthPage = path === "/login" || path === "/signup" || path === "/register" || path === "/forgot-password" || path === "/reset-password";
  const isAuthEntry = path === "/login" || path === "/signup" || path === "/register";
  const isDashboard = path === "/dashboard" || path.startsWith("/dashboard/");

  // The public landing page should not make an auth request or depend on Supabase configuration.
  if (path === "/" || path.startsWith("/api/") || path === "/auth/callback" || path === "/auth/recovery-callback") return NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    if (isAuthPage) return NextResponse.next();
    return NextResponse.redirect(new URL("/login?error=supabase_not_configured", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && isDashboard) {
    return NextResponse.redirect(new URL("/login?next=%2Fdashboard", request.url));
  }
  if (user && isAuthEntry) return NextResponse.redirect(new URL("/dashboard", request.url));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
