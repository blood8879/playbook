"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@/hooks/use-toast";

import { StadiumFormValues, stadiumFormSchema } from "../lib/schema";
import { createStadium } from "../api";

export function useStadium(
  teamId: string,
  onSaveCallback: (stadium: any) => void
) {
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);

  const form = useForm<StadiumFormValues>({
    resolver: zodResolver(stadiumFormSchema),
    defaultValues: {
      name: "",
      address: "",
      teamId: teamId,
    },
  });

  const openAddressDialog = () => setIsAddressDialogOpen(true);
  const closeAddressDialog = () => setIsAddressDialogOpen(false);

  const selectAddress = (address: string) => {
    form.setValue("address", address);
    closeAddressDialog();
  };

  const handleSubmit = async (values: StadiumFormValues) => {
    try {
      const stadium = await createStadium(values as any);
      toast({
        title: "경기장이 성공적으로 생성되었습니다.",
      });
      onSaveCallback(stadium);
      return stadium;
    } catch (error) {
      toast({
        title: "경기장 생성 중 오류가 발생했습니다.",
      });
      console.error(error);
      return null;
    }
  };

  return {
    form,
    isAddressDialogOpen,
    openAddressDialog,
    closeAddressDialog,
    selectAddress,
    handleSubmit,
  };
}
