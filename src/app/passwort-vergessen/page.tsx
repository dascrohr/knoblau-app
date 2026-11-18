import { VergessenFormular } from "./formular";

export const metadata = { title: "Passwort vergessen" };

export default function PasswortVergessenSeite() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-100 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm ring-1 ring-neutral-200">
        <h1 className="text-xl font-semibold">Passwort vergessen</h1>
        <p className="mb-6 mt-1 text-sm text-neutral-600">Wir schicken dir einen Link, mit dem du ein neues Passwort festlegst. Alternativ kann der Admin dir ein neues Passwort setzen.</p>
        <VergessenFormular />
        <p className="mt-6 text-sm"><a href="/login" className="underline">← Zurück zur Anmeldung</a></p>
      </div>
    </main>
  );
}
