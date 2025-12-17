"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

export type FormState = {
  error?: string;
  success?: string;
};

type AdminLoginFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
};

const initialState: FormState = {};

export default function AdminLoginForm({ action }: AdminLoginFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const [showError, setShowError] = useState<string | undefined>(state?.error);

  useEffect(() => {
    setShowError(state?.error);
  }, [state?.error]);

  return (
    <div className="mx-auto mt-24 max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-white shadow-xl backdrop-blur">
      <h1 className="mb-6 text-center text-2xl font-semibold">Accès Admin</h1>
      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm font-medium">
          Mot de passe
          <input
            type="password"
            name="password"
            required
            className="rounded-lg border border-white/20 bg-black/60 px-3 py-2 text-base focus:border-primary focus:outline-none"
            onChange={() => setShowError(undefined)}
          />
        </label>
        {showError ? (
          <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">
            {showError}
          </p>
        ) : null}
        <SubmitButton />
      </form>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Connexion…" : "Se connecter"}
    </button>
  );
}
