import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 웹은 anon 키 + 사용자 세션만 사용한다. service_role은 워커 전용.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component에서 호출된 경우 무시 (미들웨어가 갱신)
          }
        },
      },
    }
  );
}
