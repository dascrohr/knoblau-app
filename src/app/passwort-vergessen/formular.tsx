"use client";
import { useActionState } from "react";
import { passwortVergessen } from "@/app/login/aktionen";

export function VergessenFormular() {
  const [status, aktion, laeuft] = useActionState(passwortVergessen, null);
  return (
    <form action={aktion} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        E-Mail
        <input name="email" type="email" autoComplete="username" required autoFocus
          className="rounded-md border border-neutral-300 px-3 py-2 text-base font-normal outline-none focus:border-neutral-900" />
      </label>
      {status && <p role={status.ok ? "status" : "alert"} className={`rounded-md px-3 py-2 text-sm ${status.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{status.text}</p>}
      <button disabled={laeuft} className="rounded-md bg-neutral-900 px-4 py-2.5 font-medium text-white disabled:opacity-60">
        {laeuft ? "Wird gesendet …" : "Link senden"}
      </button>
    </form>
  );
}
