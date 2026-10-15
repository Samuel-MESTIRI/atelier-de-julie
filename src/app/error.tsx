"use client";
// Affiché si une erreur inattendue survient (ex. base injoignable).
import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-4xl">Oups, un souci technique</h1>
      <p className="max-w-sm text-muted">
        Merci de réessayer dans un instant. Si le problème persiste, vous pouvez appeler directement le salon.
      </p>
      <div className="flex gap-2">
        <button onClick={reset} className="btn btn-primary">Réessayer</button>
        <Link href="/" className="btn btn-secondary">Accueil</Link>
      </div>
    </main>
  );
}
