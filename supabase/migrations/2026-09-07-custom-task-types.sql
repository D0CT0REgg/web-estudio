-- Ejecutar en el SQL Editor de Supabase.
-- Lista de tipos de tarea personalizados por usuario (además de los fijos de la app),
-- gestionable desde Ajustes. Mismo patrón que checklist_items: un array jsonb en user_settings.
alter table user_settings add column if not exists custom_task_types jsonb not null default '[]'::jsonb;
