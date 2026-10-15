// Mise en page du back-office. Vérifie la connexion côté serveur.
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { requireStaff } from "@/lib/auth";
import { logout } from "@/app/connexion/actions";

export const metadata: Metadata = { title: "Back-office", robots: { index: false } };

// Menu : "adminOnly" = visible uniquement par Julie
const NAV = [
  { href: "/admin", label: "Planning", adminOnly: false },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireStaff();
  const links = NAV.filter((l) => !l.adminOnly || profile.role === "admin");

  return (
    <>
      <header className="border-b border-beige bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/admin"><Logo /></Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted sm:inline">
              {profile.full_name} · {profile.role === "admin" ? "Gérante" : "Coiffeuse"}
            </span>
            <form action={logout}>
              <button className="btn btn-secondary min-h-9 px-3 py-1 text-sm">Déconnexion</button>
            </form>
          </div>
        </div>
        {/* Menu défilant horizontalement sur mobile */}
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="whitespace-nowrap rounded-full px-3 py-1.5 hover:bg-sand">
              {l.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
