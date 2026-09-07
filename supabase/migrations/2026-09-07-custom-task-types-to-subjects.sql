-- Ejecutar en el SQL Editor de Supabase.
-- Los tags personalizables pasan de ser "tipos de tarea" a "asignaturas personalizadas":
-- se renombra la columna (conserva los datos que hubiera, probablemente ninguno todavía).
alter table user_settings rename column custom_task_types to custom_subjects;
