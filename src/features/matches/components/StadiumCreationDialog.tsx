"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { StadiumFormValues, stadiumFormSchema } from "../lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { createStadium } from "../api";
import { AddressSearchDialog } from "./AddressSearchDialog";

interface StadiumCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (stadium: any) => void;
  teamId: string;
}

export function StadiumCreationDialog({
  isOpen,
  onClose,
  onSave,
  teamId,
}: StadiumCreationDialogProps) {
  const { toast } = useToast();
  const [isAddressSearchOpen, setIsAddressSearchOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<StadiumFormValues>({
    resolver: zodResolver(stadiumFormSchema),
    defaultValues: {
      name: "",
      address: "",
      description: "",
    },
  });

  const handleSubmit = async (values: StadiumFormValues) => {
    if (!teamId) {
      toast({
        title: "오류",
        description: "팀 정보를 불러올 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const newStadium = await createStadium({
        teamId,
        name: values.name,
        address: values.address,
        description: values.description || "",
      });

      toast({
        title: "성공",
        description: "경기장이 성공적으로 생성되었습니다.",
      });

      onSave(newStadium);
      onClose();
    } catch (error) {
      console.error("경기장 생성 오류:", error);
      toast({
        title: "오류",
        description: "경기장 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectAddress = (address: string) => {
    form.setValue("address", address);
    setIsAddressSearchOpen(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>새 경기장 추가</DialogTitle>
            <DialogDescription>
              새로운 경기장 정보를 입력해주세요.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>경기장 이름</FormLabel>
                    <FormControl>
                      <Input placeholder="경기장 이름" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>주소</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          placeholder="경기장 주소"
                          {...field}
                          readOnly
                          onClick={() => setIsAddressSearchOpen(true)}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        onClick={() => setIsAddressSearchOpen(true)}
                      >
                        검색
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>설명 (선택사항)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="경기장에 대한 부가 정보를 입력하세요."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  취소
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "저장 중..." : "저장"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AddressSearchDialog
        isOpen={isAddressSearchOpen}
        onClose={() => setIsAddressSearchOpen(false)}
        onSelect={handleSelectAddress}
      />
    </>
  );
}
