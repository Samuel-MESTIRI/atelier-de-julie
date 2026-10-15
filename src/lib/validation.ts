// Vérification et nettoyage des données saisies (toujours refaites côté serveur).

export const isUuid = (s: unknown): s is string =>
  typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** Nom : espaces superflus retirés, 2 à 80 caractères. Renvoie null si invalide. */
export function cleanName(input: unknown): string | null {
  const s = String(input ?? "").replace(/\s+/g, " ").trim();
  return s.length >= 2 && s.length <= 80 ? s : null;
}

/**
 * Téléphone : "06 12 34 56 78", "+33 6 12…" → "0612345678".
 * Les numéros étrangers sont gardés au format "+XXXXXXXX". Renvoie null si invalide.
 */
export function normalizePhone(input: unknown): string | null {
  let s = String(input ?? "").replace(/[\s.\-()]/g, "");
  if (s.startsWith("0033")) s = "+33" + s.slice(4);
  if (/^\+33[1-9]\d{8}$/.test(s)) s = "0" + s.slice(3);
  if (/^0[1-9]\d{8}$/.test(s)) return s;
  if (/^\+\d{8,15}$/.test(s)) return s;
  return null;
}

/** Email simple (forme générale), en minuscules. Renvoie null si invalide. */
export function cleanEmail(input: unknown): string | null {
  const s = String(input ?? "").trim().toLowerCase();
  return s.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? s : null;
}

/** "0612345678" → "06 12 34 56 78" (affichage) */
export function formatPhone(phone: string) {
  return /^0\d{9}$/.test(phone) ? phone.replace(/(\d{2})(?=\d)/g, "$1 ") : phone;
}
