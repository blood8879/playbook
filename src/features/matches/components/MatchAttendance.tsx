"use client";

import { Users, Check, X, HelpCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamMatch } from "@/features/teams/types/index";

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
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Users className="w-5 h-5" />
        참석 현황
      </h2>

      {/* 홈팀 참석 현황 */}
      <div className="mb-6">
        <h3 className="text-md font-semibold mb-3">
          {matchData.team?.name} (홈)
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="flex items-center justify-center mb-2">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">
              {attendanceCounts.homeAttending || 0}명
            </div>
            <div className="text-sm text-green-600">참석</div>
          </div>

          <div className="bg-red-50 p-4 rounded-lg text-center">
            <div className="flex items-center justify-center mb-2">
              <X className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">
              {attendanceCounts.homeAbsent || 0}명
            </div>
            <div className="text-sm text-red-600">불참</div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="flex items-center justify-center mb-2">
              <HelpCircle className="w-5 h-5 text-gray-600" />
            </div>
            <div className="text-2xl font-bold text-gray-600">
              {attendanceCounts.homeMaybe || 0}명
            </div>
            <div className="text-sm text-gray-600">미정</div>
          </div>
        </div>

        {/* 홈팀 참석자 명단 */}
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            <h4 className="text-sm font-medium mb-2 w-full">참석자 명단</h4>
            {attendanceList
              ?.filter(
                (a) =>
                  a.status === "attending" &&
                  (a.team_id === matchData?.team?.id ||
                    (!a.team_id && matchData?.is_home))
              )
              .map((attendance) => (
                <span
                  key={attendance.user_id}
                  className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs"
                >
                  {attendance.profiles?.name || attendance.profiles?.email}
                </span>
              ))}
            {attendanceList?.filter((a) => a.status === "attending").length ===
              0 && (
              <span className="text-xs text-gray-500">참석자가 없습니다.</span>
            )}
          </div>
        </div>
      </div>

      {/* 어웨이팀 참석 현황 */}
      <div>
        <h3 className="text-md font-semibold mb-3">
          {matchData.opponent_team?.name || "상대팀"} (어웨이)
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="flex items-center justify-center mb-2">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">
              {attendanceCounts.awayAttending || 0}명
            </div>
            <div className="text-sm text-green-600">참석</div>
          </div>

          <div className="bg-red-50 p-4 rounded-lg text-center">
            <div className="flex items-center justify-center mb-2">
              <X className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">
              {attendanceCounts.awayAbsent || 0}명
            </div>
            <div className="text-sm text-red-600">불참</div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="flex items-center justify-center mb-2">
              <HelpCircle className="w-5 h-5 text-gray-600" />
            </div>
            <div className="text-2xl font-bold text-gray-600">
              {attendanceCounts.awayMaybe || 0}명
            </div>
            <div className="text-sm text-gray-600">미정</div>
          </div>
        </div>

        {/* 어웨이팀 참석자 명단 */}
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            <h4 className="text-sm font-medium mb-2 w-full">참석자 명단</h4>
            {attendanceList
              ?.filter(
                (a) =>
                  a.status === "attending" &&
                  (a.team_id === matchData?.opponent_team?.id ||
                    (!a.team_id && !matchData?.is_home))
              )
              .map((attendance) => (
                <span
                  key={attendance.user_id}
                  className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs"
                >
                  {attendance.profiles?.name ||
                    attendance.profiles?.email ||
                    "알 수 없는 사용자"}
                </span>
              ))}
            {attendanceList?.filter(
              (a) =>
                a.status === "attending" &&
                (a.team_id === matchData?.opponent_team?.id ||
                  (!a.team_id && !matchData?.is_home))
            ).length === 0 && (
              <span className="text-xs text-gray-500">참석자가 없습니다.</span>
            )}
          </div>
        </div>
      </div>

      {/* 참석 버튼 */}
      <div className="space-y-2 mt-6">
        <p className="text-sm text-gray-600 mb-3">나의 참석 여부</p>
        {matchData.is_finished ? (
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                <Info className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">
                  경기가 종료되었습니다
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  종료된 경기는 참석 상태를 변경할 수 없습니다.
                </p>
              </div>
            </div>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <Button
            variant={userAttendance === "attending" ? "default" : "outline"}
            disabled={isUpdating || matchData.is_finished}
            onClick={() => handleAttendanceChange("attending")}
            className="flex-1"
          >
            <Check className="w-4 h-4 mr-2" />
            참석
          </Button>
          <Button
            variant={userAttendance === "absent" ? "default" : "outline"}
            disabled={isUpdating || matchData.is_finished}
            onClick={() => handleAttendanceChange("absent")}
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
            불참
          </Button>
          <Button
            variant={userAttendance === "maybe" ? "default" : "outline"}
            disabled={isUpdating || matchData.is_finished}
            onClick={() => handleAttendanceChange("maybe")}
            className="flex-1"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            미정
          </Button>
        </div>
      </div>
    </div>
  );
}
