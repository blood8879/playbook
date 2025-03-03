"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface GeneratedMatchesDisplayProps {
  matches: any[];
  isSaving: boolean;
  onSave: () => void;
}

export function GeneratedMatchesDisplay({
  matches,
  isSaving,
  onSave,
}: GeneratedMatchesDisplayProps) {
  if (!matches.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>생성된 경기 일정</CardTitle>
        <CardDescription>아래의 경기 일정을 저장하시겠습니까?</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="max-h-[400px] overflow-auto border rounded-md">
            <table className="min-w-full">
              <thead className="sticky top-0 bg-background border-b">
                <tr>
                  <th className="px-4 py-2 text-left">날짜</th>
                  <th className="px-4 py-2 text-left">시간</th>
                  <th className="px-4 py-2 text-left">상태</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match, index) => {
                  const matchDate = new Date(match.date);
                  return (
                    <tr key={index} className="border-b">
                      <td className="px-4 py-2">
                        {format(matchDate, "yyyy년 MM월 dd일 (eee)", {
                          locale: ko,
                        })}
                      </td>
                      <td className="px-4 py-2">
                        {format(matchDate, "HH:mm")}
                      </td>
                      <td className="px-4 py-2">
                        <span className="inline-block px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          {match.status === "scheduled"
                            ? "예정됨"
                            : match.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <Button onClick={onSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                "일정 저장하기"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
