"use server";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/ActionForm";
import { requireAdmin } from "@/lib/auth";
import { checked, text, time } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import { addDays, isDateString, parisToUtc } from "@/lib/time";
import { isUuid } from "@/lib/validation";

/** Nombre de rendez-vous confirmés sur une période (pour prévenir Julie). */
async function conflicts(from: Date, to: Date, stylistId?: string) {
  const supabase = await createClient();
  let q = supabase.from("appointments").select("id", { count: "exact", head: true })
    .eq("status", "confirme").lt("starts_at", to.toISOString()).gt("ends_at", from.toISOString());
  if (stylistId) q = q.eq("stylist_id", stylistId);
  const { count } = await q;
  return count ?? 0;
}

const warning = (n: number) =>
  n > 0 ? ` ⚠ ${n} rendez-vous déjà pris sur cette période : pensez à prévenir les clientes (ou à les annuler depuis le planning).` : "";

export async function addClosure(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const start = text(formData, "start_date");
  const end = text(formData, "end_date") || start;
  const reason = text(formData, "reason", 100);
  if (!isDateString(start) || !isDateString(end) || end < start) return { error: "Dates invalides." };

  const supabase = await createClient();
  const { error } = await supabase.from("salon_closures").insert({ start_date: start, end_date: end, reason });
  if (error) return { error: "Enregistrement impossible." };
  const n = await conflicts(parisToUtc(start, "00:00"), parisToUtc(addDays(end, 1), "00:00"));
  revalidatePath("/admin", "layout");
  return { ok: "Fermeture ajoutée." + warning(n) };
}

export async function addAbsence(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const stylistId = text(formData, "stylist_id");
  const start = text(formData, "start_date");
  const end = text(formData, "end_date") || start;
  const reason = text(formData, "reason", 100);
  const fullDay = checked(formData, "full_day");
  const startTime = fullDay ? "00:00" : time(formData, "start_time");
  const endTime = fullDay ? null : time(formData, "end_time");

  if (!isUuid(stylistId)) return { error: "Choisissez une coiffeuse." };
  if (!isDateString(start) || !isDateString(end) || end < start) return { error: "Dates invalides." };
  if (!startTime || (!fullDay && !endTime)) return { error: "Indiquez les heures, ou cochez « journée entière »." };

  // Journée entière : jusqu'au lendemain 00:00 du dernier jour
  const from = parisToUtc(start, startTime);
  const to = fullDay ? parisToUtc(addDays(end, 1), "00:00") : parisToUtc(end, endTime!);
  if (from >= to) return { error: "La fin doit être après le début." };

  const supabase = await createClient();
  const { error } = await supabase.from("stylist_absences").insert({
    stylist_id: stylistId, start_at: from.toISOString(), end_at: to.toISOString(), reason,
  });
  if (error) return { error: "Enregistrement impossible." };
  const n = await conflicts(from, to, stylistId);
  revalidatePath("/admin", "layout");
  return { ok: "Absence ajoutée." + warning(n) };
}

export async function deleteClosure(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = text(formData, "id");
  if (!isUuid(id)) return { error: "Demande invalide." };
  const supabase = await createClient();
  await supabase.from("salon_closures").delete().eq("id", id);
  revalidatePath("/admin", "layout");
  return { ok: "Supprimée." };
}

export async function deleteAbsence(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = text(formData, "id");
  if (!isUuid(id)) return { error: "Demande invalide." };
  const supabase = await createClient();
  await supabase.from("stylist_absences").delete().eq("id", id);
  revalidatePath("/admin", "layout");
  return { ok: "Supprimée." };
}
