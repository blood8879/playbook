"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSupabase } from "@/lib/supabase/client";
import { LogOut, User } from "lucide-react";

export function Header() {
  const router = useRouter();
  const { supabase, user } = useSupabase();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/" className="flex items-center space-x-2">
          <span className="font-bold text-xl">축구스탯</span>
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-4">
          {user ? (
            <>
              <nav className="flex items-center space-x-4">
                <Link href="/dashboard">
                  <Button variant="ghost">대시보드</Button>
                </Link>
                <Link href="/teams">
                  <Button variant="ghost">팀 관리</Button>
                </Link>
                <Link href="/matches">
                  <Button variant="ghost">경기 관리</Button>
                </Link>
                <Link href="/leagues">
                  <Button variant="ghost">리그 관리</Button>
                </Link>
              </nav>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={user.user_metadata?.avatar_url}
                        alt={user.email || ""}
                      />
                      <AvatarFallback>
                        {user.email?.[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      <span>프로필</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>로그아웃</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <nav className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost">로그인</Button>
              </Link>
              <Link href="/signup">
                <Button variant="default">회원가입</Button>
              </Link>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
