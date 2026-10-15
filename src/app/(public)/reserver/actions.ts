"use server";
// Actions serveur du parcours de réservation.
// Toutes les données reçues du navigateur sont revérifiées ici.
import { redirect } from "next/navigation";
import { getAvailability } from "@/lib/availability";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, isDateString, parisDate } from "@/lib/time";
import { cleanEmail, cleanName, isUuid, normalizePhone } from "@/lib/validation";

const parseStylist = (id: string) => (id === "any" ? null : isUuid(id) ? id : undefined);

/** Jours (AAAA-MM-JJ) qui ont au moins un créneau libre. */
export async function fetchAvailableDays(serviceId: string, stylistId: string): Promise<string[]> {
  const stylist = parseStylist(stylistId);
  if (!isUuid(serviceId) || stylist === undefined) return [];
  const today = parisDate();
  const days = await getAvailability({ serviceId, stylistId: stylist, from: today, to: addDays(today, 365) });
  return [...days.keys()];
}

/** Heures de début libres pour un jour donné (instants ISO). */
export async function fetchSlots(serviceId: string, stylistId: string, date: string): Promise<string[]> {
  const stylist = parseStylist(stylistId);
  if (!isUuid(serviceId) || stylist === undefined || !isDateString(date)) return [];
  const days = await getAvailability({ serviceId, stylistId: stylist, from: date, to: date });
  return (days.get(date)?.slots ?? []).map((s) => s.start);
}

export type BookingState = { error?: string; slotTaken?: boolean };

export async function createBooking(_prev: BookingState, formData: FormData): Promise<BookingState> {
  // Champ piège invisible : rempli uniquement par les robots
  if (formData.get("website")) return { error: "Réservation impossible." };

  const serviceId = String(formData.get("serviceId") ?? "");
  const stylist = parseStylist(String(formData.get("stylistId") ?? ""));
  const date = String(formData.get("date") ?? "");
  const start = String(formData.get("start") ?? "");
  const name = cleanName(formData.get("name"));
  const phone = normalizePhone(formData.get("phone"));
  const email = cleanEmail(formData.get("email"));

  if (!isUuid(serviceId) || stylist === undefined || !isDateString(date) || Number.isNaN(Date.parse(start))) {
    return { error: "Votre sélection est incomplète, merci de recommencer." };
  }
  if (!name) return { error: "Merci d'indiquer votre nom (2 caractères minimum)." };
  if (!phone) return { error: "Le numéro de téléphone n'est pas valide." };
  if (!email) return { error: "L'adresse email n'est pas valide." };

  // ---------- Le créneau est-il (toujours) libre ? ----------
  const day = (await getAvailability({ serviceId, stylistId: stylist, from: date, to: date })).get(date);
  const slot = day?.slots.find((s) => Date.parse(s.start) === Date.parse(start));
  if (!day || !slot) {
    return { error: "Ce créneau n'est plus disponible. Merci d'en choisir un autre.", slotTaken: true };
  }
  // "Peu importe" : on choisit la coiffeuse la moins chargée ce jour-là
  const stylistId = stylist ?? [...slot.stylistIds].sort((a, b) => (day.load[a] ?? 0) - (day.load[b] ?? 0))[0];

  const supabase = createAdminClient();
  const { data: service } = await supabase
    .from("services").select("name, duration_min, price_cents").eq("id", serviceId).single();
  if (!service) return { error: "Prestation introuvable." };

  // ---------- Cliente (reconnue par son téléphone) ----------
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .upsert({ full_name: name, phone, email }, { onConflict: "phone" })
    .select("id")
    .single();
  if (clientError || !client) return { error: "Une erreur est survenue, merci de réessayer." };

  // ---------- Rendez-vous ----------
  const startsAt = new Date(slot.start);
  const endsAt = new Date(startsAt.getTime() + service.duration_min * 60_000);
  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      client_id: client.id,
      stylist_id: stylistId,
      service_id: serviceId,
      service_name: service.name,
      price_cents: service.price_cents,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      source: "en_ligne",
    })
    .select("cancel_token")
    .single();

  if (error || !appointment) {
    // 23P01 = garde-fou anti double réservation : quelqu'un a réservé au même moment
    if (error?.code === "23P01") {
      return { error: "Ce créneau vient d'être réservé. Merci d'en choisir un autre.", slotTaken: true };
    }
    return { error: "Une erreur est survenue, merci de réessayer." };
  }

  redirect(`/rdv/${appointment.cancel_token}?nouveau=1`);
}
