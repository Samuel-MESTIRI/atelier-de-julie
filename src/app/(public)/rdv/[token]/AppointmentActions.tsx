"use client";
import { useActionState, useState } from "react";
import { cancelAppointment, type CancelState } from "./actions";

/** Bouton "Copier le lien" : la cliente garde ce lien pour retrouver / annuler son rendez-vous. */
export function CopyLink() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-secondary w-full"
      onClick={async () => {
        await navigator.clipboard.writeText(window.location.href.split("?")[0]);
        setCopied(true);
      }}
    >
      {copied ? "Lien copié ✓" : "Copier le lien de ce rendez-vous"}
    </button>
  );
}

export function CancelButton({ token }: { token: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState<CancelState>(cancelAppointment.bind(null, token), {});

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="btn w-full text-danger hover:bg-danger/10">
        Annuler ce rendez-vous
      </button>
    );
  }
  return (
    <form action={action} className="rounded-2xl border border-danger/40 bg-danger/5 p-4">
      <p className="mb-3 text-sm font-semibold">Confirmer l&apos;annulation ?</p>
      {state.error && <p role="alert" className="mb-3 text-sm text-danger">{state.error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setConfirming(false)} className="btn btn-secondary flex-1">Non</button>
        <button type="submit" disabled={pending} className="btn flex-1 bg-danger text-white">
          {pending ? "…" : "Oui, annuler"}
        </button>
      </div>
    </form>
  );
}
