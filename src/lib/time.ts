// Outils de calcul d'heures dans le fuseau Europe/Paris, sans bibliothèque.
// Les dates "du calendrier" sont des chaînes "AAAA-MM-JJ" (jour à Paris).
import { TIME_ZONE } from "@/lib/format";

const partsFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
  hourCycle: "h23",
});

/** Décalage (en minutes) entre Paris et UTC à un instant donné : +60 l'hiver, +120 l'été. */
function parisOffsetMinutes(utcMs: number) {
  const p = Object.fromEntries(partsFmt.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - utcMs) / 60000);
}

/** Heure de Paris → instant réel. parisToUtc("2026-10-20", "09:30") */
export function parisToUtc(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let ts = guess - parisOffsetMinutes(guess) * 60000;
  // Correction autour des changements d'heure
  ts = guess - parisOffsetMinutes(ts) * 60000;
  return new Date(ts);
}

/** Jour à Paris d'un instant : "2026-10-16" */
export function parisDate(d: Date = new Date()): string {
  const p = Object.fromEntries(partsFmt.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

/** "2026-10-16" + 3 jours → "2026-10-19" */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** 1 = lundi … 7 = dimanche */
export function isoWeekday(date: string): number {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export const isDateString = (s: unknown): s is string =>
  typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
