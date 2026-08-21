-- Ajustes: modos de estudio por defecto y checklist personalizable.
-- Copia y pega en Supabase → SQL Editor → New query → Run.

create table if not exists user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade unique,
  default_pomodoro_work_min int not null default 25,
  default_pomodoro_break_min int not null default 5,
  default_5217_work_min int not null default 52,
  default_5217_break_min int not null default 17,
  checklist_items jsonb not null default '[
    "Agua a mano",
    "Móvil en silencio (o en otra habitación)",
    "He ido al baño",
    "Tengo el material que necesito a mano",
    "Modo no molestar activado en Discord",
    "Estado de Discord puesto en \"Estudiando...\""
  ]'::jsonb
);

alter table user_settings enable row level security;

create policy "owner_all_user_settings" on user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
