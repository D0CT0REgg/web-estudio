-- Simulacro de examen: escala de la nota final (12/20, /40, /5, etc.), no siempre /20.
-- Copia y pega en Supabase → SQL Editor → New query → Run.

alter table exam_simulations add column if not exists grade_out_of numeric not null default 20;
