// Formats français : JJ/MM/AAAA, 24 h, fuseau Europe/Paris, euros.
export const TIME_ZONE = "Europe/Paris";

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false,
});
const longDateFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long",
});
const priceFmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

/** 16/10/2026 */
export const formatDate = (d: Date | string) => dateFmt.format(new Date(d));
/** 14:30 */
export const formatTime = (d: Date | string) => timeFmt.format(new Date(d));
/** vendredi 16 octobre */
export const formatLongDate = (d: Date | string) => longDateFmt.format(new Date(d));
/** 35,00 € (le prix est stocké en centimes) */
export const formatPrice = (cents: number) => priceFmt.format(cents / 100);

/** 45 min, 1 h 30, 2 h */
export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}
