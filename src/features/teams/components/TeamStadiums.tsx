"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash, Search } from "lucide-react";
import DaumPostcode from "react-daum-postcode";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent as AlertDlgContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TeamStadiumsSkeleton } from "./TeamStadiumsSkeleton";

interface TeamStadiumsProps {
  teamId: string;
  isLeader: boolean;
}

interface Stadium {
  id: string;
  name: string;
  address: string;
  description: string | null;
  team_id: string;
}

interface StadiumFormData {
  name: string;
  address: string;
  description: string;
}

/**
 * @ai_context
 * This component manages stadium information, including creation, update, and deletion.
 */

export function TeamStadiums({ teamId, isLeader }: TeamStadiumsProps) {
  const { supabase } = useSupabase();
  const [isAddingStadium, setIsAddingStadium] = useState(false);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [formData, setFormData] = useState<StadiumFormData>({
    name: "",
    address: "",
    description: "",
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingStadium, setEditingStadium] = useState<Stadium | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [stadiumToDelete, setStadiumToDelete] = useState<Stadium | null>(null);

  const {
    data: stadiums,
    isLoading,
  } = useQuery<Stadium[]>({
    queryKey: ["teamStadiums", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stadiums")
        .select("*")
        .eq("team_id", teamId);
      if (error) throw error;
      return data;
    },
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

      if (error) {
        console.error("Supabase error details:", error);
        throw error;
      }
      return stadiumData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamStadiums", teamId] });
      setIsAddingStadium(false);
      setFormData({ name: "", address: "", description: "" });
      toast({
        title: "경기장이 등록되었습니다.",
        description: "새로운 경기장이 성공적으로 등록되었습니다.",
      });
    },
    onError: (error: any) => {
      console.error("Stadium creation error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      toast({
        title: "경기장 등록 실패",
        description: error.message || "경기장 등록 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const updateStadiumMutation = useMutation({
    mutationFn: async (data: Stadium) => {
      const { error } = await supabase
        .from("stadiums")
        .update({
          name: data.name,
          address: data.address,
          description: data.description,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamStadiums", teamId] });
      setEditingStadium(null);
      toast({
        title: "경기장이 수정되었습니다.",
        description: "경기장 정보가 성공적으로 수정되었습니다.",
      });
    },
    onError: (error: any) => {
      console.error("Stadium update error:", error);
      toast({
        title: "경기장 수정 실패",
        description: error.message || "경기장 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteStadiumMutation = useMutation({
    mutationFn: async (stadiumId: string) => {
      const { error } = await supabase
        .from("stadiums")
        .delete()
        .eq("id", stadiumId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamStadiums", teamId] });
      setIsDeleteDialogOpen(false);
      setStadiumToDelete(null);
      toast({
        title: "경기장이 삭제되었습니다.",
        description: "경기장이 성공적으로 삭제되었습니다.",
      });
    },
    onError: (error: any) => {
      console.error("Stadium deletion error:", error);
      toast({
        title: "경기장 삭제 실패",
        description: error.message || "경기장 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addStadiumMutation.mutate(formData);
  };

  const handleComplete = (data: any) => {
    const fullAddress = data.roadAddress || data.jibunAddress;
    setFormData((prev) => ({
      ...prev,
      address: fullAddress,
    }));
    setIsAddressDialogOpen(false);
  };

  const handleEdit = (stadium: Stadium) => {
    setEditingStadium(stadium);
    setFormData({
      name: stadium.name,
      address: stadium.address,
      description: stadium.description || "",
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStadium) return;

    updateStadiumMutation.mutate({
      ...editingStadium,
      ...formData,
    });
  };

  const handleDelete = (stadium: Stadium) => {
    setStadiumToDelete(stadium);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (stadiumToDelete) {
      deleteStadiumMutation.mutate(stadiumToDelete.id);
    }
  };

  if (isLoading) {
    return <TeamStadiumsSkeleton />;
  }

  return (
    <div className="space-y-4">
      {isLeader && (
        <div className="flex justify-end">
          <Button onClick={() => setIsAddingStadium(true)}>
            <Plus className="w-4 h-4 mr-2" />
            경기장 등록
          </Button>
        </div>
      )}

      <Dialog open={isAddingStadium} onOpenChange={setIsAddingStadium}>
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
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddingStadium(false)}
              >
                취소
              </Button>
              <Button type="submit">등록</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>주소 검색</DialogTitle>
          </DialogHeader>
          <div className="h-[400px]">
            <DaumPostcode
              onComplete={handleComplete}
              style={{ height: "100%" }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingStadium !== null}
        onOpenChange={(open) => !open && setEditingStadium(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>경기장 수정</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
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
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingStadium(null)}
              >
                취소
              </Button>
              <Button type="submit">수정</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDlgContent>
          <AlertDialogHeader>
            <AlertDialogTitle>경기장 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말 이 경기장을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDlgContent>
      </AlertDialog>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stadiums?.map((stadium) => (
          <Card key={stadium.id}>
            <CardHeader>
              <CardTitle>{stadium.name}</CardTitle>
              <CardDescription>{stadium.address}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">{stadium.description}</p>
              {isLeader && (
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(stadium)}
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    수정
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(stadium)}
                  >
                    <Trash className="w-4 h-4 mr-2" />
                    삭제
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {stadiums?.length === 0 && (
          <div className="text-center text-gray-500 py-4 col-span-2">
            등록된 경기장이 없습니다
          </div>
        )}
      </div>
    </div>
  );
}