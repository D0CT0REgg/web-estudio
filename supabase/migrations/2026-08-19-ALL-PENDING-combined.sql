-- Combinado de las 4 migraciones pendientes a fecha 19/08/2026.
-- Copia y pega TODO este archivo en Supabase → SQL Editor → New query → Run.
-- Seguro de ejecutar de una sentada: usa "if not exists" y comprobaciones,
-- no borra datos.

-- 1) sessions -> daily_tasks
alter table sessions
  add column if not exists task_id uuid references daily_tasks on delete set null;

-- 2) task_type_tag obligatorio
update daily_tasks set task_type_tag = 'Otro' where task_type_tag is null;
alter table daily_tasks alter column task_type_tag set not null;

-- 3) orden manual (drag & drop)
alter table daily_tasks add column if not exists position int;

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

-- 4) nota/detalle opcional
alter table daily_tasks add column if not exists notes text;
