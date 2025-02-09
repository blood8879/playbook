import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // 세션 새로고침 시도
  try {
    await supabase.auth.getSession();
  } catch (error) {
    console.error("Session refresh error:", error);
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = req.nextUrl.pathname;

  // 공개 경로 (인증 없이 접근 가능한 페이지)
  const publicRoutes = [
    "/",
    "/login",
    "/signup",
    "/reset-password",
    "/auth/callback",
    "/auth/callback/reset-password",
  ];

  // API 및 정적 파일 경로 무시
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return res;
  }

  // 공개 경로라면 무조건 접근 (단, /login 페이지에 로그인된 사용자가 접근할 경우 홈으로 리디렉션)
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    if (pathname === "/login" && session) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return res;
  }

  // 공개 경로가 아닌 경우 로그인 상태가 아니라면 /login으로 리디렉션
  if (!session) {
    const redirectUrl = new URL("/login", req.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

// 미들웨어가 실행될 경로 설정
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
