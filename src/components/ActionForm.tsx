"use client";
// Formulaire du back-office relié à une action serveur.
//  - affiche le message d'erreur ou de succès renvoyé par l'action
//  - désactive les champs pendant l'envoi
//  - ne vide PAS les champs en cas d'erreur (contrairement à <form action>)
import { useState, useTransition } from "react";

export type ActionResult = { error?: string; ok?: string };

type Props = {
  action: (formData: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;   // pour les formulaires d'ajout
  confirm?: string;           // message de confirmation (suppression…)
};

export function ActionForm({ action, children, className = "", resetOnSuccess, confirm }: Props) {
  const [result, setResult] = useState<ActionResult>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (confirm && !window.confirm(confirm)) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      const r = await action(data);
      setResult(r);
      if (r.ok && resetOnSuccess) form.reset();
    });
  }

  return (
    <form onSubmit={onSubmit} className={className}>
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {result.error && <p role="alert" className="mt-2 rounded-lg bg-danger/10 p-2 text-sm text-danger">{result.error}</p>}
      {result.ok && <p role="status" className="mt-2 text-sm text-sage-dark">✓ {result.ok}</p>}
    </form>
  );
}
