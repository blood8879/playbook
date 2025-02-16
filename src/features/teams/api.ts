import { SupabaseClient } from "@supabase/supabase-js";
import { TeamFormData, Team } from "./types";

export async function searchTeams(
  supabase: SupabaseClient,
  searchQuery: string
) {
  const query = supabase
    .from("teams")
    .select("*")
    .order("created_at", { ascending: false });

  if (searchQuery) {
    query.ilike("name", `%${searchQuery}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Team[];
}

export async function createTeam(
  supabase: SupabaseClient,
  data: TeamFormData,
  emblemFile: File | null,
  userId: string
) {
  let emblem_url = null;

  if (emblemFile) {
    const fileExt = emblemFile.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
    const filePath = `team-emblems/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("teams")
      .upload(filePath, emblemFile);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("teams")
      .getPublicUrl(filePath);

    emblem_url = urlData.publicUrl;
  }

  const { error } = await supabase.from("teams").insert({
    ...data,
    emblem_url,
    leader_id: userId,
  });

  if (error) throw error;
}
