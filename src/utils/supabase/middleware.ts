// 위 middleware 안에서 동작하는 함수, supabase 레이어 middleware
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
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
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 여기에는 다른 코드를 작성하지 말라고 되어 있네요.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth")
    // 여기에 원하는 다른 옵션들을 넣으면 됩니다.
  ) {
    // user 가 없고, login 혹은 auth 라우트가 아니면 login 으로 보내버립니다.
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  // 중요: 반드시 supabaseResponse 객체를 그대로 반환해야 합니다.
  // NextResponse.next()를 사용하여 새 응답 객체를 생성하는 경우 다음을 수행하세요:
  // 1.다음과 같이 요청을 전달합니다:
  // const myNewResponse = NextResponse.next({ request })
  // 2. 다음과 같이 쿠키를 복사합니다:
  //myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll()) 55
  // 3. myNewResponse 객체를 필요에 맞게 변경하되 쿠키를 변경하지 마세요!
  // 4. 마지막으로: myNewResponse 반환
  // 이렇게 하지 않으면 브라우저와 서버가 동기화되지 않고 사용자 세션이 조기에 종료될 수 있습니다!
  return supabaseResponse;
}
