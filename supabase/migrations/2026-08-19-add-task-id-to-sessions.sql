-- Ejecutar en el SQL Editor de Supabase (Project → SQL Editor → New query).
-- Añade el enlace sessions -> daily_tasks que faltaba. Seguro de ejecutar aunque
-- ya tengas las tablas creadas: no borra nada, solo añade la columna si no existe.

alter table sessions
  add column if not exists task_id uuid references daily_tasks on delete set null;
