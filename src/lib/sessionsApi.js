import { supabase } from "../supabaseClient.js";

export async function saveSession({
  task,
  mode,
  plannedDurationMin,
  actualDurationMin,
  startedAt,
  endedAt,
  completed,
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("sessions").insert({
    user_id: user.id,
    task_id: task.id,
    mode,
    planned_duration_min: plannedDurationMin,
    actual_duration_min: actualDurationMin,
    started_at: new Date(startedAt).toISOString(),
    ended_at: new Date(endedAt).toISOString(),
    subject_tag: task.subject_tag,
    task_type_tag: task.task_type_tag,
    extra_tags: task.extra_tags,
    completed,
  });

  if (error) throw error;
}
