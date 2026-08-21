import { supabase } from "../supabaseClient.js";

export async function fetchTrimesters() {
  const { data, error } = await supabase.from("trimesters").select("*").order("trimester_number", { ascending: true });
  if (error) throw error;
  return data;
}

export async function saveTrimester({ trimesterNumber, academicYear, startDate, endDate }) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("trimesters").upsert(
    {
      user_id: user.id,
      trimester_number: trimesterNumber,
      academic_year: academicYear,
      start_date: startDate,
      end_date: endDate,
    },
    { onConflict: "user_id,academic_year,trimester_number" }
  );

  if (error) throw error;
}
