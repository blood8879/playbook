import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

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
    "/auth/callback/reset-password",
  ];

  // 공개 경로라면 무조건 접근 (단, /login 페이지에 로그인된 사용자가 접근할 경우 홈으로 리디렉션)
  if (publicRoutes.includes(pathname)) {
    if (pathname === "/login" && session) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return res;
  }

  // 공개 경로가 아닌 경우 로그인 상태가 아니라면 /login으로 리디렉션
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
