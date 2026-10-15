// Liste des clientes avec recherche, compteur d'absences et historique.
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { formatPhone } from "@/lib/validation";

type Client = {
  id: string; full_name: string; phone: string; email: string; no_show_count: number;
  appointments: { id: string; starts_at: string; service_name: string; status: string }[];
};

const STATUS = { confirme: "", annule: "annulé", venue: "✓", absente: "✗ absente" } as Record<string, string>;

export default async function ClientsPage({ searchParams }: PageProps<"/admin/clientes">) {
  await requireAdmin();
  const { q: rawQ } = await searchParams;
  const q = typeof rawQ === "string" ? rawQ.trim().slice(0, 50) : "";

  const supabase = await createClient();
  let query = supabase
    .from("clients")
    .select("id, full_name, phone, email, no_show_count, appointments(id, starts_at, service_name, status)")
    .order("full_name")
    .limit(100);
  if (q) {
    // Recherche par nom, email ou téléphone (sans espaces). Les caractères spéciaux sont retirés.
    const safe = q.replace(/[^\p{L}\p{N}@.\-+ ]/gu, "");
    const digits = safe.replace(/\D/g, "");
    query = query.or(
      [`full_name.ilike.%${safe}%`, `email.ilike.%${safe}%`, digits.length >= 2 ? `phone.ilike.%${digits}%` : ""].filter(Boolean).join(","),
    );
  }
  const { data } = await query.overrideTypes<Client[], { merge: false }>();
  const clients = data ?? [];

  return (
    <div className="max-w-3xl">
      <h1 className="mb-4 text-3xl">Clientes</h1>
      <form className="mb-5 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Nom, téléphone ou email" className="input" />
        <button className="btn btn-primary">Chercher</button>
      </form>

      {clients.length === 0 && <p className="text-muted">Aucune cliente trouvée.</p>}
      <ul className="space-y-2">
        {clients.map((c) => {
          const history = [...c.appointments].sort((a, b) => b.starts_at.localeCompare(a.starts_at));
          return (
            <li key={c.id}>
              <details className="card p-0">
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-4">
                  <span>
                    <span className="font-semibold">{c.full_name}</span>
                    <span className="block text-sm text-muted">{formatPhone(c.phone)}{c.email && ` · ${c.email}`}</span>
                  </span>
                  <span className="text-sm">
                    {history.length} rdv
                    {c.no_show_count > 0 && (
                      <span className="ml-2 rounded-full bg-danger/10 px-2 py-0.5 font-semibold text-danger">
                        {c.no_show_count} absence{c.no_show_count > 1 ? "s" : ""}
                      </span>
                    )}
                  </span>
                </summary>
                <ul className="border-t border-beige p-3 text-sm">
                  {history.map((a) => (
                    <li key={a.id}>
                      <Link href={`/admin/rdv/${a.id}`} className="flex gap-3 rounded-lg p-1.5 hover:bg-sand">
                        <span className="w-32 shrink-0">{formatDate(a.starts_at)} {formatTime(a.starts_at)}</span>
                        <span className="flex-1">{a.service_name}</span>
                        <span className={a.status === "absente" ? "text-danger" : "text-muted"}>{STATUS[a.status]}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
