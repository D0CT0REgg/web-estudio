-- Ejecutar en el SQL Editor de Supabase.
-- Permite elegir varios tipos de tarea (hasta 3, validado en la app) en vez de uno solo:
-- task_type_tag pasa de texto a array de texto. Los valores existentes se envuelven en un
-- array de un elemento para no perder datos.
alter table daily_tasks alter column task_type_tag type text[] using array[task_type_tag];
alter table sessions alter column task_type_tag type text[]
  using case when task_type_tag is null then null else array[task_type_tag] end;
