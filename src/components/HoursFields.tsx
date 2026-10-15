// Champs d'horaires d'une journée : ouvert/fermé, début, fin, pause facultative.
// Les noms des champs sont préfixés (ex. "d2_start") pour 7 jours dans un même formulaire.
import { WEEKDAYS } from "@/lib/public-data";

type Day = {
  open: boolean;
  start: string | null; end: string | null;
  bstart: string | null; bend: string | null;
};

const hhmm = (t: string | null) => t?.slice(0, 5) ?? "";

export function HoursFields({ weekday, day, openLabel = "Ouvert" }: { weekday: number; day: Day; openLabel?: string }) {
  const p = `d${weekday}_`;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-beige py-3 last:border-b-0">
      <span className="w-24 font-semibold">{WEEKDAYS[weekday]}</span>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name={`${p}open`} defaultChecked={day.open} className="h-5 w-5 accent-sage-dark" />
        {openLabel}
      </label>
      <div className="flex items-center gap-1.5 text-sm">
        <input type="time" name={`${p}start`} defaultValue={hhmm(day.start)} className="input min-h-10 w-28 px-2" aria-label={`${WEEKDAYS[weekday]} début`} />
        –
        <input type="time" name={`${p}end`} defaultValue={hhmm(day.end)} className="input min-h-10 w-28 px-2" aria-label={`${WEEKDAYS[weekday]} fin`} />
      </div>
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-muted">Pause</span>
        <input type="time" name={`${p}bstart`} defaultValue={hhmm(day.bstart)} className="input min-h-10 w-28 px-2" aria-label={`${WEEKDAYS[weekday]} début de pause`} />
        –
        <input type="time" name={`${p}bend`} defaultValue={hhmm(day.bend)} className="input min-h-10 w-28 px-2" aria-label={`${WEEKDAYS[weekday]} fin de pause`} />
      </div>
    </div>
  );
}
