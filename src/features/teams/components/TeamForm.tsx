"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { area } from "@/constants/area";
import { TeamFormData } from "../types";
import { PositionSelector } from "./PositionSelector";
import { NumberSelector } from "./NumberSelector";

interface TeamFormProps {
  onSubmit: (event?: React.BaseSyntheticEvent) => Promise<void>;
  isUploading: boolean;
  emblemFile: File | null;
  previewUrl: string | null;
  selectedCity: string;
  selectedGu: string;
  errors: any;
  register: any;
  handleCityChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleGuChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  setEmblemFile: (file: File | null) => void;
  setPreviewUrl: (url: string | null) => void;
}

export function TeamForm({
  onSubmit,
  isUploading,
  emblemFile,
  previewUrl,
  selectedCity,
  selectedGu,
  errors,
  register,
  handleCityChange,
  handleGuChange,
  handleFileChange,
  handleDrop,
  setEmblemFile,
  setPreviewUrl,
}: TeamFormProps) {
  const guList = area.find((a) => a.name === selectedCity)?.subArea || [];

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Input placeholder="팀 이름" {...register("name")} />
        {errors.name && (
          <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
        )}
      </div>
      <div>
        <Input placeholder="설명" {...register("description")} />
        {errors.description && (
          <p className="text-sm text-red-500 mt-1">
            {errors.description.message}
          </p>
        )}
      </div>
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer",
          "hover:border-primary transition-colors",
          "relative"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        {previewUrl ? (
          <div className="relative w-32 h-32 mx-auto">
            <img
              src={previewUrl}
              alt="엠블럼 미리보기"
              className="w-full h-full object-cover rounded-lg"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2"
              onClick={(e) => {
                e.stopPropagation();
                setEmblemFile(null);
                setPreviewUrl(null);
              }}
            >
              X
            </Button>
          </div>
        ) : (
          <div className="py-4">
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              엠블럼 이미지를 드래그하거나 클릭하여 업로드
            </p>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <select
          value={selectedCity}
          onChange={handleCityChange}
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        >
          <option value="">시/도 선택</option>
          {area.map((city) => (
            <option key={city.name} value={city.name}>
              {city.name}
            </option>
          ))}
        </select>
        {errors.city && (
          <p className="text-sm text-red-500">{errors.city.message}</p>
        )}
      </div>
      {selectedCity && (
        <div className="space-y-2">
          <select
            value={selectedGu}
            onChange={handleGuChange}
            className="w-full rounded-md border border-input bg-background px-3 py-2"
          >
            <option value="">구 선택</option>
            {guList.map((gu) => (
              <option key={gu} value={gu}>
                {gu}
              </option>
            ))}
          </select>
          {errors.gu && (
            <p className="text-sm text-red-500">{errors.gu.message}</p>
          )}
        </div>
      )}
      <Button type="submit" className="w-full" disabled={isUploading}>
        {isUploading ? "업로드 중..." : "생성"}
      </Button>
    </form>
  );
}
