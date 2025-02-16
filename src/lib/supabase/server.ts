// 서버용
import {
  createServerClient as createServerComponentClient,
  type CookieOptions,
} from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerClient() {
  const cookieStore = await cookies();

  // console.log("cookieStore", cookieStore);

  return createServerComponentClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = cookieStore.get(name);
          return cookie?.value ?? null;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            const maxAge = options.maxAge ?? 0;
            cookieStore.set({
              name,
              value,
              ...options,
              maxAge,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              path: "/",
            });
          } catch (error: unknown) {
            console.error("Failed to set cookie:", error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({
              name,
              value: "",
              ...options,
              maxAge: 0,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              path: "/",
            });
          } catch (error: unknown) {
            console.error("Failed to remove cookie:", error);
          }
        },
      },
    }
  );
}
