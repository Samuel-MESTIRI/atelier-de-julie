// Mise en page du site public : en-tête + pied de page.
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getSettings } from "@/lib/public-data";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-beige/70 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" aria-label="Accueil">
            <Logo />
          </Link>
          <Link href="/reserver" className="btn btn-primary px-4 text-sm">
            Réserver
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 border-t border-beige bg-sand">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 text-sm text-muted sm:grid-cols-2">
          <div className="space-y-1">
            <p className="font-serif text-lg text-ink">{settings.salon_name}</p>
            {settings.address && <p>{settings.address}</p>}
            {settings.phone && (
              <p>
                <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="underline-offset-2 hover:underline">
                  {settings.phone}
                </a>
              </p>
            )}
          </div>
          <nav className="flex flex-col gap-2 sm:items-end">
            <Link href="/mentions-legales" className="hover:text-ink">Mentions légales</Link>
            <Link href="/confidentialite" className="hover:text-ink">Politique de confidentialité</Link>
            <Link href="/connexion" className="hover:text-ink">Espace équipe</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
