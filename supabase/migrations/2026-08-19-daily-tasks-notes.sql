-- Ejecutar en el SQL Editor de Supabase.
-- Nota/detalle opcional de texto libre en cada tarea.
alter table daily_tasks add column if not exists notes text;
