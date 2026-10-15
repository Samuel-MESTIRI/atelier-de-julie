// Liste de l'équipe + ajout d'une coiffeuse.
import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createStylist } from "./actions";

export default async function TeamPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: stylists } = await supabase.from("stylists").select("id, name, color, active").order("position");

  return (
    <div className="max-w-2xl">
      <h1 className="mb-5 text-3xl">Équipe</h1>
      <ul className="space-y-2">
        {(stylists ?? []).map((s) => (
          <li key={s.id}>
            <Link href={`/admin/equipe/${s.id}`} className="card flex items-center gap-3 p-4 hover:border-sage">
              <span className="flex h-10 w-10 items-center justify-center rounded-full font-serif text-lg text-white" style={{ background: s.color }}>
                {s.name[0]}
              </span>
              <span className="flex-1 font-semibold">{s.name}</span>
              {!s.active && <span className="rounded-full bg-sand px-2 py-0.5 text-xs">inactive</span>}
              <span className="text-muted">›</span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="card mt-8">
        <h2 className="mb-3 text-2xl">Ajouter une coiffeuse</h2>
        <ActionForm action={createStylist} className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1">
            <label className="label" htmlFor="name">Prénom</label>
            <input id="name" name="name" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="color">Couleur</label>
            <input id="color" name="color" type="color" defaultValue="#9CAF88" className="h-11 w-16 rounded-lg border border-beige" />
          </div>
          <button className="btn btn-primary">Ajouter</button>
        </ActionForm>
      </section>
    </div>
  );
}
