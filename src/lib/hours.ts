// Lecture et vérification des horaires d'une journée saisis dans un formulaire.
// Utilisé pour le salon ET pour les horaires propres des coiffeuses.
import { checked, time } from "@/lib/form";

export type HoursRow = {
  is_open: boolean;
  open_time: string | null; close_time: string | null;
  break_start: string | null; break_end: string | null;
};

export const DAY_NAMES = ["", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

/** Champs préfixés ("d3_" pour mercredi). Renvoie les horaires, ou un message d'erreur. */
export function readDay(fd: FormData, prefix: string): HoursRow | string {
  const open = checked(fd, `${prefix}open`);
  const start = time(fd, `${prefix}start`);
  const end = time(fd, `${prefix}end`);
  const bStart = time(fd, `${prefix}bstart`);
  const bEnd = time(fd, `${prefix}bend`);
  if (!open) return { is_open: false, open_time: null, close_time: null, break_start: null, break_end: null };
  if (!start || !end || start >= end) return "heures invalides";
  if ((bStart && !bEnd) || (!bStart && bEnd)) return "pause incomplète (début ET fin, ou aucun des deux)";
  if (bStart && bEnd && (bStart >= bEnd || bStart < start || bEnd > end)) return "pause en dehors des heures";
  return { is_open: true, open_time: start, close_time: end, break_start: bStart, break_end: bEnd };
}
