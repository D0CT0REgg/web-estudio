-- Esquema inicial de "Web estudio" para Supabase (Postgres).
-- Ejecutar completo en el SQL Editor del panel de Supabase (Project → SQL Editor → New query).
-- Reflejo del esquema acordado en context/PROJECT_CONTEXT.md sección 4, con RLS añadido.

create extension if not exists "pgcrypto";

-- Tareas rápidas del día (aquí viven las tags: asignatura, tipo, prioridad)
create table if not exists daily_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  title text not null,
  subject_tag text not null, -- asignatura normal o "Brevet - X" (misma columna, ver PROJECT_CONTEXT.md sección 5)
  task_type_tag text not null,
  extra_tags jsonb,
  notes text, -- nota/detalle libre, opcional
  done boolean not null default false,
  position int not null default 0, -- orden manual (drag & drop) dentro del día
  created_at timestamptz not null default now()
);

-- Sesiones de estudio (Pomodoro, 52-17, Flowtime, cronómetro)
-- Cada sesión se vincula a la tarea del día que se estaba trabajando (task_id);
-- las tags se copian de esa tarea al crear la sesión para que las estadísticas
-- se sigan calculando consultando "sessions" directamente, sin joins.
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  task_id uuid references daily_tasks on delete set null,
  mode text not null check (mode in ('pomodoro', '52-17', 'flowtime', 'stopwatch')),
  planned_duration_min int,
  actual_duration_min int,
  started_at timestamptz,
  ended_at timestamptz,
  subject_tag text not null,
  task_type_tag text,
  extra_tags jsonb,
  completed boolean not null default false
);

-- Objetivo general del día
create table if not exists daily_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  goal_text text,
  unique (user_id, date)
);

-- Contrato firmado (registro único por usuario)
create table if not exists contract (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  signature_image text not null,
  signed_at timestamptz not null default now(),
  past_self_comment text,
  unique (user_id)
);

-- Simulacros de examen
create table if not exists exam_simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  subject_tag text,
  extra_tags jsonb,
  scheduled_at timestamptz,
  duration_min int,
  needed_items jsonb,
  rules_text text,
  pdf_storage_path text,
  correction_pdf_storage_path text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'pending_correction', 'corrected')),
  started_at timestamptz,
  ended_at timestamptz,
  corrected_at timestamptz,
  final_grade numeric
);

-- Errores registrados al corregir un simulacro (uno por pregunta/bloque fallado)
create table if not exists exam_errors (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exam_simulations on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  topic text,
  error_type text,
  comment text
);

-- Configuración de fechas de trimestres (editable desde Ajustes)
create table if not exists trimesters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  trimester_number int not null check (trimester_number in (1, 2, 3)),
  academic_year text not null,
  start_date date not null,
  end_date date not null,
  unique (user_id, academic_year, trimester_number)
);

-- === Row Level Security ===
-- Activa RLS y añade una única política por tabla: el usuario solo puede
-- leer/escribir filas donde user_id coincide con su propio auth.uid().
-- Necesario porque el código y el sitio publicado son de acceso público.

alter table sessions enable row level security;
alter table daily_tasks enable row level security;
alter table daily_goals enable row level security;
alter table contract enable row level security;
alter table exam_simulations enable row level security;
alter table exam_errors enable row level security;
alter table trimesters enable row level security;

create policy "owner_all_sessions" on sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_all_daily_tasks" on daily_tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_all_daily_goals" on daily_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_all_contract" on contract
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_all_exam_simulations" on exam_simulations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_all_exam_errors" on exam_errors
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_all_trimesters" on trimesters
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
