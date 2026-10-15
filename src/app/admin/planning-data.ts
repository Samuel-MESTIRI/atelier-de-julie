// Chargement des données du planning (droits de la personne connectée : RLS).
import { createClient } from "@/lib/supabase/server";
import { addDays, parisToUtc } from "@/lib/time";

export type PlanningAppointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  service_name: string;
  status: "confirme" | "annule" | "venue" | "absente";
  source: "en_ligne" | "telephone";
  stylist_id: string;
  clients: { full_name: string; phone: string; no_show_count: number } | null;
};

export type Stylist = { id: string; name: string; color: string };

export async function loadPlanning(from: string, to: string, stylistFilter: string | null) {
  const supabase = await createClient();
  const start = parisToUtc(from, "00:00").toISOString();
  const end = parisToUtc(addDays(to, 1), "00:00").toISOString();

  let appointmentsQuery = supabase
    .from("appointments")
    .select("id, starts_at, ends_at, service_name, status, source, stylist_id, clients(full_name, phone, no_show_count)")
    .gte("starts_at", start)
    .lt("starts_at", end)
    .neq("status", "annule")
    .order("starts_at");
  if (stylistFilter) appointmentsQuery = appointmentsQuery.eq("stylist_id", stylistFilter);

  const [appointments, stylists, salonHours, stylistHours, closures, absences] = await Promise.all([
    appointmentsQuery.overrideTypes<PlanningAppointment[], { merge: false }>(),
    supabase.from("stylists").select("id, name, color").eq("active", true).order("position"),
    supabase.from("salon_hours").select("*"),
    supabase.from("stylist_hours").select("*"),
    supabase.from("salon_closures").select("*").lte("start_date", to).gte("end_date", from),
    supabase.from("stylist_absences").select("*").lt("start_at", end).gt("end_at", start),
  ]);

  return {
    appointments: appointments.data ?? [],
    stylists: (stylists.data ?? []) as Stylist[],
    salonHours: salonHours.data ?? [],
    stylistHours: stylistHours.data ?? [],
    closures: closures.data ?? [],
    absences: absences.data ?? [],
  };
}
