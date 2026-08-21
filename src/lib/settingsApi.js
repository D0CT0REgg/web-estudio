import { supabase } from "../supabaseClient.js";

export const DEFAULT_CHECKLIST_ITEMS = [
  "Agua a mano",
  "Móvil en silencio (o en otra habitación)",
  "He ido al baño",
  "Tengo el material que necesito a mano",
  "Modo no molestar activado en Discord",
  "Estado de Discord puesto en \"Estudiando...\"",
];

export const DEFAULT_USER_SETTINGS = {
  default_pomodoro_work_min: 25,
  default_pomodoro_break_min: 5,
  default_5217_work_min: 52,
  default_5217_break_min: 17,
  checklist_items: DEFAULT_CHECKLIST_ITEMS,
};

export async function fetchUserSettings() {
  const { data, error } = await supabase.from("user_settings").select("*").maybeSingle();
  if (error) throw error;
  return data ? { ...DEFAULT_USER_SETTINGS, ...data } : { ...DEFAULT_USER_SETTINGS };
}

export async function saveUserSettings(partial) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const current = await fetchUserSettings();
  const merged = { ...current, ...partial };

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      default_pomodoro_work_min: merged.default_pomodoro_work_min,
      default_pomodoro_break_min: merged.default_pomodoro_break_min,
      default_5217_work_min: merged.default_5217_work_min,
      default_5217_break_min: merged.default_5217_break_min,
      checklist_items: merged.checklist_items,
    },
    { onConflict: "user_id" }
  );

  if (error) throw error;
}

/**
 * Borra todo el historial de actividad de estudio del usuario (sesiones, tareas,
 * objetivos del día, simulacros de examen y la firma del contrato, que vuelve a
 * quedar sin firmar). No toca los ajustes (trimestres, modos por defecto, checklist).
 */
export async function resetAllStudyData() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Los PDFs de los simulacros viven en Storage, no en la tabla: hay que borrarlos
  // aparte antes de borrar las filas, o quedarían huérfanos.
  const { data: exams, error: examsError } = await supabase
    .from("exam_simulations")
    .select("pdf_storage_path, correction_pdf_storage_path")
    .eq("user_id", user.id);
  if (examsError) throw examsError;

  const pdfPaths = (exams || []).flatMap((e) => [e.pdf_storage_path, e.correction_pdf_storage_path]).filter(Boolean);
  if (pdfPaths.length > 0) {
    const { error: removeError } = await supabase.storage.from("exam-pdfs").remove(pdfPaths);
    if (removeError) throw removeError;
  }

  const tables = ["sessions", "daily_tasks", "daily_goals", "exam_simulations", "contract"];
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq("user_id", user.id);
    if (error) throw error;
  }
}
