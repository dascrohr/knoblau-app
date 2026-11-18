import type { Metadata } from "next";
import Link from "next/link";
import { einer, ganzzahl, type SuchParameter } from "@/components/neu/hilfen";
import { NeuesAngebotKnopf } from "@/components/neu/neues-angebot-knopf";
import { Suchleiste } from "@/components/neu/suchleiste";
import { Abzeichen, Blaettern, Karte, Leerzustand, Seitenkopf, Tabelle } from "@/components/neu/ui";
import { angebotFilter, listeAngebote } from "@/lib/daten";
import { formatBetrag, formatDatum } from "@/lib/preis";

export const metadata: Metadata = { title: "Angebote" };

export default async function Angebote({ searchParams }: { searchParams: SuchParameter }) {
  const sp = await searchParams;
  const q = einer(sp.q);
  const jahr = ganzzahl(sp.jahr);
  const status = einer(sp.status);
  const seite = ganzzahl(sp.seite) ?? 1;
  const [liste, filter] = await Promise.all([listeAngebote({ q, jahr, status: status || null, seite }), angebotFilter()]);
  const gefiltert = !!(q || jahr || status);

  return (
    <>
      <Seitenkopf titel="Angebote" unter="Neueste zuerst. Suche nach Name, Ort oder Angebotsnummer." aktionen={<NeuesAngebotKnopf />} />
      <Karte randlos>
        <div className="k-karte-inhalt">
          <Suchleiste
            q={q}
            platzhalter="Name, Ort oder Angebotsnr."
            werte={{ jahr: jahr ? String(jahr) : "", status }}
            filter={[
              { name: "jahr", label: "Jahr", leer: "Alle Jahre", optionen: filter.jahre.map(String) },
              { name: "status", label: "Status", leer: "Jeder Status", optionen: [...filter.status, { wert: "(leer)", text: "ohne Status" }] },
            ]}
          />
        </div>
        {liste.zeilen.length === 0 ? (
          <Leerzustand
            titel={gefiltert ? "Keine Angebote gefunden" : "Noch keine Angebote"}
            text={gefiltert ? "Bitte Suchbegriff oder Filter ändern." : "Legen Sie das erste Angebot an."}
            aktion={gefiltert ? undefined : <NeuesAngebotKnopf />}
          />
        ) : (
          <Tabelle
            beschriftung="Angebote"
            spalten={["Nr.", "Datum", "Kunde", "von → nach", "Umzugstermin", "Status", { titel: "Netto €", rechts: true }]}
          >
            {liste.zeilen.map((a) => (
              <tr key={a.id}>
                <td>
                  <Link href={`/neu/angebote/${a.id}`} className="k-link k-zahl">
                    {a.angebotnr || "ohne Nr."}
                  </Link>
                </td>
                <td className="whitespace-nowrap">{formatDatum(a.angebotsdatum)}</td>
                <td>
                  <Link href={`/neu/angebote/${a.id}`} className="text-inherit no-underline hover:underline">
                    {a.name || <span className="k-leise">ohne Namen</span>}
                  </Link>
                </td>
                <td>
                  {a.von_ort || a.nach_ort ? (
                    <>
                      {a.von_ort || "–"} <span className="k-leise" aria-label="nach">→</span> {a.nach_ort || "–"}
                    </>
                  ) : (
                    <span className="k-leise">–</span>
                  )}
                </td>
                <td className="whitespace-nowrap">{formatDatum(a.umzugstermin) || <span className="k-leise">–</span>}</td>
                <td>{a.status ? <Abzeichen>{a.status}</Abzeichen> : <span className="k-leise">–</span>}</td>
                <td className="k-rechts">{formatBetrag(a.netto_summe)}</td>
              </tr>
            ))}
          </Tabelle>
        )}
        <Blaettern seite={liste.seite} seiten={liste.seiten} gesamt={liste.gesamt} pfad="/neu/angebote" parameter={{ q, jahr, status }} einheit={liste.gesamt === 1 ? "Angebot" : "Angebote"} />
      </Karte>
    </>
  );
}
