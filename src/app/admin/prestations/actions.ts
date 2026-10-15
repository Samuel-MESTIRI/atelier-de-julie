"use server";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/ActionForm";
import { requireAdmin } from "@/lib/auth";
import { checked, int, priceCents, text } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";

/** Crée ou modifie une prestation (+ les coiffeuses qui la réalisent). */
export async function saveService(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = text(formData, "id");
  const name = text(formData, "name", 80);
  const description = text(formData, "description", 200);
  const duration = int(formData, "duration_min", 5, 720);
  const price = priceCents(formData, "price");
  const position = int(formData, "position", 0, 999) ?? 0;
  const stylistIds = formData.getAll("stylists").map(String).filter(isUuid);

  if (name.length < 2) return { error: "Nom trop court." };
  if (duration === null || duration % 5 !== 0) return { error: "Durée invalide (en minutes, multiple de 5)." };
  if (price === null) return { error: "Prix invalide (ex. 35 ou 35,50)." };

  const supabase = await createClient();
  const row = { name, description, duration_min: duration, price_cents: price, position, active: checked(formData, "active") };
  const { data, error } = id
    ? await supabase.from("services").update(row).eq("id", id).select("id").single()
    : await supabase.from("services").insert(row).select("id").single();
  if (error || !data) return { error: "Enregistrement impossible." };

  await supabase.from("stylist_services").delete().eq("service_id", data.id);
  if (stylistIds.length) {
    await supabase.from("stylist_services").insert(stylistIds.map((s) => ({ stylist_id: s, service_id: data.id })));
  }

  revalidatePath("/", "layout");
  return { ok: id ? "Prestation enregistrée." : "Prestation ajoutée." };
}

export async function deleteService(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = text(formData, "id");
  if (!isUuid(id)) return { error: "Demande invalide." };
  const supabase = await createClient();
  // Les rendez-vous passés gardent le nom et le prix (copie figée)
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) return { error: "Suppression impossible." };
  revalidatePath("/", "layout");
  return { ok: "Prestation supprimée." };
}
