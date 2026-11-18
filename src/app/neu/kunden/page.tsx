import type { Metadata } from "next";
import Link from "next/link";
import { einer, ganzzahl, type SuchParameter } from "@/components/neu/hilfen";
import { Suchleiste } from "@/components/neu/suchleiste";
import { Abzeichen, Blaettern, Karte, Leerzustand, Seitenkopf, Tabelle } from "@/components/neu/ui";
import { adressName } from "@/lib/angebot-typen";
import { listeKunden } from "@/lib/daten";
import { formatDatum } from "@/lib/preis";

export const metadata: Metadata = { title: "Kunden" };

export default async function Kunden({ searchParams }: { searchParams: SuchParameter }) {
  const sp = await searchParams;
  const q = einer(sp.q);
  const artRoh = einer(sp.art);
  const art = artRoh === "firma" || artRoh === "privat" ? artRoh : null;
  const seite = ganzzahl(sp.seite) ?? 1;
  const liste = await listeKunden({ q, art, seite });
  const gefiltert = !!(q || art);

  return (
    <>
      <Seitenkopf titel="Kunden" unter="Firmenkunden und alle Auftraggeber aus den Angeboten. Zuletzt aktive zuerst." />
      <Karte randlos>
        <div className="k-karte-inhalt">
          <Suchleiste
            q={q}
            platzhalter="Name, Firma oder Ort"
            werte={{ art: art ?? "" }}
            filter={[{ name: "art", label: "Art", leer: "Firma und Privat", optionen: [{ wert: "firma", text: "Firma" }, { wert: "privat", text: "Privat" }] }]}
          />
        </div>
        {liste.zeilen.length === 0 ? (
          <Leerzustand titel={gefiltert ? "Keine Kunden gefunden" : "Noch keine Kunden"} text={gefiltert ? "Bitte Suchbegriff oder Filter ändern." : "Kunden entstehen automatisch aus den Angeboten."} />
        ) : (
          <Tabelle beschriftung="Kunden" spalten={["Name", "Ort", "Art", { titel: "Angebote", rechts: true }, "Letzter Kontakt"]}>
            {liste.zeilen.map((k) => (
              <tr key={k.id}>
                <td>
                  <Link href={`/neu/kunden/${k.id}`} className="k-link">
                    {adressName(k) || "ohne Namen"}
                  </Link>
                </td>
                <td>{[k.plz, k.ort].filter(Boolean).join(" ") || <span className="k-leise">–</span>}</td>
                <td>{k.art === "firma" ? <Abzeichen art="info">Firma</Abzeichen> : <Abzeichen>Privat</Abzeichen>}</td>
                <td className="k-rechts">{k.anzahl_angebote}</td>
                <td className="whitespace-nowrap">{formatDatum(k.letzter) || <span className="k-leise">–</span>}</td>
              </tr>
            ))}
          </Tabelle>
        )}
        <Blaettern seite={liste.seite} seiten={liste.seiten} gesamt={liste.gesamt} pfad="/neu/kunden" parameter={{ q, art }} einheit={liste.gesamt === 1 ? "Kunde" : "Kunden"} />
      </Karte>
    </>
  );
}
