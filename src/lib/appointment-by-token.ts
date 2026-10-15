// Lecture d'un rendez-vous par son lien secret (jeton), côté serveur uniquement.
// La visiteuse n'a pas accès aux tables : on passe par la clé secrète,
// en ne renvoyant que le strict nécessaire.
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation";

export type PublicAppointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  service_name: string;
  price_cents: number;
  status: "confirme" | "annule" | "venue" | "absente";
  stylist_name: string;
  client_name: string;
  cancel_limit_hours: number;
};

export async function getAppointmentByToken(token: string): Promise<PublicAppointment | null> {
  if (!isUuid(token)) return null;
  const supabase = createAdminClient();
  const [{ data }, { data: settings }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, starts_at, ends_at, service_name, price_cents, status, stylists(name), clients(full_name)")
      .eq("cancel_token", token)
      .maybeSingle(),
    supabase.from("settings").select("cancel_limit_hours").eq("id", 1).single(),
  ]);
  if (!data) return null;

  const stylist = data.stylists as unknown as { name: string } | null;
  const client = data.clients as unknown as { full_name: string } | null;
  return {
    id: data.id,
    starts_at: data.starts_at,
    ends_at: data.ends_at,
    service_name: data.service_name,
    price_cents: data.price_cents,
    status: data.status,
    stylist_name: stylist?.name ?? "",
    client_name: client?.full_name ?? "",
    cancel_limit_hours: settings?.cancel_limit_hours ?? 24,
  };
}

/** Annulation encore possible ? (statut confirmé et délai respecté) */
export function canCancel(a: PublicAppointment, now = new Date()) {
  const limit = Date.parse(a.starts_at) - a.cancel_limit_hours * 3_600_000;
  return a.status === "confirme" && now.getTime() <= limit;
}

/** Rendez-vous pas encore passé ? */
export const isUpcoming = (a: PublicAppointment, now = new Date()) => Date.parse(a.starts_at) > now.getTime();
