// Lecture et vérification des champs de formulaire (actions serveur du back-office).

export const text = (fd: FormData, key: string, max = 200) => String(fd.get(key) ?? "").trim().slice(0, max);

/** Case à cocher : présente = cochée */
export const checked = (fd: FormData, key: string) => fd.get(key) === "on";

/** Entier, ou null si absent / invalide / hors bornes */
export function int(fd: FormData, key: string, min: number, max: number): number | null {
  const n = Number(text(fd, key));
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

/** Prix saisi en euros ("35", "35,50", "35.5") → centimes, ou null */
export function priceCents(fd: FormData, key: string): number | null {
  const s = text(fd, key).replace(",", ".").replace(/\s|€/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

/** Heure "HH:MM" ou null (champ vide accepté → null) */
export function time(fd: FormData, key: string): string | null {
  const s = text(fd, key);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s) ? s : null;
}

/** Couleur "#rrggbb" */
export const isColor = (s: string) => /^#[0-9a-f]{6}$/i.test(s);
