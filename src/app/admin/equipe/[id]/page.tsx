// Fiche d'une coiffeuse : informations, horaires propres, prestations, accès au back-office.
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { requireAdmin } from "@/lib/auth";
import { WEEKDAYS } from "@/lib/public-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";
import { createAccess, resetPassword, saveStylist, saveStylistHours, saveStylistServices } from "../actions";

const hhmm = (t: string | null) => t?.slice(0, 5) ?? "";

export default async function StylistPage({ params }: PageProps<"/admin/equipe/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const [{ data: s }, { data: hours }, { data: services }, { data: links }, { data: profile }] = await Promise.all([
    supabase.from("stylists").select("*").eq("id", id).maybeSingle(),
    supabase.from("stylist_hours").select("*").eq("stylist_id", id),
    supabase.from("services").select("id, name").order("position"),
    supabase.from("stylist_services").select("service_id").eq("stylist_id", id),
    supabase.from("profiles").select("id, role").eq("stylist_id", id).maybeSingle(),
  ]);
  if (!s) notFound();

  // Email du compte lié (lecture réservée à la clé secrète, côté serveur)
  const account = profile ? (await createAdminClient().auth.admin.getUserById(profile.id)).data.user : null;

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/admin/equipe" className="text-sm font-semibold text-sage-dark">← Équipe</Link>
      <h1 className="text-3xl">{s.name}</h1>

      {/* ---------- Informations ---------- */}
      <section className="card">
        <h2 className="mb-3 text-xl">Informations</h2>
        <ActionForm action={saveStylist} className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input type="hidden" name="id" value={s.id} />
          <div>
            <label className="label">Prénom</label>
            <input name="name" required defaultValue={s.name} className="input" />
          </div>
          <div>
            <label className="label">Couleur</label>
            <input name="color" type="color" defaultValue={s.color} className="h-11 w-16 rounded-lg border border-beige" />
          </div>
          <div>
            <label className="label">Ordre</label>
            <input name="position" type="number" min={0} max={999} defaultValue={s.position} className="input w-20" />
          </div>
          <label className="flex items-center gap-2 sm:col-span-3">
            <input type="checkbox" name="active" defaultChecked={s.active} className="h-5 w-5 accent-sage-dark" />
            Active (proposée à la réservation)
          </label>
          <button className="btn btn-primary sm:col-span-3 sm:justify-self-start">Enregistrer</button>
        </ActionForm>
      </section>

      {/* ---------- Horaires ---------- */}
      <section className="card">
        <h2 className="mb-1 text-xl">Horaires</h2>
        <p className="mb-3 text-sm text-muted">
          Par défaut, une coiffeuse suit les horaires du salon. Ses horaires restent toujours compris dans ceux du salon.
        </p>
        <ActionForm action={saveStylistHours}>
          <input type="hidden" name="id" value={s.id} />
          {[1, 2, 3, 4, 5, 6, 7].map((d) => {
            const h = hours?.find((x) => x.weekday === d);
            const mode = !h ? "salon" : h.is_working ? "custom" : "off";
            return (
              <div key={d} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-beige py-3 last:border-b-0">
                <span className="w-24 font-semibold">{WEEKDAYS[d]}</span>
                <select name={`d${d}_mode`} defaultValue={mode} className="input min-h-10 w-48 py-1">
                  <option value="salon">Comme le salon</option>
                  <option value="custom">Horaires propres</option>
                  <option value="off">Ne travaille pas</option>
                </select>
                <div className="flex items-center gap-1.5 text-sm">
                  <input type="time" name={`d${d}_start`} defaultValue={hhmm(h?.start_time)} className="input min-h-10 w-28 px-2" aria-label="Début" />
                  –
                  <input type="time" name={`d${d}_end`} defaultValue={hhmm(h?.end_time)} className="input min-h-10 w-28 px-2" aria-label="Fin" />
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="text-muted">Pause</span>
                  <input type="time" name={`d${d}_bstart`} defaultValue={hhmm(h?.break_start)} className="input min-h-10 w-28 px-2" aria-label="Début de pause" />
                  –
                  <input type="time" name={`d${d}_bend`} defaultValue={hhmm(h?.break_end)} className="input min-h-10 w-28 px-2" aria-label="Fin de pause" />
                </div>
              </div>
            );
          })}
          <p className="mt-2 text-xs text-muted">Les heures ne sont prises en compte qu&apos;en mode « Horaires propres ».</p>
          <button className="btn btn-primary mt-3">Enregistrer les horaires</button>
        </ActionForm>
      </section>

      {/* ---------- Prestations ---------- */}
      <section className="card">
        <h2 className="mb-3 text-xl">Prestations réalisées</h2>
        <ActionForm action={saveStylistServices}>
          <input type="hidden" name="id" value={s.id} />
          <div className="flex flex-wrap gap-4">
            {(services ?? []).map((sv) => (
              <label key={sv.id} className="flex items-center gap-2">
                <input type="checkbox" name="services" value={sv.id} defaultChecked={links?.some((l) => l.service_id === sv.id)} className="h-5 w-5 accent-sage-dark" />
                {sv.name}
              </label>
            ))}
          </div>
          <button className="btn btn-primary mt-4">Enregistrer</button>
        </ActionForm>
      </section>

      {/* ---------- Accès au back-office ---------- */}
      <section className="card">
        <h2 className="mb-3 text-xl">Accès au planning</h2>
        {account ? (
          <>
            <p className="mb-3">
              Compte : <strong>{account.email}</strong> ({profile?.role === "admin" ? "gérante" : "coiffeuse"})
            </p>
            <ActionForm action={resetPassword} resetOnSuccess className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="userId" value={account.id} />
              <div className="min-w-48 flex-1">
                <label className="label">Nouveau mot de passe</label>
                <input name="password" type="text" minLength={10} required autoComplete="off" className="input" />
              </div>
              <button className="btn btn-secondary">Changer</button>
            </ActionForm>
          </>
        ) : (
          <ActionForm action={createAccess} className="grid gap-3 sm:grid-cols-2">
            <p className="text-sm text-muted sm:col-span-2">
              Pas encore d&apos;accès. Créez-en un pour qu&apos;elle puisse consulter son planning.
            </p>
            <input type="hidden" name="id" value={s.id} />
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" required className="input" />
            </div>
            <div>
              <label className="label">Mot de passe provisoire</label>
              <input name="password" type="text" minLength={10} required autoComplete="off" className="input" />
            </div>
            <button className="btn btn-primary sm:col-span-2 sm:justify-self-start">Créer l&apos;accès</button>
          </ActionForm>
        )}
      </section>
    </div>
  );
}
