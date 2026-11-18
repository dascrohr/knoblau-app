import { LoginFormular } from "./formular";

export const metadata = { title: "Anmelden" };

export default function LoginSeite() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-100 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm ring-1 ring-neutral-200">
        <h1 className="text-xl font-semibold">Knoblau &amp; Sohn</h1>
        <p className="mb-6 mt-1 text-sm text-neutral-600">Umzugsverwaltung. Bitte anmelden.</p>
        <LoginFormular />
        <p className="mt-4 text-sm"><a href="/passwort-vergessen" className="underline">Passwort vergessen?</a></p>
        <p className="mt-6 text-xs text-neutral-500">Zugänge legt der Admin an. Eine Selbstregistrierung gibt es nicht.</p>
      </div>
    </main>
  );
}
