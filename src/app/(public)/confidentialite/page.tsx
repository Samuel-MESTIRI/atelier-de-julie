import type { Metadata } from "next";
import { getSettings } from "@/lib/public-data";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default async function PrivacyPage() {
  const s = await getSettings();

  return (
    <article className="mx-auto max-w-2xl space-y-6 px-4 py-10 leading-relaxed">
      <h1 className="text-4xl">Politique de confidentialité</h1>

      <section>
        <h2 className="mb-2 text-2xl">Responsable du traitement</h2>
        <p>
          {s.legal_name || s.salon_name}, {s.address}. Contact : {s.email || s.phone}.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-2xl">Données collectées et finalité</h2>
        <p>
          Lors d&apos;une réservation, nous collectons votre nom, votre numéro de téléphone, votre adresse email
          ainsi que les informations du rendez-vous (prestation, date, coiffeuse). Ces données servent
          uniquement à gérer vos rendez-vous : confirmation, rappel, annulation et suivi de votre historique
          au salon.
        </p>
        <p className="mt-2">
          Base légale : l&apos;exécution des mesures précontractuelles et du contrat de prestation que vous
          demandez (article 6.1.b du RGPD).
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-2xl">Destinataires et hébergement</h2>
        <p>
          Seules les coiffeuses du salon ont accès à vos données. Elles ne sont ni vendues, ni cédées à des
          tiers. Elles sont hébergées par Supabase, sur des serveurs situés dans l&apos;Union européenne.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-2xl">Durée de conservation</h2>
        <p>Vos données sont conservées 3 ans après votre dernier rendez-vous, puis supprimées.</p>
      </section>

      <section>
        <h2 className="mb-2 text-2xl">Vos droits</h2>
        <p>
          Vous pouvez accéder à vos données, les rectifier, les supprimer ou vous opposer à leur traitement
          en écrivant à {s.email || "l'adresse du salon"}. Vous pouvez également introduire une réclamation
          auprès de la CNIL (www.cnil.fr).
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-2xl">Cookies</h2>
        <p>
          Ce site n&apos;utilise aucun cookie publicitaire ni de mesure d&apos;audience. Seul un cookie
          technique, indispensable à la connexion de l&apos;équipe du salon à son espace, est utilisé : il ne
          nécessite pas de consentement.
        </p>
      </section>
    </article>
  );
}
