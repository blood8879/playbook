"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { MatchFormValues, matchFormSchema } from "../lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { fetchTeamData, fetchOpponentTeamStadiums, createMatch } from "../api";
import { useSupabase } from "@/lib/supabase/client";

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
      match_time: "12:00",
      registration_deadline: new Date(),
      opponent_type: "tbd",
      match_type: "home",
      venue: "",
      description: "",
      opponent_team_id: "",
      stadium_id: "",
      // 게스트팀 관련 필드 기본값 설정
      opponent_guest_team_name: "",
      opponent_guest_team_description: "",
      guest_club_id: "none", // 기본값 설정
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
    // 필수 필드 검증
    if (!values.match_date || !values.registration_deadline) {
      toast({
        title: "필수 정보 누락",
        description: "경기 날짜와 참가 신청 마감일을 모두 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    // 경기장 유효성 검사
    if (
      values.match_type === "home" &&
      (!values.stadium_id || values.stadium_id === "none")
    ) {
      toast({
        title: "경기장 정보 오류",
        description: "홈 경기의 경우 경기장을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    // 상대팀 유효성 검사
    if (values.opponent_type === "registered" && !values.opponent_team_id) {
      toast({
        title: "상대팀 정보 오류",
        description: "등록된 팀을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (values.opponent_type === "guest" && !values.opponent_guest_team_name) {
      toast({
        title: "상대팀 정보 오류",
        description: "게스트 팀 이름을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // team_id 설정
      const submissionData = {
        ...values,
        team_id: teamData?.team?.id || "",
        is_home: values.match_type === "home",
      };

      // API 호출
      const result = await createMatch(submissionData);

      // 성공 처리
      toast({
        title: "경기 생성 완료",
        description: "새로운 경기가 성공적으로 생성되었습니다.",
      });

      // 팀 페이지로 리다이렉트
      router.push(`/teams/${teamData?.team?.id}`);
    } catch (error) {
      console.error("경기 생성 오류:", error);
      toast({
        title: "경기 생성 실패",
        description:
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.",
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

// 상대팀 검색 기능 추가
export function useTeamSearch() {
  const { supabase } = useSupabase();
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const searchTeams = useCallback(
    async (term: string) => {
      // 1글자부터 검색 가능하도록 변경
      if (!term || term.length < 1) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from("teams")
          .select("id, name, emblem_url")
          .ilike("name", `%${term}%`)
          .limit(20); // 검색 결과 수 증가

        // 순서 수정: 먼저 에러 체크 후 결과 설정
        if (error) throw error;

        setSearchResults(data || []);
      } catch (error) {
        console.error("팀 검색 중 오류 발생:", error);
        setError("검색 중 오류가 발생했습니다.");
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [supabase]
  );

  // 검색어 변경시 디바운스 적용 (시간 단축)
  useEffect(() => {
    const timer = setTimeout(() => {
      searchTeams(searchTerm);
    }, 200); // 디바운스 시간 단축

    return () => clearTimeout(timer);
  }, [searchTerm, searchTeams]);

  return {
    searchTerm,
    setSearchTerm,
    searchResults,
    isSearching,
    error,
  };
}
