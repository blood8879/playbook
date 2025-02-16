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
import { TeamFormData } from "../types";

interface CreateTeamDialogProps {
  onSuccess: () => void;
}

export function CreateTeamDialog({ onSuccess }: CreateTeamDialogProps) {
  const { supabase, user } = useSupabase();
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const formProps = useTeamForm();

  const handleSubmit = async (data: TeamFormData) => {
    if (!user) return;
    setIsUploading(true);

    try {
      await createTeam(supabase, data, formProps.emblemFile, user.id);
      setIsOpen(false);
      formProps.resetForm();
      onSuccess();
    } catch (error) {
      console.error("Error creating team:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) formProps.resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button onClick={() => setIsOpen(true)}>팀 생성</Button>
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
