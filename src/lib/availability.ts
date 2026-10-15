// =====================================================================
// Calcul des créneaux disponibles (côté serveur uniquement).
//
// Pour chaque jour et chaque coiffeuse capable de faire la prestation :
//   1. jour ouvert ? (horaires du salon, fermetures exceptionnelles)
//   2. plage de travail : horaires propres de la coiffeuse, sinon ceux du salon
//   3. on retire : pause du salon, pause de la coiffeuse, absences, rendez-vous
//   4. on propose un début tous les "slot_step_min" (15 min) si la prestation
//      entière tient dans un trou libre, et pas avant "maintenant + délai minimum".
// Tous les calculs se font en instants réels (ms), donc justes aux changements d'heure.
// =====================================================================
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, isoWeekday, parisDate, parisToUtc } from "@/lib/time";

export type Slot = {
  start: string;          // instant ISO (UTC)
  stylistIds: string[];   // coiffeuses libres à ce moment
};

export type DayAvailability = {
  slots: Slot[];
  load: Record<string, number>; // nb de rendez-vous par coiffeuse ce jour-là (pour "peu importe")
};

type Interval = { start: number; end: number };

const MINUTE = 60_000;

export async function getAvailability(opts: {
  serviceId: string;
  stylistId: string | null;  // null = peu importe
  from: string;              // "AAAA-MM-JJ" inclus
  to: string;                // "AAAA-MM-JJ" inclus
  now?: Date;
}): Promise<Map<string, DayAvailability>> {
  const supabase = createAdminClient();
  const now = opts.now ?? new Date();
  const result = new Map<string, DayAvailability>();

  // ---------- Réglages et prestation ----------
  const [{ data: settings }, { data: service }] = await Promise.all([
    supabase.from("settings").select("*").eq("id", 1).single(),
    supabase.from("services").select("id, duration_min").eq("id", opts.serviceId).eq("active", true).maybeSingle(),
  ]);
  if (!settings || !service) return result;

  // Bornes : pas avant aujourd'hui, pas après le délai maximum
  const today = parisDate(now);
  const lastDay = addDays(today, settings.max_advance_days);
  const from = opts.from < today ? today : opts.from;
  const to = opts.to > lastDay ? lastDay : opts.to;
  if (from > to) return result;

  const earliest = now.getTime() + settings.min_notice_hours * 60 * MINUTE;
  const durationMs = service.duration_min * MINUTE;
  const stepMs = settings.slot_step_min * MINUTE;
  const rangeStart = parisToUtc(from, "00:00").toISOString();
  const rangeEnd = parisToUtc(addDays(to, 1), "00:00").toISOString();

  // ---------- Coiffeuses qui font cette prestation ----------
  let stylistQuery = supabase
    .from("stylist_services")
    .select("stylist_id, stylists!inner(id, active)")
    .eq("service_id", service.id)
    .eq("stylists.active", true);
  if (opts.stylistId) stylistQuery = stylistQuery.eq("stylist_id", opts.stylistId);
  const { data: links } = await stylistQuery;
  const stylistIds = (links ?? []).map((l) => l.stylist_id as string);
  if (stylistIds.length === 0) return result;

  // ---------- Tout le reste en une fois ----------
  const [salonHours, stylistHours, closures, absences, appointments] = await Promise.all([
    supabase.from("salon_hours").select("*"),
    supabase.from("stylist_hours").select("*").in("stylist_id", stylistIds),
    supabase.from("salon_closures").select("start_date, end_date").lte("start_date", to).gte("end_date", from),
    supabase.from("stylist_absences").select("stylist_id, start_at, end_at")
      .in("stylist_id", stylistIds).lt("start_at", rangeEnd).gt("end_at", rangeStart),
    supabase.from("appointments").select("stylist_id, starts_at, ends_at")
      .in("stylist_id", stylistIds).neq("status", "annule").lt("starts_at", rangeEnd).gt("ends_at", rangeStart),
  ]);

  // ---------- Jour par jour ----------
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const weekday = isoWeekday(day);
    const salon = salonHours.data?.find((h) => h.weekday === weekday);
    const closed = closures.data?.some((c) => c.start_date <= day && day <= c.end_date);
    if (!salon?.is_open || closed) continue;

    const at = (time: string) => parisToUtc(day, time).getTime();
    const salonOpen = at(salon.open_time);
    const salonClose = at(salon.close_time);
    const dayStart = at("00:00");
    const dayEnd = parisToUtc(addDays(day, 1), "00:00").getTime();

    const free = new Map<string, Interval[]>(); // trous libres par coiffeuse
    const load: Record<string, number> = {};

    for (const id of stylistIds) {
      const own = stylistHours.data?.find((h) => h.stylist_id === id && h.weekday === weekday);
      if (own && !own.is_working) continue;

      // Plage de travail, toujours comprise dans les horaires du salon
      const workStart = Math.max(salonOpen, own ? at(own.start_time) : salonOpen);
      const workEnd = Math.min(salonClose, own ? at(own.end_time) : salonClose);
      if (workStart >= workEnd) continue;

      const busy: Interval[] = [];
      if (salon.break_start) busy.push({ start: at(salon.break_start), end: at(salon.break_end) });
      if (own?.break_start) busy.push({ start: at(own.break_start), end: at(own.break_end) });
      for (const a of absences.data ?? []) {
        if (a.stylist_id === id) busy.push({ start: Date.parse(a.start_at), end: Date.parse(a.end_at) });
      }
      let count = 0;
      for (const a of appointments.data ?? []) {
        if (a.stylist_id !== id) continue;
        const s = Date.parse(a.starts_at);
        if (s >= dayStart && s < dayEnd) count++;
        busy.push({ start: s, end: Date.parse(a.ends_at) });
      }
      load[id] = count;
      free.set(id, subtract({ start: workStart, end: workEnd }, busy));
    }

    // Débuts possibles, alignés sur le pas (9:00, 9:15, 9:30…)
    const slots: Slot[] = [];
    for (let t = salonOpen; t + durationMs <= salonClose; t += stepMs) {
      if (t < earliest) continue;
      const available = [...free.entries()]
        .filter(([, gaps]) => gaps.some((g) => g.start <= t && t + durationMs <= g.end))
        .map(([id]) => id);
      if (available.length > 0) slots.push({ start: new Date(t).toISOString(), stylistIds: available });
    }
    if (slots.length > 0) result.set(day, { slots, load });
  }

  return result;
}

/** Retire des intervalles occupés d'une plage : renvoie les trous libres. */
function subtract(range: Interval, busy: Interval[]): Interval[] {
  let gaps: Interval[] = [range];
  for (const b of busy) {
    gaps = gaps.flatMap((g) => {
      if (b.end <= g.start || b.start >= g.end) return [g]; // pas de chevauchement
      const parts: Interval[] = [];
      if (b.start > g.start) parts.push({ start: g.start, end: b.start });
      if (b.end < g.end) parts.push({ start: b.end, end: g.end });
      return parts;
    });
  }
  return gaps;
}
