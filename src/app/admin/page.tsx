// Planning (version étape 1) : liste des prochains rendez-vous.
// Les règles RLS filtrent automatiquement : une coiffeuse ne reçoit que les siens.
// La vue jour / semaine complète arrive à l'étape 3.
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatTime } from "@/lib/format";

type Row = {
  id: string;
  starts_at: string;
  ends_at: string;
  service_name: string;
  status: string;
  stylists: { name: string; color: string } | null;
  clients: { full_name: string; phone: string } | null;
};

export default async function PlanningPage() {
  const profile = await requireStaff();
  const supabase = await createClient();

  const { data } = await supabase
    .from("appointments")
    .select("id, starts_at, ends_at, service_name, status, stylists(name, color), clients(full_name, phone)")
    .gte("starts_at", new Date().toISOString())
    .neq("status", "annule")
    .order("starts_at")
    .limit(50)
    .overrideTypes<Row[], { merge: false }>();
  const rows = data ?? [];

  return (
    <div>
      <h1 className="text-3xl">Bonjour {profile.full_name}</h1>
      <p className="mt-1 text-muted">
        {profile.role === "admin" ? "Prochains rendez-vous du salon" : "Vos prochains rendez-vous"}
      </p>

      {rows.length === 0 ? (
        <p className="card mt-6 text-muted">Aucun rendez-vous à venir.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="card flex items-start gap-3 p-4">
              <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full" style={{ background: r.stylists?.color }} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {formatDate(r.starts_at)} · {formatTime(r.starts_at)} – {formatTime(r.ends_at)}
                </p>
                <p className="text-sm">{r.service_name} avec {r.stylists?.name}</p>
                <p className="text-sm text-muted">
                  {r.clients?.full_name} · {r.clients?.phone}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
