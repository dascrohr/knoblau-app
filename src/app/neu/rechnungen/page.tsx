import type { Metadata } from "next";
import Link from "next/link";
import { einer, ganzzahl, type SuchParameter } from "@/components/neu/hilfen";
import { Suchleiste } from "@/components/neu/suchleiste";
import { Abzeichen, Blaettern, Hinweis, Karte, Leerzustand, Seitenkopf, Tabelle } from "@/components/neu/ui";
import { adressName } from "@/lib/angebot-typen";
import { angebotFilter, listeRechnungen } from "@/lib/daten";
import { formatBetrag, formatDatum } from "@/lib/preis";

export const metadata: Metadata = { title: "Rechnungen" };

export default async function Rechnungen({ searchParams }: { searchParams: SuchParameter }) {
  const sp = await searchParams;
  const q = einer(sp.q);
  const jahr = ganzzahl(sp.jahr);
  const seite = ganzzahl(sp.seite) ?? 1;
  const [liste, filter] = await Promise.all([listeRechnungen({ q, jahr, seite }), angebotFilter()]);
  const gefiltert = !!(q || jahr);

  return (
    <>
      <Seitenkopf titel="Rechnungen" unter="Neueste zuerst. Suche nach Name, Ort oder Rechnungsnummer." />
      <Hinweis className="mb-4" titel="Rechnungen werden heute nur angezeigt">
        Neue Rechnungen schreiben und bestehende ändern ist in der Neuansicht noch nicht möglich.
      </Hinweis>
      <Karte randlos>
        <div className="k-karte-inhalt">
          <Suchleiste q={q} platzhalter="Name, Ort oder Rechnungsnr." werte={{ jahr: jahr ? String(jahr) : "" }} filter={[{ name: "jahr", label: "Jahr", leer: "Alle Jahre", optionen: filter.jahre.map(String) }]} />
        </div>
        {liste.zeilen.length === 0 ? (
          <Leerzustand titel={gefiltert ? "Keine Rechnungen gefunden" : "Noch keine Rechnungen"} text={gefiltert ? "Bitte Suchbegriff oder Jahr ändern." : undefined} />
        ) : (
          <Tabelle beschriftung="Rechnungen" spalten={["Rechnungsnr.", "Datum", "Kunde", "Ort", "Angebot", "Gebucht", { titel: "Netto €", rechts: true }, { titel: "Gesamt €", rechts: true }]}>
            {liste.zeilen.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/neu/rechnungen/${r.id}`} className="k-link k-zahl">
                    {r.rechnungnr || "ohne Nr."}
                  </Link>
                </td>
                <td className="whitespace-nowrap">{formatDatum(r.rechnungsdatum)}</td>
                <td>
                  <Link href={`/neu/rechnungen/${r.id}`} className="text-inherit no-underline hover:underline">
                    {adressName(r) || <span className="k-leise">ohne Namen</span>}
                  </Link>
                </td>
                <td>{[r.plz, r.ort].filter(Boolean).join(" ")}</td>
                <td>
                  {r.angebot_id ? (
                    <Link href={`/neu/angebote/${r.angebot_id}`} className="k-link">
                      {r.angebotnr || "öffnen"}
                    </Link>
                  ) : (
                    r.angebotnr || <span className="k-leise">–</span>
                  )}
                </td>
                <td>{r.gebucht ? <Abzeichen art="erfolg">gebucht</Abzeichen> : <Abzeichen>offen</Abzeichen>}</td>
                <td className="k-rechts">{formatBetrag(r.netto)}</td>
                <td className="k-rechts">{formatBetrag(r.gesamtsumme)}</td>
              </tr>
            ))}
          </Tabelle>
        )}
        <Blaettern seite={liste.seite} seiten={liste.seiten} gesamt={liste.gesamt} pfad="/neu/rechnungen" parameter={{ q, jahr }} einheit={liste.gesamt === 1 ? "Rechnung" : "Rechnungen"} />
      </Karte>
    </>
  );
}
