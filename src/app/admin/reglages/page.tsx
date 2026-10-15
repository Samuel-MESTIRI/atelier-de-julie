// Réglages : règles de réservation et informations du salon (site + mentions légales).
import { ActionForm } from "@/components/ActionForm";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/public-data";
import { saveSettings } from "./actions";

export default async function SettingsPage() {
  await requireAdmin();
  const s = await getSettings();

  const field = (name: keyof typeof s, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} defaultValue={String(s[name])} className="input" {...props} />
    </div>
  );

  return (
    <ActionForm action={saveSettings} className="max-w-2xl space-y-6">
      <h1 className="text-3xl">Réglages</h1>

      <section className="card grid gap-4 sm:grid-cols-2">
        <h2 className="text-xl sm:col-span-2">Réservation en ligne</h2>
        {field("min_notice_hours", "Réserver au plus tard (heures avant)", { type: "number", min: 0, max: 168 })}
        {field("max_advance_days", "Réserver au plus tôt (jours avant)", { type: "number", min: 1, max: 365 })}
        {field("cancel_limit_hours", "Annulation en ligne jusqu'à (heures avant)", { type: "number", min: 0, max: 168 })}
        <div>
          <label className="label" htmlFor="slot_step_min">Créneaux proposés toutes les</label>
          <select id="slot_step_min" name="slot_step_min" defaultValue={s.slot_step_min} className="input">
            {[5, 10, 15, 20, 30, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
        </div>
      </section>

      <section className="card grid gap-4 sm:grid-cols-2">
        <h2 className="text-xl sm:col-span-2">Informations du salon</h2>
        <p className="-mt-2 text-sm text-muted sm:col-span-2">Affichées sur le site et dans les mentions légales.</p>
        {field("salon_name", "Nom du salon", { required: true })}
        {field("phone", "Téléphone", { type: "tel" })}
        <div className="sm:col-span-2">{field("address", "Adresse")}</div>
        {field("email", "Email de contact", { type: "email" })}
        {field("siret", "SIRET")}
        <div className="sm:col-span-2">{field("legal_name", "Exploitant (nom légal)")}</div>
        <div className="sm:col-span-2">{field("host_info", "Hébergeur du site")}</div>
      </section>

      <button className="btn btn-primary">Enregistrer</button>
    </ActionForm>
  );
}
