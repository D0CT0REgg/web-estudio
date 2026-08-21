import { supabase } from "../supabaseClient.js";
import { computeReviewOutcome } from "./flashcardsCalc.js";

async function currentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user.id;
}

export async function fetchDecks() {
  const { data, error } = await supabase.from("flashcard_decks").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchDeck(deckId) {
  const { data, error } = await supabase.from("flashcard_decks").select("*").eq("id", deckId).single();
  if (error) throw error;
  return data;
}

export async function createDeck({ title, subjectTag }) {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("flashcard_decks")
    .insert({ user_id: userId, title, subject_tag: subjectTag || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateDeck(deckId, { title, subjectTag }) {
  const { data, error } = await supabase
    .from("flashcard_decks")
    .update({ title, subject_tag: subjectTag || null })
    .eq("id", deckId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDeck(deckId) {
  const { error } = await supabase.from("flashcard_decks").delete().eq("id", deckId);
  if (error) throw error;
}

/** Solo id/deck_id/next_review_at de todas las tarjetas del usuario, para calcular
 * cuántas hay pendientes por mazo en la lista sin pedir el contenido de cada una. */
export async function fetchAllCardsMeta() {
  const { data, error } = await supabase.from("flashcards").select("id, deck_id, next_review_at");
  if (error) throw error;
  return data;
}

export async function fetchCards(deckId) {
  const { data, error } = await supabase
    .from("flashcards")
    .select("*")
    .eq("deck_id", deckId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createCard(deckId, { front, back }) {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("flashcards")
    .insert({ deck_id: deckId, user_id: userId, front, back })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCard(cardId, { front, back }) {
  const { data, error } = await supabase.from("flashcards").update({ front, back }).eq("id", cardId).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCard(cardId) {
  const { error } = await supabase.from("flashcards").delete().eq("id", cardId);
  if (error) throw error;
}

/** Registra el resultado del repaso (Leitner) y persiste la nueva caja/fecha de la tarjeta. */
export async function reviewCard(card, remembered) {
  const { boxLevel, nextReviewAt } = computeReviewOutcome(card.box_level, remembered);
  const { error } = await supabase
    .from("flashcards")
    .update({ box_level: boxLevel, next_review_at: nextReviewAt })
    .eq("id", card.id);
  if (error) throw error;
  return { boxLevel, nextReviewAt };
}
