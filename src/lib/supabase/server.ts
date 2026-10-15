// Client Supabase côté serveur, "au nom de" la personne connectée.
// Les règles RLS s'appliquent : une coiffeuse ne voit que son planning.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Appelé depuis un composant serveur (lecture seule) : sans conséquence,
            // le proxy rafraîchit la session à chaque requête.
          }
        },
      },
    },
  );
}
