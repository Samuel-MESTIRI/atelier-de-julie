// Planning du salon : vue jour (colonnes par coiffeuse) ou semaine (liste par jour).
// Julie voit tout le monde (filtre par coiffeuse possible), une coiffeuse ne voit que le sien.
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { formatDate, formatLongDate, formatTime } from "@/lib/format";
import { addDays, isDateString, isoWeekday, parisDate, parisToUtc } from "@/lib/time";
import { formatPhone, isUuid } from "@/lib/validation";
import { loadPlanning, type PlanningAppointment, type Stylist } from "./planning-data";

const PX_PER_MIN = 1.3; // hauteur d'une minute dans la vue jour

type Data = Awaited<ReturnType<typeof loadPlanning>>;

export default async function PlanningPage({ searchParams }: PageProps<"/admin">) {
  const profile = await requireStaff();
  const sp = await searchParams;
  const view = sp.vue === "semaine" ? "semaine" : "jour";
  const date = isDateString(sp.date) ? sp.date : parisDate();
  const isAdmin = profile.role === "admin";

  // Coiffeuse : uniquement son planning. Julie : filtre optionnel.
  const filter = isAdmin ? (isUuid(sp.coiffeuse) ? sp.coiffeuse : null) : profile.stylist_id;

  const from = view === "jour" ? date : addDays(date, 1 - isoWeekday(date)); // lundi
  const to = view === "jour" ? date : addDays(from, 6);
  const data = await loadPlanning(from, to, filter);
  const shown = filter ? data.stylists.filter((s) => s.id === filter) : data.stylists;

  // Construit un lien en gardant les autres paramètres
  const href = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams({ vue: view, date, ...(filter && isAdmin ? { coiffeuse: filter } : {}) });
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) params.delete(k);
      else params.set(k, v);
    }
    return `/admin?${params}`;
  };
  const step = view === "jour" ? 1 : 7;

  return (
    <div>
      {/* ---------- Barre de navigation du planning ---------- */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-3xl first-letter:uppercase">
          {view === "jour" ? formatLongDate(parisToUtc(date, "12:00")) : `Semaine du ${formatDate(parisToUtc(from, "12:00"))}`}
        </h1>
        <div className="flex rounded-full border border-beige bg-white p-0.5 text-sm">
          {(["jour", "semaine"] as const).map((v) => (
            <Link key={v} href={href({ vue: v })}
                  className={`rounded-full px-3 py-1.5 capitalize ${view === v ? "bg-sage-dark text-white" : ""}`}>
              {v}
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <Link href={href({ date: addDays(date, -step) })} className="btn btn-secondary min-h-9 px-3 py-1" aria-label="Précédent">←</Link>
        <Link href={href({ date: parisDate() })} className="btn btn-secondary min-h-9 px-3 py-1">Aujourd&apos;hui</Link>
        <Link href={href({ date: addDays(date, step) })} className="btn btn-secondary min-h-9 px-3 py-1" aria-label="Suivant">→</Link>

        {isAdmin && (
          <div className="flex gap-1 overflow-x-auto sm:ml-auto">
            <Link href={href({ coiffeuse: null })}
                  className={`whitespace-nowrap rounded-full border px-3 py-1.5 ${!filter ? "border-sage-dark bg-sage-light" : "border-beige bg-white"}`}>
              Toutes
            </Link>
            {data.stylists.map((s) => (
              <Link key={s.id} href={href({ coiffeuse: s.id })}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 ${filter === s.id ? "border-sage-dark bg-sage-light" : "border-beige bg-white"}`}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />{s.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {view === "jour"
        ? <DayView date={date} data={data} stylists={shown} />
        : <WeekView from={from} data={data} stylists={data.stylists} />}
    </div>
  );
}

// ---------------------------------------------------------------------
// Vue jour : une colonne par coiffeuse, rendez-vous positionnés à l'heure
// ---------------------------------------------------------------------
function DayView({ date, data, stylists }: { date: string; data: Data; stylists: Stylist[] }) {
  const weekday = isoWeekday(date);
  const salon = data.salonHours.find((h) => h.weekday === weekday);
  const closure = data.closures.find((c) => c.start_date <= date && date <= c.end_date);
  const isOpen = salon?.is_open && !closure;

  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const gridStart = isOpen ? toMin(salon.open_time) : 9 * 60;
  const gridEnd = isOpen ? toMin(salon.close_time) : 19 * 60;
  const dayStartMs = parisToUtc(date, "00:00").getTime();
  const minuteOf = (iso: string) => (Date.parse(iso) - dayStartMs) / 60000;
  const top = (min: number) => (Math.max(min, gridStart) - gridStart) * PX_PER_MIN;
  const height = (a: number, b: number) => (Math.min(b, gridEnd) - Math.max(a, gridStart)) * PX_PER_MIN;

  const hours: number[] = [];
  for (let h = Math.ceil(gridStart / 60); h * 60 <= gridEnd; h++) hours.push(h);

  return (
    <>
      {!isOpen && (
        <p className="mb-3 rounded-xl bg-sand p-3 text-sm">
          Salon fermé ce jour{closure?.reason ? ` (${closure.reason})` : ""}.
        </p>
      )}
      <div className="overflow-x-auto rounded-2xl border border-beige bg-white">
        <div className="flex min-w-[320px]">
          {/* Colonne des heures */}
          <div className="w-11 shrink-0 border-r border-beige pt-9">
            <div className="relative" style={{ height: (gridEnd - gridStart) * PX_PER_MIN }}>
              {hours.map((h) => (
                <span key={h} className="absolute right-1 -translate-y-1/2 text-[11px] text-muted" style={{ top: top(h * 60) }}>
                  {String(h).padStart(2, "0")}:00
                </span>
              ))}
            </div>
          </div>

          {stylists.map((s) => {
            const own = data.stylistHours.find((h) => h.stylist_id === s.id && h.weekday === weekday);
            // Zones grisées : pauses, jour non travaillé, absences
            const blocked: { from: number; to: number; label: string }[] = [];
            if (own && !own.is_working) blocked.push({ from: gridStart, to: gridEnd, label: "Ne travaille pas" });
            if (own?.is_working) {
              if (toMin(own.start_time) > gridStart) blocked.push({ from: gridStart, to: toMin(own.start_time), label: "" });
              if (toMin(own.end_time) < gridEnd) blocked.push({ from: toMin(own.end_time), to: gridEnd, label: "" });
              if (own.break_start) blocked.push({ from: toMin(own.break_start), to: toMin(own.break_end), label: "Pause" });
            }
            if (isOpen && salon.break_start) blocked.push({ from: toMin(salon.break_start), to: toMin(salon.break_end), label: "Pause" });
            for (const a of data.absences.filter((x) => x.stylist_id === s.id)) {
              blocked.push({ from: minuteOf(a.start_at), to: minuteOf(a.end_at), label: a.reason || "Absente" });
            }
            const rdvs = data.appointments.filter((a) => a.stylist_id === s.id);

            return (
              <div key={s.id} className="min-w-[88px] flex-1 border-r border-beige last:border-r-0">
                <div className="flex h-9 items-center justify-center gap-1.5 border-b border-beige text-sm font-semibold">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />{s.name}
                </div>
                <div className="relative" style={{ height: (gridEnd - gridStart) * PX_PER_MIN }}>
                  {hours.map((h) => (
                    <div key={h} className="absolute inset-x-0 border-t border-beige/60" style={{ top: top(h * 60) }} />
                  ))}
                  {blocked.filter((b) => b.to > gridStart && b.from < gridEnd).map((b, i) => (
                    <div key={i} className="absolute inset-x-0 bg-[repeating-linear-gradient(45deg,#f1e9dd,#f1e9dd_6px,#faf6f0_6px,#faf6f0_12px)] px-1 text-[11px] text-muted"
                         style={{ top: top(b.from), height: height(b.from, b.to) }}>
                      {b.label}
                    </div>
                  ))}
                  {rdvs.map((a) => {
                    const from = minuteOf(a.starts_at);
                    const to = minuteOf(a.ends_at);
                    return (
                      <Link key={a.id} href={`/admin/rdv/${a.id}`}
                            className="absolute inset-x-1 overflow-hidden rounded-lg border-l-4 bg-white p-1.5 text-xs shadow-sm ring-1 ring-beige hover:ring-sage"
                            style={{ top: top(from), height: Math.max(height(from, to) - 2, 22), borderLeftColor: s.color }}>
                        <span className="font-semibold">{formatTime(a.starts_at)}</span>{" "}
                        <span>{a.clients?.full_name}</span>
                        <span className="block truncate text-muted">{a.service_name}</span>
                        <StatusBadge a={a} />
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------
// Vue semaine : liste des rendez-vous jour par jour
// ---------------------------------------------------------------------
function WeekView({ from, data, stylists }: { from: string; data: Data; stylists: Stylist[] }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {days.map((day) => {
        const start = parisToUtc(day, "00:00").getTime();
        const end = parisToUtc(addDays(day, 1), "00:00").getTime();
        const rdvs = data.appointments.filter((a) => Date.parse(a.starts_at) >= start && Date.parse(a.starts_at) < end);
        const salon = data.salonHours.find((h) => h.weekday === isoWeekday(day));
        const closed = !salon?.is_open || data.closures.some((c) => c.start_date <= day && day <= c.end_date);
        if (closed && rdvs.length === 0) return null;
        const absent = data.absences.filter((a) => Date.parse(a.start_at) < end && Date.parse(a.end_at) > start);

        return (
          <section key={day} className="card p-4">
            <Link href={`/admin?vue=jour&date=${day}`} className="mb-2 flex items-baseline justify-between hover:text-sage-dark">
              <h2 className="text-xl first-letter:uppercase">{formatLongDate(parisToUtc(day, "12:00"))}</h2>
              <span className="text-xs text-muted">{rdvs.length} rdv</span>
            </Link>
            {closed && <p className="text-sm text-muted">Salon fermé</p>}
            {absent.map((a) => (
              <p key={a.id} className="mb-1 rounded-md bg-sand px-2 py-1 text-xs text-muted">
                {stylists.find((s) => s.id === a.stylist_id)?.name} absente
                {formatTime(a.start_at) !== "00:00" || formatTime(a.end_at) !== "00:00"
                  ? ` (${formatTime(a.start_at)} – ${formatTime(a.end_at)})` : ""}
                {a.reason && ` · ${a.reason}`}
              </p>
            ))}
            {rdvs.length === 0 && !closed && <p className="text-sm text-muted">Aucun rendez-vous</p>}
            <ul className="space-y-1.5">
              {rdvs.map((a) => {
                const s = stylists.find((x) => x.id === a.stylist_id);
                return (
                  <li key={a.id}>
                    <Link href={`/admin/rdv/${a.id}`} className="flex items-start gap-2 rounded-lg p-1.5 text-sm hover:bg-sand">
                      <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s?.color }} />
                      <span className="w-11 shrink-0 font-semibold">{formatTime(a.starts_at)}</span>
                      <span className="min-w-0">
                        <span className="block truncate">{a.clients?.full_name} <StatusBadge a={a} /></span>
                        <span className="block truncate text-muted">{a.service_name} · {s?.name}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function StatusBadge({ a }: { a: PlanningAppointment }) {
  if (a.status === "venue") return <span className="text-sage-dark" title="Venue">✓</span>;
  if (a.status === "absente") return <span className="text-danger" title="Absente">✗ absente</span>;
  if (a.source === "telephone") return <span className="text-muted" title={`Pris par téléphone · ${formatPhone(a.clients?.phone ?? "")}`}>☎</span>;
  return null;
}
