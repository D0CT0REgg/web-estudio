-- Simulacro de examen: columna de orden + bucket privado de Storage para los PDFs.
-- Copia y pega en Supabase → SQL Editor → New query → Run.

alter table exam_simulations add column if not exists created_at timestamptz not null default now();

-- Bucket privado (no público): los PDFs se sirven vía URL firmada, nunca directamente.
insert into storage.buckets (id, name, public)
values ('exam-pdfs', 'exam-pdfs', false)
on conflict (id) do nothing;

-- Cada archivo se sube con ruta "{user_id}/{exam_id}/archivo.pdf", así que basta con
-- comprobar que el primer segmento de la ruta coincide con tu propio user_id.
create policy "owner_select_exam_pdfs" on storage.objects
  for select using (bucket_id = 'exam-pdfs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "owner_insert_exam_pdfs" on storage.objects
  for insert with check (bucket_id = 'exam-pdfs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "owner_update_exam_pdfs" on storage.objects
  for update using (bucket_id = 'exam-pdfs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "owner_delete_exam_pdfs" on storage.objects
  for delete using (bucket_id = 'exam-pdfs' and auth.uid()::text = (storage.foldername(name))[1]);
