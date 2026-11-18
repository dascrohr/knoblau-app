import Link from "next/link";
import { redirect } from "next/navigation";
import { aktuellerNutzer } from "@/lib/supabase/server";
import { PasswortFormular } from "./formular";

export const metadata = { title: "Mein Konto" };

export default async function KontoSeite({ searchParams }: { searchParams: Promise<{ neu?: string }> }) {
  const ich = await aktuellerNutzer();
  if (!ich) redirect("/login");
  const { neu } = await searchParams;
  return (
    <main className="mx-auto max-w-xl p-6 sm:p-8">
      <Link href="/neu" className="text-sm text-neutral-600 underline">← Zurück zur App</Link>
      <h1 className="mt-3 text-2xl font-semibold">Mein Konto</h1>
      <dl className="mt-4 grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
        <dt className="text-neutral-600">E-Mail</dt><dd>{ich.email}</dd>
        <dt className="text-neutral-600">Name</dt><dd>{ich.name || "–"}</dd>
        <dt className="text-neutral-600">Rolle</dt><dd>{ich.rolle === "admin" ? "Admin" : "Nutzer"}</dd>
      </dl>
      <h2 className="mt-8 text-lg font-semibold">{neu ? "Neues Passwort festlegen" : "Passwort ändern"}</h2>
      {neu ? <p className="mt-1 text-sm text-neutral-600">Du bist über den Link aus der E-Mail angemeldet. Lege jetzt ein neues Passwort fest.</p> : null}
      <PasswortFormular />
    </main>
  );
}
