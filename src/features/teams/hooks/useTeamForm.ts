import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TeamFormData, teamSchema } from "../types";

export function useTeamForm() {
  const [emblemFile, setEmblemFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedGu, setSelectedGu] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
  });

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const city = e.target.value;
    setSelectedCity(city);
    setSelectedGu("");
    setValue("city", city);
    setValue("gu", "");
  };

  const handleGuChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const gu = e.target.value;
    setSelectedGu(gu);
    setValue("gu", gu);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEmblemFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setEmblemFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const resetForm = () => {
    reset();
    setEmblemFile(null);
    setPreviewUrl(null);
    setSelectedCity("");
    setSelectedGu("");
  };

  return {
    emblemFile,
    previewUrl,
    selectedCity,
    selectedGu,
    errors,
    register,
    handleSubmit,
    handleCityChange,
    handleGuChange,
    handleFileChange,
    handleDrop,
    resetForm,
    setEmblemFile,
    setPreviewUrl,
  };
}
