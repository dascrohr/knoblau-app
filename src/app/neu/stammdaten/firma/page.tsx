import type { Metadata } from "next";
import { Knopf, Seitenkopf } from "@/components/neu/ui";
import { ladeFirma } from "@/lib/daten";
import { FIRMA_FELDER, type FirmaSchluessel } from "@/lib/firma";
import { aktuellerNutzer } from "@/lib/supabase/server";
import { FirmaFormular } from "./firma-formular";

export const metadata: Metadata = { title: "Firmenangaben – Stammdaten" };

export default async function FirmaSeite() {
  const [firma, nutzer] = await Promise.all([ladeFirma(), aktuellerNutzer()]);
  const werte = Object.fromEntries(FIRMA_FELDER.map((f) => [f.schluessel, firma[f.schluessel] ?? ""])) as Record<FirmaSchluessel, string>;
  return (
    <>
      <Seitenkopf
        titel="Firmenangaben und Drucktexte"
        unter="Diese Angaben erscheinen im Briefkopf und in der Fußzeile von Angebot, Auftragsbestätigung und Rechnung."
        aktionen={<Knopf href="/neu/stammdaten">← Alle Stammdaten</Knopf>}
      />
      <FirmaFormular werte={werte} darfSpeichern={nutzer?.rolle === "admin"} />
    </>
  );
}
