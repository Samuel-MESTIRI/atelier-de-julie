// Mise en page du back-office. Vérifie la connexion côté serveur.
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { requireStaff } from "@/lib/auth";
import { logout } from "@/app/connexion/actions";
import { AdminNav } from "./AdminNav";

export const metadata: Metadata = { title: "Back-office", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireStaff();

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
        <AdminNav isAdmin={profile.role === "admin"} />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
