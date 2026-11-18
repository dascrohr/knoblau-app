import type { Metadata } from "next";
import { KundenFormular } from "@/components/neu/kunden-formular";
import { Karte, Knopf, Seitenkopf } from "@/components/neu/ui";
import { ladeAuswahl } from "@/lib/daten";

export const metadata: Metadata = { title: "Neuer Kunde" };

export default async function NeuerKundeSeite() {
  const zahlungsbedingungen = await ladeAuswahl("zahlungsbedingung");
  return (
    <>
      <Seitenkopf
        titel="Neuer Kunde"
        unter="Mindestens ein Name oder eine Firma ist nötig. Alles andere lässt sich später ergänzen."
        aktionen={
          <Knopf href="/neu/kunden" art="still">
            ← Zur Kundenliste
          </Knopf>
        }
      />
      <Karte titel="Stammdaten" className="max-w-4xl">
        <KundenFormular kunde={null} zahlungsbedingungen={zahlungsbedingungen} />
      </Karte>
    </>
  );
}
