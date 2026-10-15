// Saisie d'un rendez-vous pris par téléphone (Julie uniquement).
import { requireAdmin } from "@/lib/auth";
import { getServices } from "@/lib/public-data";
import { createClient } from "@/lib/supabase/server";
import { parisDate } from "@/lib/time";
import { NewAppointmentForm } from "./NewAppointmentForm";

export default async function NewAppointmentPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [services, { data: stylists }, { data: links }] = await Promise.all([
    getServices(),
    supabase.from("stylists").select("id, name").eq("active", true).order("position"),
    supabase.from("stylist_services").select("stylist_id, service_id"),
  ]);

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 text-3xl">Nouveau rendez-vous</h1>
      <p className="mb-5 text-sm text-muted">Pour une cliente qui appelle le salon. Pas de délai minimum.</p>
      <NewAppointmentForm
        services={services}
        stylists={(stylists ?? []).map((s) => ({
          ...s,
          serviceIds: (links ?? []).filter((l) => l.stylist_id === s.id).map((l) => l.service_id),
        }))}
        today={parisDate()}
      />
    </div>
  );
}
