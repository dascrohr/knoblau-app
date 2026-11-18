"use client";
import { useActionState } from "react";
import { passwortAendern } from "@/lib/aktionen";

const feld = "rounded-md border border-neutral-300 px-3 py-2 font-normal outline-none focus:border-neutral-900";

export function PasswortFormular() {
  const [status, aktion, laeuft] = useActionState(passwortAendern, null);
  return (
    <form action={aktion} className="mt-4 flex max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">Neues Passwort (mind. 12 Zeichen)
        <input name="neu" type="password" required minLength={12} autoComplete="new-password" className={feld} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">Neues Passwort wiederholen
        <input name="wiederholung" type="password" required minLength={12} autoComplete="new-password" className={feld} />
      </label>
      {status && !status.ok && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{status.fehler}</p>}
      {status?.ok && <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">Das Passwort ist geändert. Auf anderen Geräten bleibst du angemeldet.</p>}
      <div><button disabled={laeuft} className="rounded-md bg-neutral-900 px-4 py-2 font-medium text-white disabled:opacity-60">{laeuft ? "Speichert …" : "Passwort speichern"}</button></div>
    </form>
  );
}
