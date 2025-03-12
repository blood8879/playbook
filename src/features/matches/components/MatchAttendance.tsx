"use client";

import {
  Users,
  Check,
  X,
  HelpCircle,
  Info,
  Home,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamMatch } from "@/features/teams/types/index";
import { Badge } from "@/components/ui/badge";

interface MatchAttendanceProps {
  matchData: TeamMatch;
  attendanceList: any[];
  attendanceCounts: {
    homeAttending: number;
    homeAbsent: number;
    homeMaybe: number;
    awayAttending: number;
    awayAbsent: number;
    awayMaybe: number;
  };
  userAttendance: "attending" | "absent" | "maybe";
  handleAttendanceChange: (status: "attending" | "absent" | "maybe") => void;
  isUpdating: boolean;
}

export function MatchAttendance({
  matchData,
  attendanceList,
  attendanceCounts,
  userAttendance,
  handleAttendanceChange,
  isUpdating,
}: MatchAttendanceProps) {
  // 홈팀과 원정팀 참석자 분리
  const homeTeamAttendees = attendanceList
    .filter(
      (a) =>
        a.team_id === matchData?.team?.id || (!a.team_id && matchData?.is_home)
    )
    .sort((a, b) => {
      const nameA = a.profiles?.name || a.profiles?.email || "";
      const nameB = b.profiles?.name || b.profiles?.email || "";
      return nameA.localeCompare(nameB);
    });

  const awayTeamAttendees = attendanceList
    .filter(
      (a) =>
        a.team_id === matchData?.opponent_team?.id ||
        (!a.team_id && !matchData?.is_home)
    )
    .sort((a, b) => {
      const nameA = a.profiles?.name || a.profiles?.email || "";
      const nameB = b.profiles?.name || b.profiles?.email || "";
      return nameA.localeCompare(nameB);
    });

  return (
    <div className="p-6">
      {/* 홈팀 참석 현황 */}
      <div className="mb-6">
        <h3 className="text-md font-semibold mb-3">
          {matchData.team?.name} (홈)
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-green-50 p-4 rounded-lg text-center shadow-sm">
            <div className="flex items-center justify-center mb-2">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">
              {attendanceCounts.homeAttending || 0}명
            </div>
            <div className="text-sm text-gray-600">참석</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg text-center shadow-sm">
            <div className="flex items-center justify-center mb-2">
              <X className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">
              {attendanceCounts.homeAbsent || 0}명
            </div>
            <div className="text-sm text-gray-600">불참</div>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg text-center shadow-sm">
            <div className="flex items-center justify-center mb-2">
              <HelpCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-600">
              {attendanceCounts.homeMaybe || 0}명
            </div>
            <div className="text-sm text-gray-600">미정</div>
          </div>
        </div>
      </div>

      {/* 원정팀 참석 현황 */}
      {matchData.opponent_team && (
        <div className="mb-6">
          <h3 className="text-md font-semibold mb-3">
            {matchData.opponent_team?.name} (원정)
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-green-50 p-4 rounded-lg text-center shadow-sm">
              <div className="flex items-center justify-center mb-2">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-600">
                {attendanceCounts.awayAttending || 0}명
              </div>
              <div className="text-sm text-gray-600">참석</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center shadow-sm">
              <div className="flex items-center justify-center mb-2">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-600">
                {attendanceCounts.awayAbsent || 0}명
              </div>
              <div className="text-sm text-gray-600">불참</div>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg text-center shadow-sm">
              <div className="flex items-center justify-center mb-2">
                <HelpCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-amber-600">
                {attendanceCounts.awayMaybe || 0}명
              </div>
              <div className="text-sm text-gray-600">미정</div>
            </div>
          </div>
        </div>
      )}

      {/* 참석 현황 목록 - 홈팀 */}
      <div className="mt-8">
        <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
          <Home className="w-4 h-4" />
          {matchData.team?.name} 참석자 목록
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {homeTeamAttendees
            .filter((a) => a.status === "attending")
            .map((attendance) => (
              <div
                key={attendance.id}
                className="border rounded-lg p-3 flex items-center justify-between bg-blue-50 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>
                    {attendance.profiles?.name || attendance.profiles?.email}
                  </span>
                </div>
                <Badge variant="outline" className="bg-blue-100">
                  홈
                </Badge>
              </div>
            ))}
          {homeTeamAttendees.filter((a) => a.status === "attending").length ===
            0 && (
            <div className="col-span-full text-center text-gray-500 py-4">
              참석자가 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* 참석 현황 목록 - 원정팀 */}
      {matchData.opponent_team && (
        <div className="mt-8">
          <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            {matchData.opponent_team?.name} 참석자 목록
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {awayTeamAttendees
              .filter((a) => a.status === "attending")
              .map((attendance) => (
                <div
                  key={attendance.id}
                  className="border rounded-lg p-3 flex items-center justify-between bg-red-50 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>
                      {attendance.profiles?.name || attendance.profiles?.email}
                    </span>
                  </div>
                  <Badge variant="outline" className="bg-red-100">
                    원정
                  </Badge>
                </div>
              ))}
            {awayTeamAttendees.filter((a) => a.status === "attending")
              .length === 0 && (
              <div className="col-span-full text-center text-gray-500 py-4">
                참석자가 없습니다.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 전체 참석 현황 목록 */}
      <div className="mt-8">
        <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" />
          전체 참석 현황
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {attendanceList.map((attendance) => (
            <div
              key={attendance.id}
              className="border rounded-lg p-3 flex items-center justify-between bg-gray-50 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    attendance.status === "attending"
                      ? "bg-green-500"
                      : attendance.status === "absent"
                      ? "bg-red-500"
                      : "bg-amber-500"
                  }`}
                ></div>
                <span>
                  {attendance.profiles?.name || attendance.profiles?.email}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`text-xs px-2 py-1 rounded ${
                    attendance.status === "attending"
                      ? "bg-green-100 text-green-800"
                      : attendance.status === "absent"
                      ? "bg-red-100 text-red-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {attendance.status === "attending"
                    ? "참석"
                    : attendance.status === "absent"
                    ? "불참"
                    : "미정"}
                </div>
                {attendance.team_id === matchData?.team?.id ? (
                  <Badge variant="outline" className="bg-blue-50">
                    홈
                  </Badge>
                ) : attendance.team_id === matchData?.opponent_team?.id ? (
                  <Badge variant="outline" className="bg-red-50">
                    원정
                  </Badge>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 내 참석 여부 */}
      <div className="mt-8 bg-blue-50 p-4 rounded-lg shadow-sm">
        <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-600" />내 참석 여부
        </h3>
        <div className="flex gap-2">
          <Button
            variant={userAttendance === "attending" ? "default" : "outline"}
            onClick={() => handleAttendanceChange("attending")}
            disabled={isUpdating}
            className={
              userAttendance === "attending"
                ? "bg-green-600 hover:bg-green-700"
                : ""
            }
          >
            <Check className="w-4 h-4 mr-2" />
            참석
          </Button>
          <Button
            variant={userAttendance === "absent" ? "default" : "outline"}
            onClick={() => handleAttendanceChange("absent")}
            disabled={isUpdating}
            className={
              userAttendance === "absent" ? "bg-red-600 hover:bg-red-700" : ""
            }
          >
            <X className="w-4 h-4 mr-2" />
            불참
          </Button>
          <Button
            variant={userAttendance === "maybe" ? "default" : "outline"}
            onClick={() => handleAttendanceChange("maybe")}
            disabled={isUpdating}
            className={
              userAttendance === "maybe"
                ? "bg-amber-600 hover:bg-amber-700"
                : ""
            }
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            미정
          </Button>
        </div>
      </div>
    </div>
  );
}
