-- Ejecutar en el SQL Editor de Supabase.
-- Añade una columna de orden manual a daily_tasks para el drag & drop de reordenar.
alter table daily_tasks add column if not exists position int;

-- Backfill: a las tareas existentes sin posición se les asigna un orden según su creación.
with ordered as (
  select id, row_number() over (partition by user_id, date order by created_at) as rn
  from daily_tasks
  where position is null
)
update daily_tasks
set position = ordered.rn
from ordered
where daily_tasks.id = ordered.id;

alter table daily_tasks alter column position set default 0;
