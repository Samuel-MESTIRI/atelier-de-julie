"use client";
import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>
      <div>
        <label htmlFor="password" className="label">Mot de passe</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </div>
      {state.error && (
        <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{state.error}</p>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
