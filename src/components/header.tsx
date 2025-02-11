"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function Header() {
  const { session } = useAuthStore();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <header className="border-b">
      <div className="container mx-auto py-4 px-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold">
          Playbook
        </Link>
        <nav>
          <ul className="flex items-center space-x-4">
            {session ? (
              <>
                <li>
                  <Link href="/teams">
                    <Button variant="ghost">내 팀</Button>
                  </Link>
                </li>
                <li>
                  <Link href="/invites">
                    <Button variant="ghost">초대 목록</Button>
                  </Link>
                </li>
                <li>
                  <Button variant="ghost" onClick={handleSignOut}>
                    로그아웃
                  </Button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link href="/login">
                    <Button variant="link">로그인</Button>
                  </Link>
                </li>
                <li>
                  <Link href="/signup">
                    <Button>회원가입</Button>
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}
