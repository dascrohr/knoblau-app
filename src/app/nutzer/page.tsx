import Link from "next/link";
import { redirect } from "next/navigation";
import { aktuellerNutzer, db } from "@/lib/supabase/server";
import { NutzerFormular, NutzerZeile } from "./formular";

export const metadata = { title: "Nutzer" };

export default async function NutzerSeite() {
  const ich = await aktuellerNutzer();
  if (!ich) redirect("/login");
  if (ich.rolle !== "admin") {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-xl font-semibold">Nutzerverwaltung</h1>
        <p className="mt-2 text-neutral-600">Nur der Admin kann Nutzer anlegen.</p>
        <Link href="/neu" className="mt-4 inline-block underline">Zurück</Link>
      </main>
    );
  }
  const sb = await db();
  const { data: nutzer } = await sb.from("profile").select("id,email,name,rolle,aktiv,erstellt_am").order("erstellt_am");
  return (
    <main className="mx-auto max-w-3xl p-6 sm:p-8">
      <Link href="/neu" className="text-sm text-neutral-600 underline">← Zurück zur App</Link>
      <h1 className="mt-3 text-2xl font-semibold">Nutzerverwaltung</h1>
      <p className="mt-1 text-sm text-neutral-600">Zugänge gibt es nur hier. Das Startpasswort gibst du persönlich weiter.</p>
      <table className="mt-6 w-full text-left text-sm">
        <thead className="border-b border-neutral-300 text-neutral-600">
          <tr><th className="py-2 font-medium">E-Mail</th><th className="font-medium">Name</th><th className="font-medium">Rolle</th><th className="font-medium">Status</th><th /></tr>
        </thead>
        <tbody>
          {(nutzer ?? []).map((n) => <NutzerZeile key={n.id} nutzer={n} istIch={n.id === ich.id} />)}
        </tbody>
      </table>
      <h2 className="mt-10 text-lg font-semibold">Neuen Nutzer anlegen</h2>
      <NutzerFormular />
    </main>
  );
}
