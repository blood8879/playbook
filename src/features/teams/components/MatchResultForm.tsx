"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { TeamMatch, MatchAttendance } from "@/features/teams/types";

interface MatchResultFormProps {
  match: TeamMatch;
  attendanceList: MatchAttendance[];
  onSubmit: (data: any) => void;
  isUpdating: boolean;
}

export function MatchResultForm({
  match,
  attendanceList,
  onSubmit,
  isUpdating,
}: MatchResultFormProps) {
  const [playerStats, setPlayerStats] = useState<{
    [key: string]: {
      attendance: "attending" | "absent" | "maybe";
      fieldGoals: number;
      freeKickGoals: number;
      penaltyGoals: number;
      assists: number;
      isMom: boolean;
    };
  }>(() => {
    const initial: any = {};
    attendanceList?.forEach((attendance) => {
      initial[attendance.user_id] = {
        attendance: attendance.status,
        fieldGoals: 0,
        freeKickGoals: 0,
        penaltyGoals: 0,
        assists: 0,
        isMom: false,
      };
    });
    return initial;
  });

  const handleAttendanceChange = (
    userId: string,
    value: "attending" | "absent" | "maybe"
  ) => {
    setPlayerStats((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        attendance: value,
      },
    }));
  };

  const handleStatChange = (
    userId: string,
    field:
      | "fieldGoals"
      | "freeKickGoals"
      | "penaltyGoals"
      | "assists"
      | "isMom",
    value: number | boolean
  ) => {
    setPlayerStats((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value,
      },
    }));
  };

  const handleSubmit = () => {
    onSubmit(playerStats);
  };

  return (
    <Card className="p-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>선수</TableHead>
            <TableHead>참석 여부</TableHead>
            <TableHead>필드골</TableHead>
            <TableHead>프리킥</TableHead>
            <TableHead>페널티킥</TableHead>
            <TableHead>총 골</TableHead>
            <TableHead>어시스트</TableHead>
            <TableHead>MOM</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attendanceList?.map((attendance) => {
            const stats = playerStats[attendance.user_id];
            const totalGoals =
              (stats.fieldGoals || 0) +
              (stats.freeKickGoals || 0) +
              (stats.penaltyGoals || 0);

            return (
              <TableRow key={attendance.user_id}>
                <TableCell>
                  {attendance.profiles?.name || attendance.profiles?.email}
                </TableCell>
                <TableCell>
                  <Select
                    value={stats.attendance}
                    onValueChange={(value: "attending" | "absent" | "maybe") =>
                      handleAttendanceChange(attendance.user_id, value)
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="attending">참석</SelectItem>
                      <SelectItem value="absent">불참</SelectItem>
                      <SelectItem value="maybe">미정</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    value={stats.fieldGoals}
                    onChange={(e) =>
                      handleStatChange(
                        attendance.user_id,
                        "fieldGoals",
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    value={stats.freeKickGoals}
                    onChange={(e) =>
                      handleStatChange(
                        attendance.user_id,
                        "freeKickGoals",
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    value={stats.penaltyGoals}
                    onChange={(e) =>
                      handleStatChange(
                        attendance.user_id,
                        "penaltyGoals",
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="w-20"
                  />
                </TableCell>
                <TableCell className="font-bold">{totalGoals}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    value={stats.assists}
                    onChange={(e) =>
                      handleStatChange(
                        attendance.user_id,
                        "assists",
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={stats.isMom}
                    onCheckedChange={(checked) =>
                      handleStatChange(attendance.user_id, "isMom", checked)
                    }
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSubmit} disabled={isUpdating}>
          {isUpdating ? "저장 중..." : "결과 저장"}
        </Button>
      </div>
    </Card>
  );
}
