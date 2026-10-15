"use server";
// Actions de Julie sur les rendez-vous : statut, et saisie d'un rendez-vous pris par téléphone.
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/ActionForm";
import { requireAdmin } from "@/lib/auth";
import { getAvailability } from "@/lib/availability";
import { text } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import { isDateString } from "@/lib/time";
import { cleanEmail, cleanName, isUuid, normalizePhone } from "@/lib/validation";

const STATUSES = ["confirme", "annule", "venue", "absente"] as const;

/** Change le statut d'un rendez-vous et recalcule le compteur d'absences de la cliente. */
export async function setStatus(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = text(formData, "id");
  const status = text(formData, "status") as (typeof STATUSES)[number];
  if (!isUuid(id) || !STATUSES.includes(status)) return { error: "Demande invalide." };

  const supabase = await createClient();
  const { data: rdv, error } = await supabase
    .from("appointments")
    .update({ status, cancelled_at: status === "annule" ? new Date().toISOString() : null })
    .eq("id", id)
    .select("client_id")
    .single();
  if (error || !rdv) return { error: "Mise à jour impossible." };

  // Compteur d'absences toujours recalculé (juste même si on corrige une erreur)
  const { count } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("client_id", rdv.client_id)
    .eq("status", "absente");
  await supabase.from("clients").update({ no_show_count: count ?? 0 }).eq("id", rdv.client_id);

  revalidatePath("/admin", "layout");
  return { ok: "Statut mis à jour." };
}

/** Créneaux libres pour la saisie d'un rendez-vous par le salon (sans délai minimum). */
export async function fetchStaffSlots(serviceId: string, stylistId: string, date: string) {
  await requireAdmin();
  if (!isUuid(serviceId) || !isUuid(stylistId) || !isDateString(date)) return [];
  const day = (await getAvailability({ serviceId, stylistId, from: date, to: date, staff: true })).get(date);
  return (day?.slots ?? []).map((s) => s.start);
}

/** Recherche d'une cliente existante par téléphone (pré-remplissage). */
export async function findClient(phoneInput: string) {
  await requireAdmin();
  const phone = normalizePhone(phoneInput);
  if (!phone) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("full_name, email, no_show_count").eq("phone", phone).maybeSingle();
  return data;
}

export async function createStaffBooking(formData: FormData): Promise<ActionResult & { id?: string }> {
  await requireAdmin();
  const serviceId = text(formData, "serviceId");
  const stylistId = text(formData, "stylistId");
  const date = text(formData, "date");
  const start = text(formData, "start");
  const name = cleanName(formData.get("name"));
  const phone = normalizePhone(formData.get("phone"));
  const emailInput = text(formData, "email");
  const email = emailInput ? cleanEmail(emailInput) : "";
  const notes = text(formData, "notes", 500);

  if (!isUuid(serviceId) || !isUuid(stylistId) || !isDateString(date) || !start) {
    return { error: "Choisissez une prestation, une coiffeuse, un jour et une heure." };
  }
  if (!name) return { error: "Nom de la cliente manquant." };
  if (!phone) return { error: "Téléphone invalide." };
  if (email === null) return { error: "Email invalide (ou laissez vide)." };

  const day = (await getAvailability({ serviceId, stylistId, from: date, to: date, staff: true })).get(date);
  if (!day?.slots.some((s) => Date.parse(s.start) === Date.parse(start))) {
    return { error: "Ce créneau n'est plus libre." };
  }

  const supabase = await createClient();
  const { data: service } = await supabase.from("services").select("name, duration_min, price_cents").eq("id", serviceId).single();
  if (!service) return { error: "Prestation introuvable." };

  // Cliente existante (même téléphone) : on met à jour son nom, et son email s'il est fourni
  const { data: client } = await supabase
    .from("clients")
    .upsert({ full_name: name, phone, ...(email ? { email } : {}) }, { onConflict: "phone" })
    .select("id")
    .single();
  if (!client) return { error: "Enregistrement de la cliente impossible." };

  const startsAt = new Date(start);
  const { data: rdv, error } = await supabase
    .from("appointments")
    .insert({
      client_id: client.id,
      stylist_id: stylistId,
      service_id: serviceId,
      service_name: service.name,
      price_cents: service.price_cents,
      starts_at: startsAt.toISOString(),
      ends_at: new Date(startsAt.getTime() + service.duration_min * 60_000).toISOString(),
      source: "telephone",
      notes,
    })
    .select("id")
    .single();
  if (error?.code === "23P01") return { error: "Ce créneau vient d'être pris." };
  if (error || !rdv) return { error: "Enregistrement impossible." };

  revalidatePath("/admin", "layout");
  return { ok: "Rendez-vous enregistré.", id: rdv.id };
}
