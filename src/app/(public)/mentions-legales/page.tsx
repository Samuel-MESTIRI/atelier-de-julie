import type { Metadata } from "next";
import { getSettings } from "@/lib/public-data";

export const metadata: Metadata = { title: "Mentions légales" };

// Les informations de l'éditrice viennent des réglages (modifiables dans le back-office).
export default async function LegalPage() {
  const s = await getSettings();
  const missing = <em className="text-danger">à compléter dans les réglages</em>;

  return (
    <article className="mx-auto max-w-2xl space-y-6 px-4 py-10 leading-relaxed">
      <h1 className="text-4xl">Mentions légales</h1>

      <section>
        <h2 className="mb-2 text-2xl">Éditrice du site</h2>
        <p>{s.salon_name}</p>
        <p>Exploitante : {s.legal_name || missing}</p>
        <p>Adresse : {s.address || missing}</p>
        <p>SIRET : {s.siret || missing}</p>
        <p>Téléphone : {s.phone || missing}</p>
        <p>Email : {s.email || missing}</p>
        <p>Directrice de la publication : {s.legal_name || missing}</p>
      </section>

      <section>
        <h2 className="mb-2 text-2xl">Hébergement</h2>
        <p>Site : {s.host_info}</p>
        <p>Données : Supabase Inc., 970 Toa Payoh North #07-04, Singapour 318992 — serveurs situés dans l&apos;Union européenne.</p>
      </section>

      <section>
        <h2 className="mb-2 text-2xl">Propriété intellectuelle</h2>
        <p>
          L&apos;ensemble des contenus de ce site (textes, logo, visuels) est la propriété de {s.salon_name}.
          Toute reproduction sans autorisation est interdite.
        </p>
      </section>
    </article>
  );
}
