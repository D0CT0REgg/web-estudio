import { supabase } from "../supabaseClient.js";

export function todayDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export async function fetchTodayTasks() {
  const { data, error } = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("date", todayDate())
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createTask({ title, subjectTag, taskTypeTag, priorityTag, notes, position }) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("daily_tasks")
    .insert({
      user_id: user.id,
      date: todayDate(),
      title,
      subject_tag: subjectTag,
      task_type_tag: taskTypeTag,
      extra_tags: priorityTag ? { priority: priorityTag } : null,
      notes: notes || null,
      position: position ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTask(taskId, { title, subjectTag, taskTypeTag, priorityTag, notes }) {
  const { data, error } = await supabase
    .from("daily_tasks")
    .update({
      title,
      subject_tag: subjectTag,
      task_type_tag: taskTypeTag,
      extra_tags: priorityTag ? { priority: priorityTag } : null,
      notes: notes || null,
    })
    .eq("id", taskId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function setTaskDone(taskId, done) {
  const { error } = await supabase.from("daily_tasks").update({ done }).eq("id", taskId);
  if (error) throw error;
}

export async function deleteTask(taskId) {
  const { error } = await supabase.from("daily_tasks").delete().eq("id", taskId);
  if (error) throw error;
}

/** Recibe la lista de tareas ya en el orden final y persiste esa posición. */
export async function reorderTasks(orderedTasks) {
  const updates = orderedTasks.map((task, index) =>
    supabase.from("daily_tasks").update({ position: index }).eq("id", task.id)
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed) throw failed.error;
}

export async function fetchTodayGoal() {
  const { data, error } = await supabase
    .from("daily_goals")
    .select("*")
    .eq("date", todayDate())
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveTodayGoal(goalText) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("daily_goals")
    .upsert(
      { user_id: user.id, date: todayDate(), goal_text: goalText },
      { onConflict: "user_id,date" }
    );

  if (error) throw error;
}
