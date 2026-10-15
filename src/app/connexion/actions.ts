"use server";
// Actions serveur de connexion / déconnexion du back-office.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Merci de renseigner votre email et votre mot de passe." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // Message volontairement vague : on ne dit pas si l'email existe
  if (error) return { error: "Email ou mot de passe incorrect." };

  redirect("/admin");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
