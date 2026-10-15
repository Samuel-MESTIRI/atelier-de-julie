// Fermetures du salon (vacances, jours fériés) et absences des coiffeuses.
import { ActionForm } from "@/components/ActionForm";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { parisDate, parisToUtc } from "@/lib/time";
import { addAbsence, addClosure, deleteAbsence, deleteClosure } from "./actions";

const fmtDay = (d: string) => formatDate(parisToUtc(d, "12:00"));

export default async function LeavesPage() {
  await requireAdmin();
  const today = parisDate();
  const supabase = await createClient();
  const [{ data: closures }, { data: absences }, { data: stylists }] = await Promise.all([
    supabase.from("salon_closures").select("*").gte("end_date", today).order("start_date"),
    supabase.from("stylist_absences").select("*, stylists(name, color)")
      .gte("end_at", parisToUtc(today, "00:00").toISOString()).order("start_at"),
    supabase.from("stylists").select("id, name").eq("active", true).order("position"),
  ]);

  return (
    <div className="grid max-w-5xl gap-8 lg:grid-cols-2">
      {/* ---------- Fermetures du salon ---------- */}
      <section>
        <h1 className="mb-1 text-3xl">Fermetures du salon</h1>
        <p className="mb-4 text-sm text-muted">Vacances, jours fériés… Aucune réservation possible ces jours-là.</p>
        <ul className="mb-4 space-y-2">
          {(closures ?? []).length === 0 && <li className="text-sm text-muted">Aucune fermeture à venir.</li>}
          {(closures ?? []).map((c) => (
            <li key={c.id} className="card flex items-center justify-between gap-3 p-3">
              <span>
                <span className="font-semibold">
                  {c.start_date === c.end_date ? `Le ${fmtDay(c.start_date)}` : `Du ${fmtDay(c.start_date)} au ${fmtDay(c.end_date)}`}
                </span>
                {c.reason && <span className="block text-sm text-muted">{c.reason}</span>}
              </span>
              <ActionForm action={deleteClosure} confirm="Supprimer cette fermeture ?">
                <input type="hidden" name="id" value={c.id} />
                <button className="text-sm text-danger underline">Supprimer</button>
              </ActionForm>
            </li>
          ))}
        </ul>
        <ActionForm action={addClosure} resetOnSuccess className="card grid gap-3 sm:grid-cols-2">
          <h2 className="text-xl sm:col-span-2">Ajouter une fermeture</h2>
          <div>
            <label className="label">Du</label>
            <input name="start_date" type="date" required min={today} className="input" />
          </div>
          <div>
            <label className="label">Au (inclus)</label>
            <input name="end_date" type="date" min={today} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Motif <span className="font-normal text-muted">(facultatif)</span></label>
            <input name="reason" placeholder="Congés d'été" className="input" />
          </div>
          <button className="btn btn-primary sm:col-span-2">Ajouter</button>
        </ActionForm>
      </section>

      {/* ---------- Absences des coiffeuses ---------- */}
      <section>
        <h2 className="mb-1 text-3xl">Absences</h2>
        <p className="mb-4 text-sm text-muted">Congé, rendez-vous personnel, formation… sur une ou plusieurs journées ou quelques heures.</p>
        <ul className="mb-4 space-y-2">
          {(absences ?? []).length === 0 && <li className="text-sm text-muted">Aucune absence à venir.</li>}
          {(absences ?? []).map((a) => {
            const st = a.stylists as { name: string; color: string };
            const startDay = parisDate(new Date(a.start_at));
            const endDay = parisDate(new Date(Date.parse(a.end_at) - 1));
            const fullDays = formatTime(a.start_at) === "00:00" && formatTime(a.end_at) === "00:00";
            const label = fullDays
              ? startDay === endDay ? `Le ${fmtDay(startDay)}` : `Du ${fmtDay(startDay)} au ${fmtDay(endDay)}`
              : `${formatDate(a.start_at)} ${formatTime(a.start_at)} → ${startDay === parisDate(new Date(a.end_at)) ? "" : formatDate(a.end_at) + " "}${formatTime(a.end_at)}`;
            return (
              <li key={a.id} className="card flex items-center justify-between gap-3 p-3">
                <span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: st.color }} />{st.name}
                  </span>
                  <span className="block text-sm">{label}</span>
                  {a.reason && <span className="block text-sm text-muted">{a.reason}</span>}
                </span>
                <ActionForm action={deleteAbsence} confirm="Supprimer cette absence ?">
                  <input type="hidden" name="id" value={a.id} />
                  <button className="text-sm text-danger underline">Supprimer</button>
                </ActionForm>
              </li>
            );
          })}
        </ul>
        <ActionForm action={addAbsence} resetOnSuccess className="card grid gap-3 sm:grid-cols-2">
          <h3 className="font-serif text-xl sm:col-span-2">Ajouter une absence</h3>
          <div className="sm:col-span-2">
            <label className="label">Coiffeuse</label>
            <select name="stylist_id" required className="input">
              {(stylists ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Du</label>
            <input name="start_date" type="date" required min={today} defaultValue={today} className="input" />
          </div>
          <div>
            <label className="label">Au (inclus)</label>
            <input name="end_date" type="date" min={today} className="input" />
          </div>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" name="full_day" defaultChecked className="h-5 w-5 accent-sage-dark" />
            Journée(s) entière(s)
          </label>
          <div>
            <label className="label">Sinon, de</label>
            <input name="start_time" type="time" className="input" />
          </div>
          <div>
            <label className="label">à</label>
            <input name="end_time" type="time" className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Motif <span className="font-normal text-muted">(facultatif)</span></label>
            <input name="reason" placeholder="Congé" className="input" />
          </div>
          <button className="btn btn-primary sm:col-span-2">Ajouter</button>
        </ActionForm>
        <p className="mt-2 text-xs text-muted">
          Avec des heures, l&apos;absence va du premier jour à l&apos;heure de début jusqu&apos;au dernier jour à l&apos;heure de fin.
        </p>
      </section>
    </div>
  );
}
