"use server";
import { revalidatePath } from "next/cache";
import { canCancel, getAppointmentByToken } from "@/lib/appointment-by-token";
import { notifyCancelled } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";

export type CancelState = { error?: string };

export async function cancelAppointment(token: string): Promise<CancelState> {
  const appointment = await getAppointmentByToken(token);
  if (!appointment) return { error: "Rendez-vous introuvable." };

  // Règle des 24 h vérifiée côté serveur (le bouton peut être affiché depuis longtemps)
  if (!canCancel(appointment)) {
    return {
      error: `L'annulation en ligne n'est plus possible à moins de ${appointment.cancel_limit_hours} h du rendez-vous. Merci d'appeler le salon.`,
    };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("appointments")
    .update({ status: "annule", cancelled_at: new Date().toISOString() })
    .eq("id", appointment.id)
    .eq("status", "confirme");
  if (error) return { error: "Une erreur est survenue, merci de réessayer." };

  // Email d'annulation (inactif pour l'instant, voir lib/notifications.ts)
  const { data: rdv } = await supabase.from("appointments").select("clients(email)").eq("id", appointment.id).single();
  await notifyCancelled({
    email: (rdv?.clients as unknown as { email: string } | null)?.email ?? "",
    name: appointment.client_name, serviceName: appointment.service_name, startsAt: appointment.starts_at,
    stylistName: appointment.stylist_name, link: "",
  });

  revalidatePath(`/rdv/${token}`);
  return {};
}
