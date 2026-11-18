import type { Metadata } from "next";
import Link from "next/link";
import { DashboardAnsicht } from "@/components/neu/dashboard/ansicht";
import { Hinweis, Seitenkopf } from "@/components/neu/ui";
import { ladeDashboard } from "@/lib/dashboard/laden";
import "./dashboard.css";

export const metadata: Metadata = { title: "Geschäftsleitung" };

type Suche = { z?: string; von?: string; bis?: string; adresse?: string };

export default async function GeschaeftsleitungSeite({ searchParams }: { searchParams: Promise<Suche> }) {
  const s = await searchParams;
  // Die Rolle wird in ladeDashboard geprüft, bevor Daten geladen werden.
  const antwort = await ladeDashboard({ zeitraum: s.z, von: s.von, bis: s.bis, adresse: s.adresse });
  if (!antwort.zugriff) {
    return (
      <>
        <Seitenkopf titel="Geschäftsleitung" />
        <Hinweis art="warnung" titel="Kein Zugriff">
          Diese Übersicht ist Administratoren vorbehalten. <Link href="/neu/angebote" className="k-link">Zurück zu den Angeboten</Link>
        </Hinweis>
      </>
    );
  }
  return <DashboardAnsicht daten={antwort.daten} auswahl={antwort.auswahl} geladenUm={antwort.geladenUm} fruehestes={antwort.fruehestes} />;
}
