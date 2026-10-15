import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = { title: "Page introuvable" };

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <Link href="/"><Logo /></Link>
      <h1 className="text-4xl">Page introuvable</h1>
      <p className="max-w-sm text-muted">
        Cette page n&apos;existe pas ou plus. Si vous cherchiez votre rendez-vous, vérifiez le lien reçu lors de la réservation.
      </p>
      <Link href="/" className="btn btn-primary">Retour à l&apos;accueil</Link>
    </main>
  );
}
