// Client Supabase avec la clé SECRÈTE : contourne les règles RLS.
// ⚠️ À n'utiliser QUE dans du code serveur (actions serveur, pages serveur),
// après avoir vérifié soi-même les données reçues. Jamais dans un composant "use client".
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("Le client admin ne doit jamais être utilisé dans le navigateur.");
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
