"use client";
import { useActionState, useTransition } from "react";
import { nutzerAendern, nutzerAnlegen } from "@/lib/aktionen";

const feld = "rounded-md border border-neutral-300 px-3 py-2 font-normal outline-none focus:border-neutral-900";

export function NutzerFormular() {
  const [status, aktion, laeuft] = useActionState(nutzerAnlegen, null);
  return (
    <form action={aktion} className="mt-4 grid max-w-xl gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm font-medium">E-Mail<input name="email" type="email" required autoComplete="off" className={feld} /></label>
      <label className="flex flex-col gap-1 text-sm font-medium">Name<input name="name" autoComplete="off" className={feld} /></label>
      <label className="flex flex-col gap-1 text-sm font-medium">Startpasswort (mind. 12 Zeichen)<input name="passwort" type="password" required minLength={12} autoComplete="new-password" className={feld} /></label>
      <label className="flex flex-col gap-1 text-sm font-medium">Rolle
        <select name="rolle" className={feld}><option value="nutzer">Nutzer</option><option value="admin">Admin</option></select>
      </label>
      <div className="sm:col-span-2">
        <button disabled={laeuft} className="rounded-md bg-neutral-900 px-4 py-2 font-medium text-white disabled:opacity-60">{laeuft ? "Anlegen …" : "Nutzer anlegen"}</button>
        {status && !status.ok && <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{status.fehler}</p>}
        {status?.ok && <p role="status" className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">Nutzer {status.daten.email} ist angelegt.</p>}
      </div>
    </form>
  );
}

export function NutzerZeile({ nutzer, istIch }: { nutzer: { id: string; email: string; name: string | null; rolle: string; aktiv: boolean }; istIch: boolean }) {
  const [laeuft, start] = useTransition();
  return (
    <tr className="border-b border-neutral-200">
      <td className="py-2">{nutzer.email}</td>
      <td>{nutzer.name}</td>
      <td>{nutzer.rolle === "admin" ? "Admin" : "Nutzer"}</td>
      <td>{nutzer.aktiv ? "aktiv" : "gesperrt"}</td>
      <td className="text-right">
        {!istIch && (
          <button disabled={laeuft} onClick={() => start(async () => { await nutzerAendern(nutzer.id, { aktiv: !nutzer.aktiv }); })} className="rounded border border-neutral-300 px-2 py-1 text-xs disabled:opacity-60">
            {nutzer.aktiv ? "Sperren" : "Freischalten"}
          </button>
        )}
      </td>
    </tr>
  );
}
