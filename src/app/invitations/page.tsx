"use client";

import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/lib/supabase/client";
import { getMyInvitations, respondToInvitation } from "@/features/teams/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { TeamInvitation } from "@/features/teams/types/index";

export default function InvitationsPage() {
  const { supabase, user } = useSupabase();
  const { toast } = useToast();

  const {
    data: invitations,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["invitations"],
    queryFn: () =>
      user?.id
        ? getMyInvitations(supabase, user.id)
        : Promise.resolve([] as TeamInvitation[]),
    enabled: !!user?.id,
  });

  const handleResponse = async (invitationId: string, accept: boolean) => {
    try {
      await respondToInvitation(supabase, invitationId, accept);
      toast({
        title: accept ? "초대를 수락했습니다" : "초대를 거절했습니다",
        description: accept
          ? "이제 팀의 멤버로 활동할 수 있습니다"
          : "초대가 거절되었습니다",
      });
      refetch();
    } catch (error) {
      toast({
        title: "오류가 발생했습니다",
        description: "잠시 후 다시 시도해주세요",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">팀 초대 목록</h1>
      {!invitations || invitations.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          받은 초대가 없습니다
        </p>
      ) : (
        <div className="grid gap-4">
          {invitations.map((invitation) => (
            <Card key={invitation.id}>
              <CardHeader>
                <CardTitle>{invitation.team.name} 팀의 초대</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {invitation.inviter.name}님이 초대를 보냈습니다
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleResponse(invitation.id, true)}
                    variant="default"
                  >
                    수락
                  </Button>
                  <Button
                    onClick={() => handleResponse(invitation.id, false)}
                    variant="outline"
                  >
                    거절
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
