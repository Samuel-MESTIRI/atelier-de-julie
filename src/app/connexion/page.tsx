import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { getProfile } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

export default async function LoginPage() {
  // Déjà connectée : direction le planning
  if (await getProfile()) redirect("/admin");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center"><Logo /></Link>
        <div className="card">
          <h1 className="mb-1 text-2xl">Espace équipe</h1>
          <p className="mb-6 text-sm text-muted">Connectez-vous pour accéder au planning.</p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
