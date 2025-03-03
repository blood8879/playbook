"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { MatchFormValues, matchFormSchema } from "../lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { fetchTeamData, fetchOpponentTeamStadiums, createMatch } from "../api";

export function useMatchForm(userId: string) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 경기장 생성 다이얼로그 상태
  const [isStadiumDialogOpen, setIsStadiumDialogOpen] = useState(false);

  // 데이터 상태
  const [teamData, setTeamData] = useState<{
    team: any;
    stadiums: any[];
    opponentTeams: any[];
    clubs: any[];
  } | null>(null);
  const [opponentTeamStadiums, setOpponentTeamStadiums] = useState<any[]>([]);

  // 폼 설정
  const form = useForm<MatchFormValues>({
    resolver: zodResolver(matchFormSchema),
    defaultValues: {
      match_date: new Date(),
      match_time: "15:00",
      registration_deadline: new Date(),
      opponent_type: "registered",
      venue: "",
      competition_type: "friendly",
      match_type: "home",
    },
  });

  // 상대팀 타입 변경 감지 및 폼 필드 리셋
  const opponentType = form.watch("opponent_type");
  const matchType = form.watch("match_type");
  const opponentTeamId = form.watch("opponent_team_id");

  useEffect(() => {
    if (opponentType === "registered") {
      form.setValue("opponent_guest_team_name", undefined);
      form.setValue("opponent_guest_team_description", undefined);
      form.setValue("guest_club_id", undefined);
    } else if (opponentType === "guest") {
      form.setValue("opponent_team_id", undefined);
    } else if (opponentType === "tbd") {
      form.setValue("opponent_team_id", undefined);
      form.setValue("opponent_guest_team_name", undefined);
      form.setValue("opponent_guest_team_description", undefined);
      form.setValue("guest_club_id", undefined);
    }
  }, [opponentType, form]);

  // 경기 타입이 변경될 때 경기장 정보 초기화
  useEffect(() => {
    form.setValue("venue", "");
    form.setValue("stadium_id", undefined);
  }, [matchType, form]);

  // 상대팀이 변경되었을 때 상대팀 경기장 정보 가져오기
  useEffect(() => {
    if (opponentTeamId && matchType === "away") {
      const loadOpponentStadiums = async () => {
        try {
          const stadiums = await fetchOpponentTeamStadiums(opponentTeamId);
          setOpponentTeamStadiums(stadiums);
        } catch (error) {
          console.error("상대팀 경기장 정보 가져오기 오류:", error);
          toast({
            title: "오류",
            description: "상대팀 경기장 정보를 가져오는데 실패했습니다.",
            variant: "destructive",
          });
        }
      };

      loadOpponentStadiums();
    } else {
      setOpponentTeamStadiums([]);
    }
  }, [opponentTeamId, matchType, toast]);

  // 팀 데이터 로드
  useEffect(() => {
    const loadTeamData = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = await fetchTeamData(userId);
        setTeamData(data);
      } catch (error) {
        console.error("팀 데이터 로드 오류:", error);
        toast({
          title: "오류",
          description: "팀 정보를 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadTeamData();
  }, [userId, toast]);

  // 폼 제출 핸들러
  const onSubmit = async (values: MatchFormValues) => {
    if (!teamData?.team) {
      toast({
        title: "오류",
        description: "팀 정보를 불러올 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createMatch(values, teamData.team.id, userId);

      toast({
        title: "성공",
        description: "경기가 성공적으로 생성되었습니다.",
      });

      router.push(`/teams/${teamData.team.id}`);
    } catch (error) {
      console.error("경기 생성 오류:", error);
      toast({
        title: "오류",
        description: "경기 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 새로운 경기장 추가 후 처리
  const handleStadiumSaved = (stadium: any) => {
    // 팀 데이터 갱신
    if (teamData) {
      setTeamData({
        ...teamData,
        stadiums: [...teamData.stadiums, stadium],
      });
    }

    // 폼 필드 업데이트
    form.setValue("venue", stadium.name);
    form.setValue("stadium_id", stadium.id);
  };

  return {
    form,
    teamData,
    isLoading,
    isSubmitting,
    opponentTeamStadiums,
    isStadiumDialogOpen,
    setIsStadiumDialogOpen,
    onSubmit,
    handleStadiumSaved,
  };
}
