import Link from "next/link";
import type { Metadata } from "next";
import { ladeStamm } from "@/lib/daten";
import { Abzeichen, Seitenkopf } from "@/components/neu/ui";
import { STAMM_KONFIG, auswahlListeVersteckt } from "./konfig";

export const metadata: Metadata = { title: "Stammdaten" };

export default async function StammdatenSeite() {
  const zahlen = await Promise.all(
    STAMM_KONFIG.map(async (k) => {
      let zeilen = await ladeStamm<{ aktiv: boolean; liste?: string }>(k.tabelle, { alle: true });
      if (k.tabelle === "stamm_auswahl") zeilen = zeilen.filter((z) => !auswahlListeVersteckt(z.liste));
      return { gesamt: zeilen.length, aktiv: zeilen.filter((z) => z.aktiv).length };
    }),
  );
  const zahl = new Intl.NumberFormat("de-DE");
  return (
    <>
      <Seitenkopf titel="Stammdaten" unter="Preise, Kataloge und Auswahllisten selbst pflegen. Änderungen gelten sofort für neue Eingaben; bestehende Angebote bleiben unverändert." />
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {STAMM_KONFIG.map((k, i) => (
          <li key={k.slug}>
            <Link href={`/neu/stammdaten/${k.slug}`} className="k-karte flex h-full flex-col gap-2" style={{ padding: "var(--k-a4)", textDecoration: "none", color: "inherit" }}>
              <span style={{ fontFamily: "var(--k-schrift-titel)", fontSize: "var(--k-text-l)", fontWeight: 600 }}>{k.titel}</span>
              <span className="k-leise" style={{ flex: 1 }}>
                {k.beschreibung}
              </span>
              <span className="flex flex-wrap items-center gap-2">
                {zahlen[i].gesamt === 0 ? (
                  <Abzeichen art="warnung">noch leer</Abzeichen>
                ) : (
                  <>
                    <Abzeichen art="erfolg">{zahl.format(zahlen[i].aktiv)} aktiv</Abzeichen>
                    <span className="k-leise">von {zahl.format(zahlen[i].gesamt)}</span>
                  </>
                )}
              </span>
            </Link>
          </li>
        ))}
        <li>
          <Link href="/neu/stammdaten/firma" className="k-karte flex h-full flex-col gap-2" style={{ padding: "var(--k-a4)", textDecoration: "none", color: "inherit" }}>
            <span style={{ fontFamily: "var(--k-schrift-titel)", fontSize: "var(--k-text-l)", fontWeight: 600 }}>Firmenangaben und Drucktexte</span>
            <span className="k-leise" style={{ flex: 1 }}>
              Briefkopf, Fußzeile sowie Einleitungs- und Schlusstexte von Angebot, Auftragsbestätigung und Rechnung.
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <Abzeichen art="info">Einstellungen</Abzeichen>
            </span>
          </Link>
        </li>
      </ul>
    </>
  );
}
