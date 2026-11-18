"use client";
import { useActionState } from "react";
import { anmelden } from "./aktionen";

export function LoginFormular() {
  const [status, aktion, laeuft] = useActionState(anmelden, null);
  return (
    <form action={aktion} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        E-Mail
        <input name="email" type="email" autoComplete="username" required autoFocus
          className="rounded-md border border-neutral-300 px-3 py-2 text-base font-normal outline-none focus:border-neutral-900" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Passwort
        <input name="passwort" type="password" autoComplete="current-password" required
          className="rounded-md border border-neutral-300 px-3 py-2 text-base font-normal outline-none focus:border-neutral-900" />
      </label>
      {status?.fehler && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{status.fehler}</p>}
      <button disabled={laeuft} className="rounded-md bg-neutral-900 px-4 py-2.5 font-medium text-white disabled:opacity-60">
        {laeuft ? "Anmelden …" : "Anmelden"}
      </button>
    </form>
  );
}
