// Gestion des prestations : nom, durée, prix, ordre, visibilité, coiffeuses.
import { ActionForm } from "@/components/ActionForm";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteService, saveService } from "./actions";

type Service = {
  id: string; name: string; description: string; duration_min: number;
  price_cents: number; active: boolean; position: number;
};
type Stylist = { id: string; name: string };

export default async function ServicesPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: services }, { data: stylists }, { data: links }] = await Promise.all([
    supabase.from("services").select("*").order("position"),
    supabase.from("stylists").select("id, name").order("position"),
    supabase.from("stylist_services").select("stylist_id, service_id"),
  ]);

  return (
    <div className="max-w-3xl">
      <h1 className="mb-5 text-3xl">Prestations</h1>
      <div className="space-y-4">
        {(services ?? []).map((s: Service) => (
          <details key={s.id} className="card p-0">
            <summary className="flex cursor-pointer items-center justify-between gap-3 p-4">
              <span>
                <span className="font-semibold">{s.name}</span>
                {!s.active && <span className="ml-2 rounded-full bg-sand px-2 py-0.5 text-xs">masquée</span>}
              </span>
              <span className="text-sm text-muted">{s.duration_min} min · {(s.price_cents / 100).toFixed(2).replace(".", ",")} €</span>
            </summary>
            <div className="border-t border-beige p-4">
              <ServiceForm service={s} stylists={stylists ?? []}
                           selected={(links ?? []).filter((l) => l.service_id === s.id).map((l) => l.stylist_id)} />
              <ActionForm action={deleteService} confirm={`Supprimer « ${s.name} » ? (Vous pouvez aussi simplement la masquer.)`} className="mt-3">
                <input type="hidden" name="id" value={s.id} />
                <button className="text-sm text-danger underline">Supprimer cette prestation</button>
              </ActionForm>
            </div>
          </details>
        ))}
      </div>

      <section className="card mt-8">
        <h2 className="mb-3 text-2xl">Ajouter une prestation</h2>
        <ServiceForm stylists={stylists ?? []} selected={(stylists ?? []).map((s) => s.id)} />
      </section>
    </div>
  );
}

function ServiceForm({ service, stylists, selected }: { service?: Service; stylists: Stylist[]; selected: string[] }) {
  return (
    <ActionForm action={saveService} resetOnSuccess={!service} className="grid gap-3 sm:grid-cols-2">
      {service && <input type="hidden" name="id" value={service.id} />}
      <div className="sm:col-span-2">
        <label className="label">Nom</label>
        <input name="name" required defaultValue={service?.name} className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Description <span className="font-normal text-muted">(facultatif)</span></label>
        <input name="description" defaultValue={service?.description} className="input" />
      </div>
      <div>
        <label className="label">Durée (minutes)</label>
        <input name="duration_min" type="number" min={5} max={720} step={5} required defaultValue={service?.duration_min ?? 30} className="input" />
      </div>
      <div>
        <label className="label">Prix (€)</label>
        <input name="price" inputMode="decimal" required
               defaultValue={service ? (service.price_cents / 100).toFixed(2).replace(".", ",") : ""} className="input" />
      </div>
      <div>
        <label className="label">Ordre d&apos;affichage</label>
        <input name="position" type="number" min={0} max={999} defaultValue={service?.position ?? 10} className="input" />
      </div>
      <label className="flex items-center gap-2 self-end pb-3">
        <input type="checkbox" name="active" defaultChecked={service?.active ?? true} className="h-5 w-5 accent-sage-dark" />
        Visible à la réservation
      </label>
      <fieldset className="sm:col-span-2">
        <legend className="label">Réalisée par</legend>
        <div className="flex flex-wrap gap-3">
          {stylists.map((st) => (
            <label key={st.id} className="flex items-center gap-2">
              <input type="checkbox" name="stylists" value={st.id} defaultChecked={selected.includes(st.id)} className="h-5 w-5 accent-sage-dark" />
              {st.name}
            </label>
          ))}
        </div>
      </fieldset>
      <button className="btn btn-primary sm:col-span-2">{service ? "Enregistrer" : "Ajouter"}</button>
    </ActionForm>
  );
}
