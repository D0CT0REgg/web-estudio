import { supabase } from "../supabaseClient.js";

export async function fetchContract() {
  const { data, error } = await supabase.from("contract").select("*").maybeSingle();
  if (error) throw error;
  return data;
}

export async function signContract({ signatureImage, pastSelfComment }) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("contract")
    .insert({
      user_id: user.id,
      signature_image: signatureImage,
      past_self_comment: pastSelfComment || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
