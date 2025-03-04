"use client";

import { MapPin, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { TeamMatch } from "../types";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { TeamMatchesSkeleton } from "./TeamMatchesSkeleton";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface TeamMatchesProps {
  matches: TeamMatch[];
  isLoading: boolean;
  teamId: string;
  canManageMatches: boolean;
}

/**
 * @ai_context
 * This component handles listing matches for a team.
 */

// 경기 상태에 따른 배지 색상 반환 함수
export const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "scheduled":
      return "outline";
    case "in_progress":
      return "secondary";
    case "completed":
      return "default";
    default:
      return "outline";
  }
};

// 경기 상태 텍스트 반환 함수
export const getStatusText = (status: string) => {
  switch (status) {
    case "scheduled":
      return "예정됨";
    case "in_progress":
      return "진행 중";
    case "completed":
      return "완료됨";
    default:
      return "미정";
  }
};

export function TeamMatches({
  matches,
  isLoading,
  teamId,
  canManageMatches,
}: TeamMatchesProps) {
  const router = useRouter();

  console.log("matches", matches);

  // 완료되지 않은 경기만 필터링
  const upcomingMatches = matches.filter((match) => !match.is_finished);

  // 경기 상태 및 참가자 수 계산
  const processedMatches = upcomingMatches.map((match) => {
    // 경기 상태 계산
    let status = "scheduled";
    if (match.is_finished) {
      status = "completed";
    } else if (new Date(match.match_date) < new Date() && !match.is_finished) {
      status = "in_progress";
    }

    // 참가자 수는 실제 데이터가 없으므로 임시로 0으로 설정
    // 실제로는 match_attendances 테이블에서 가져와야 함
    const participants_count = 0;

    // 원본 match 객체의 모든 속성을 유지하면서 새 속성 추가
    return {
      ...match,
      status,
      participants_count,
    };
  });

  if (isLoading) {
    return <TeamMatchesSkeleton />;
  }

  return (
    <div>
      {processedMatches.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">예정된 경기 일정이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {processedMatches.map((match) => (
            <Card key={match.id} className="overflow-hidden">
              <Link href={`/matches/${match.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {match.is_tbd
                          ? "미정"
                          : match.opponent_team?.name ||
                            match.opponent_guest_team?.name ||
                            "상대팀 미정"}
                      </CardTitle>
                      <div className="text-sm text-gray-500 mt-1">
                        {format(
                          new Date(match.match_date),
                          "yyyy년 MM월 dd일 (EEE) HH:mm",
                          {
                            locale: ko,
                          }
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      {/* <Badge variant={getStatusBadgeVariant(match.status)}>
                        {getStatusText(match.status)}
                      </Badge> */}
                      <Badge
                        variant={
                          (match as any).is_home ? "default" : "secondary"
                        }
                        className={
                          (match as any).is_home
                            ? "bg-green-500"
                            : "bg-orange-500"
                        }
                      >
                        {(match as any).is_home ? "홈" : "원정"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <MapPin className="w-4 h-4 mr-1" />
                    {match.stadium?.name} ({match.stadium.address})
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Users className="w-4 h-4 mr-1" />
                    {match.participants_count || 0}명 참가
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
