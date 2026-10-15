// Horaires d'ouverture du salon et pause déjeuner, jour par jour.
import { ActionForm } from "@/components/ActionForm";
import { HoursFields } from "@/components/HoursFields";
import { requireAdmin } from "@/lib/auth";
import { getSalonHours } from "@/lib/public-data";
import { saveSalonHours } from "./actions";

export default async function SalonHoursPage() {
  await requireAdmin();
  const hours = await getSalonHours();

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-3xl">Horaires du salon</h1>
      <p className="mb-5 text-sm text-muted">
        La pause est facultative : laissez-la vide s&apos;il n&apos;y en a pas. Pour les horaires propres à une
        coiffeuse, voir l&apos;onglet Équipe ; pour les fermetures exceptionnelles, l&apos;onglet Congés.
      </p>
      <ActionForm action={saveSalonHours} className="card">
        {hours.map((h) => (
          <HoursFields key={h.weekday} weekday={h.weekday}
                       day={{ open: h.is_open, start: h.open_time, end: h.close_time, bstart: h.break_start, bend: h.break_end }} />
        ))}
        <button className="btn btn-primary mt-4 w-full sm:w-auto">Enregistrer</button>
      </ActionForm>
    </div>
  );
}
