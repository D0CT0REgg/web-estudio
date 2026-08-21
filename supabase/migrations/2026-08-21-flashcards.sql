-- Tarjetas de memorización (mazos + tarjetas) con repetición espaciada estilo Leitner.
-- Copia y pega en Supabase → SQL Editor → New query → Run.

create table if not exists flashcard_decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  subject_tag text,
  created_at timestamptz not null default now()
);

create table if not exists flashcards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references flashcard_decks on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  front text not null,
  back text not null,
  box_level int not null default 1 check (box_level between 1 and 5),
  next_review_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table flashcard_decks enable row level security;
alter table flashcards enable row level security;

create policy "owner_all_flashcard_decks" on flashcard_decks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_all_flashcards" on flashcards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
