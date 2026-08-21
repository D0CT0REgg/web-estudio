import { supabase } from "../supabaseClient.js";

export async function fetchAllSessions() {
  const { data, error } = await supabase.from("sessions").select("*").order("started_at", { ascending: true });
  if (error) throw error;
  return data;
}
