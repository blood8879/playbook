"use client";

import { useState } from "react";
import { useSupabase } from "@/lib/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search } from "lucide-react";
import DaumPostcode from "react-daum-postcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface StadiumRegistrationProps {
  teamId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (stadium: any) => void;
}

interface StadiumFormData {
  name: string;
  address: string;
  description: string;
}

export function StadiumRegistration({
  teamId,
  open,
  onOpenChange,
  onSuccess,
}: StadiumRegistrationProps) {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [formData, setFormData] = useState<StadiumFormData>({
    name: "",
    address: "",
    description: "",
  });

  const addStadiumMutation = useMutation({
    mutationFn: async (data: StadiumFormData) => {
      const { data: stadiumData, error } = await supabase
        .from("stadiums")
        .insert({
          ...data,
          team_id: teamId,
        })
        .select()
        .single();

      if (error) throw error;
      return stadiumData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["teamStadiums", teamId] });
      onSuccess?.(data);
      setFormData({ name: "", address: "", description: "" });
      toast({
        title: "경기장이 등록되었습니다.",
        description: "새로운 경기장이 성공적으로 등록되었습니다.",
      });
    },
    onError: (error: any) => {
      console.error("Stadium creation error:", error);
      toast({
        title: "경기장 등록 실패",
        description: error.message || "경기장 등록 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addStadiumMutation.mutate(formData);
  };

  // 다이얼로그가 닫힐 때 폼 초기화
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setFormData({
        name: "",
        address: "",
        description: "",
      });
    }
    onOpenChange(newOpen);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 경기장 등록</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">경기장 이름</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="경기장 이름을 입력하세요"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">주소</Label>
                <div className="flex gap-2">
                  <Input
                    id="address"
                    value={formData.address}
                    placeholder="주소 검색을 클릭하세요"
                    readOnly
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddressDialogOpen(true)}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    주소 검색
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="경기장에 대한 설명을 입력하세요"
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="submit">등록</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>주소 검색</DialogTitle>
          </DialogHeader>
          <DaumPostcode
            onComplete={(data) => {
              setFormData({ ...formData, address: data.address });
              setIsAddressDialogOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
