"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, AlertTriangle, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamMatch } from "@/features/teams/types/index";
import { UpdateOpponent } from "@/features/teams/components/UpdateOpponent";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UseMutationResult } from "@tanstack/react-query";

interface MatchActionsProps {
  matchData: TeamMatch;
  isAdmin: boolean;
  isOpponentTeamUndecided: boolean;
  deleteMutation: UseMutationResult<void, Error, void, unknown>;
}

export function MatchActions({
  matchData,
  isAdmin,
  isOpponentTeamUndecided,
  deleteMutation,
}: MatchActionsProps) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  if (!isAdmin) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">경기 결과 수정</h2>
          <p className="text-sm text-gray-500">
            경기 결과를 수정할 수 있습니다.
          </p>
          {isOpponentTeamUndecided && (
            <div className="mt-2 flex items-center text-amber-600 text-sm">
              <AlertTriangle className="w-4 h-4 mr-1" />
              상대팀이 미정인 경우 경기 결과를 업데이트할 수 없습니다.
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <UpdateOpponent
            matchId={matchData.id}
            teamId={
              (matchData.user_team || matchData.team)?.id || matchData.team_id
            }
          />
          <Button
            onClick={() => router.push(`/matches/${matchData.id}/result`)}
            disabled={isOpponentTeamUndecided}
          >
            <Edit className="w-4 h-4 mr-2" />
            경기 결과 업데이트
          </Button>
          {!matchData.is_finished && (
            <Button
              variant="destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              경기 삭제
            </Button>
          )}
        </div>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              경기 삭제 확인
            </DialogTitle>
          </DialogHeader>
          <DialogDescription>
            정말로 이 경기를 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 모든
            참석 정보가 함께 삭제됩니다.
          </DialogDescription>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteMutation.mutate();
                setIsDeleteDialogOpen(false);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  삭제 중...
                </>
              ) : (
                "삭제"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
