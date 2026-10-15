// Vérification de la personne connectée et de son rôle (côté serveur).
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "coiffeuse";

export type Profile = {
  id: string;
  full_name: string;
  role: Role;
  stylist_id: string | null;
};

/** Renvoie le profil de la personne connectée, ou null. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, stylist_id")
    .eq("id", userData.user.id)
    .maybeSingle();
  return (data as Profile | null) ?? null;
}

/** Page réservée au personnel (admin ou coiffeuse). */
export async function requireStaff(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/connexion");
  return profile;
}

/** Page réservée à Julie (admin). */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireStaff();
  if (profile.role !== "admin") redirect("/admin");
  return profile;
}
