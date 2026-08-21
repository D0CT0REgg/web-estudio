import { supabase } from "../supabaseClient.js";

const BUCKET = "exam-pdfs";

async function currentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user.id;
}

export async function fetchExamSimulations() {
  const { data, error } = await supabase
    .from("exam_simulations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchExamSimulation(examId) {
  const { data, error } = await supabase.from("exam_simulations").select("*").eq("id", examId).single();
  if (error) throw error;
  return data;
}

export async function fetchExamErrors(examId) {
  const { data, error } = await supabase.from("exam_errors").select("*").eq("exam_id", examId);
  if (error) throw error;
  return data;
}

/** Supabase Storage rechaza claves con comillas, acentos u otros caracteres fuera de
 * ASCII básico — se limpia el nombre para no depender de cómo se llame el PDF original. */
function sanitizeFileName(name) {
  const diacriticsRange = String.fromCharCode(0x300) + "-" + String.fromCharCode(0x36f);
  const diacritics = new RegExp("[" + diacriticsRange + "]", "g");
  const cleaned = name
    .normalize("NFD")
    .replace(diacritics, "")
    .replace(/[^a-zA-Z0-9.\-_]/g, "_");
  return cleaned || "archivo.pdf";
}

async function uploadExamPdf(examId, file, kind) {
  const userId = await currentUserId();
  const path = `${userId}/${examId}/${kind}-${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

/** URL firmada temporal para mostrar un PDF privado en el visor (el bucket no es público). */
export async function getSignedPdfUrl(path) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 30);
  if (error) throw error;
  return data.signedUrl;
}

export async function createExamSimulation({
  title,
  subjectTag,
  extraTags,
  scheduledAt,
  durationMin,
  neededItems,
  rulesText,
  pdfFile,
  correctionPdfFile,
}) {
  const userId = await currentUserId();

  const { data: inserted, error: insertError } = await supabase
    .from("exam_simulations")
    .insert({
      user_id: userId,
      title,
      subject_tag: subjectTag || null,
      extra_tags: extraTags || null,
      scheduled_at: scheduledAt || null,
      duration_min: durationMin || null,
      needed_items: neededItems || null,
      rules_text: rulesText || null,
      status: "scheduled",
    })
    .select()
    .single();
  if (insertError) throw insertError;

  // Si falla la subida del PDF, no dejamos la fila a medias (sin PDF asociado) —
  // se borra y se propaga el error para que el usuario pueda reintentar limpio.
  try {
    const updatePayload = { pdf_storage_path: await uploadExamPdf(inserted.id, pdfFile, "enunciado") };
    if (correctionPdfFile) {
      updatePayload.correction_pdf_storage_path = await uploadExamPdf(inserted.id, correctionPdfFile, "correccion");
    }

    const { data: updated, error: updateError } = await supabase
      .from("exam_simulations")
      .update(updatePayload)
      .eq("id", inserted.id)
      .select()
      .single();
    if (updateError) throw updateError;

    return updated;
  } catch (err) {
    await supabase.from("exam_simulations").delete().eq("id", inserted.id);
    throw err;
  }
}

export async function updateExamSimulation(examId, { title, subjectTag, extraTags, scheduledAt, durationMin, neededItems, rulesText }) {
  const { data, error } = await supabase
    .from("exam_simulations")
    .update({
      title,
      subject_tag: subjectTag || null,
      extra_tags: extraTags || null,
      scheduled_at: scheduledAt || null,
      duration_min: durationMin || null,
      needed_items: neededItems || null,
      rules_text: rulesText || null,
    })
    .eq("id", examId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteExamSimulation(exam) {
  const paths = [exam.pdf_storage_path, exam.correction_pdf_storage_path].filter(Boolean);
  if (paths.length > 0) {
    await supabase.storage.from(BUCKET).remove(paths);
  }
  const { error } = await supabase.from("exam_simulations").delete().eq("id", exam.id);
  if (error) throw error;
}

export async function startExam(examId) {
  const { error } = await supabase
    .from("exam_simulations")
    .update({ status: "in_progress", started_at: new Date().toISOString() })
    .eq("id", examId);
  if (error) throw error;
}

export async function finishExam(examId) {
  const { error } = await supabase
    .from("exam_simulations")
    .update({ status: "pending_correction", ended_at: new Date().toISOString() })
    .eq("id", examId);
  if (error) throw error;
}

export async function replaceExamPdf(examId, file) {
  const path = await uploadExamPdf(examId, file, "enunciado");
  const { error } = await supabase.from("exam_simulations").update({ pdf_storage_path: path }).eq("id", examId);
  if (error) throw error;
  return path;
}

export async function uploadCorrectionPdf(examId, file) {
  const path = await uploadExamPdf(examId, file, "correccion");
  const { error } = await supabase
    .from("exam_simulations")
    .update({ correction_pdf_storage_path: path })
    .eq("id", examId);
  if (error) throw error;
  return path;
}

/** Guarda la nota final (sobre `gradeOutOf`, ej. /20, /40, /5) y los errores registrados,
 * y marca el simulacro como corregido. */
export async function saveCorrection(examId, { finalGrade, gradeOutOf, errors }) {
  const userId = await currentUserId();

  if (errors.length > 0) {
    const { error: errorsError } = await supabase.from("exam_errors").insert(
      errors.map((e) => ({
        exam_id: examId,
        user_id: userId,
        topic: e.topic || null,
        error_type: e.errorType || null,
        comment: e.comment || null,
      }))
    );
    if (errorsError) throw errorsError;
  }

  const { error } = await supabase
    .from("exam_simulations")
    .update({
      final_grade: finalGrade,
      grade_out_of: gradeOutOf,
      status: "corrected",
      corrected_at: new Date().toISOString(),
    })
    .eq("id", examId);
  if (error) throw error;
}
