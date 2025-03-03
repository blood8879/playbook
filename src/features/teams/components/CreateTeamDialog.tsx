"use client";

import { useSupabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTeamForm } from "../hooks/useTeamForm";
import { createTeam } from "../api";
import { useState } from "react";
import { TeamForm } from "./TeamForm";
import { TeamFormData } from "../types/index";
import { useToast } from "@/hooks/use-toast";

interface CreateTeamDialogProps {
  onSuccess: () => void;
  renderTrigger?: (openDialog: () => void) => React.ReactNode;
}

export function CreateTeamDialog({
  onSuccess,
  renderTrigger,
}: CreateTeamDialogProps) {
  const { supabase, user } = useSupabase();
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const formProps = useTeamForm();
  const { toast } = useToast();

  const handleSubmit = async (data: TeamFormData) => {
    if (!user) return;
    setIsUploading(true);

    try {
      await createTeam(supabase, data, formProps.emblemFile, user.id);
      setIsOpen(false);
      formProps.resetForm();
      toast({
        title: "팀 생성 성공",
        description: "새로운 팀이 성공적으로 생성되었습니다.",
      });
      onSuccess();
    } catch (error) {
      console.error("Error creating team:", error);
      toast({
        title: "팀 생성 실패",
        description:
          error instanceof Error
            ? error.message
            : "팀 생성 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const openDialog = () => setIsOpen(true);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) formProps.resetForm();
      }}
    >
      <DialogTrigger asChild>
        {renderTrigger ? (
          renderTrigger(openDialog)
        ) : (
          <Button onClick={openDialog}>팀 생성</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 팀 생성</DialogTitle>
        </DialogHeader>
        <TeamForm
          onSubmit={formProps.handleSubmit(handleSubmit)}
          isUploading={isUploading}
          {...formProps}
        />
      </DialogContent>
    </Dialog>
  );
}
