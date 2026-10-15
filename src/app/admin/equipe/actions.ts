"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/ActionForm";
import { requireAdmin } from "@/lib/auth";
import { checked, int, isColor, text } from "@/lib/form";
import { DAY_NAMES, readDay } from "@/lib/hours";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cleanEmail, cleanName, isUuid } from "@/lib/validation";

export async function createStylist(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const name = cleanName(formData.get("name"));
  const color = text(formData, "color");
  if (!name) return { error: "Prénom invalide." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stylists").insert({ name, color: isColor(color) ? color : "#9CAF88", position: 99 }).select("id").single();
  if (error || !data) return { error: "Création impossible." };
  redirect(`/admin/equipe/${data.id}`);
}

export async function saveStylist(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = text(formData, "id");
  const name = cleanName(formData.get("name"));
  const color = text(formData, "color");
  if (!isUuid(id) || !name || !isColor(color)) return { error: "Informations invalides." };
  const supabase = await createClient();
  const { error } = await supabase.from("stylists").update({
    name, color, active: checked(formData, "active"), position: int(formData, "position", 0, 999) ?? 0,
  }).eq("id", id);
  if (error) return { error: "Enregistrement impossible." };
  revalidatePath("/", "layout");
  return { ok: "Fiche enregistrée." };
}

/** Horaires propres : pour chaque jour "salon" (pas de ligne), "off" ou "custom". */
export async function saveStylistHours(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = text(formData, "id");
  if (!isUuid(id)) return { error: "Demande invalide." };

  const rows = [];
  for (let d = 1; d <= 7; d++) {
    const mode = text(formData, `d${d}_mode`);
    if (mode === "off") rows.push({ stylist_id: id, weekday: d, is_working: false, start_time: null, end_time: null, break_start: null, break_end: null });
    if (mode === "custom") {
      formData.set(`d${d}_open`, "on");
      const day = readDay(formData, `d${d}_`);
      if (typeof day === "string") return { error: `${DAY_NAMES[d]} : ${day}.` };
      rows.push({ stylist_id: id, weekday: d, is_working: true, start_time: day.open_time, end_time: day.close_time, break_start: day.break_start, break_end: day.break_end });
    }
  }

  const supabase = await createClient();
  await supabase.from("stylist_hours").delete().eq("stylist_id", id);
  if (rows.length) {
    const { error } = await supabase.from("stylist_hours").insert(rows);
    if (error) return { error: "Enregistrement impossible." };
  }
  revalidatePath("/admin", "layout");
  return { ok: "Horaires enregistrés." };
}

export async function saveStylistServices(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = text(formData, "id");
  if (!isUuid(id)) return { error: "Demande invalide." };
  const serviceIds = formData.getAll("services").map(String).filter(isUuid);
  const supabase = await createClient();
  await supabase.from("stylist_services").delete().eq("stylist_id", id);
  if (serviceIds.length) {
    await supabase.from("stylist_services").insert(serviceIds.map((s) => ({ stylist_id: id, service_id: s })));
  }
  revalidatePath("/", "layout");
  return { ok: "Prestations enregistrées." };
}

/** Crée l'accès au back-office d'une coiffeuse (rôle "coiffeuse"). */
export async function createAccess(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = text(formData, "id");
  const email = cleanEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  if (!isUuid(id) || !email) return { error: "Email invalide." };
  if (password.length < 10) return { error: "Mot de passe : 10 caractères minimum." };

  // La création de compte nécessite la clé secrète (serveur uniquement)
  const admin = createAdminClient();
  const { data: stylist } = await admin.from("stylists").select("name").eq("id", id).single();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) return { error: "Création impossible (email déjà utilisé ?)." };
  await admin.from("profiles").insert({ id: data.user.id, full_name: stylist?.name ?? "", role: "coiffeuse", stylist_id: id });

  revalidatePath(`/admin/equipe/${id}`);
  return { ok: "Accès créé. Communiquez l'email et le mot de passe à la coiffeuse." };
}

export async function resetPassword(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const userId = text(formData, "userId");
  const password = String(formData.get("password") ?? "");
  if (!isUuid(userId)) return { error: "Demande invalide." };
  if (password.length < 10) return { error: "Mot de passe : 10 caractères minimum." };
  const { error } = await createAdminClient().auth.admin.updateUserById(userId, { password });
  if (error) return { error: "Modification impossible." };
  return { ok: "Nouveau mot de passe enregistré." };
}
