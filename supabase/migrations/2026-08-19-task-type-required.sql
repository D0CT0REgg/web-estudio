-- Ejecutar en el SQL Editor de Supabase. Hace obligatorio el tipo de tarea (task_type_tag).
-- El UPDATE es un colchón de seguridad por si hay alguna fila con el tipo vacío
-- (no debería haberla si aún no has creado tareas reales desde la web).
update daily_tasks set task_type_tag = 'Otro' where task_type_tag is null;
alter table daily_tasks alter column task_type_tag set not null;
