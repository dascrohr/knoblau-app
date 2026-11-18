import type { Metadata } from "next";
import Link from "next/link";
import { listeKunden } from "@/lib/daten";
import { formatBetrag, formatDatum } from "@/lib/preis";
import { Blaettern } from "@/components/alt/anzeige";
import { eins, type SuchParameter } from "@/components/alt/hilfen";
import { KlickZeile, Statusleiste, Symbolleiste } from "@/components/alt/leisten";

export const metadata: Metadata = { title: "Kundenverwaltung (Altansicht)" };

export default async function KundenListe({ searchParams }: { searchParams: SuchParameter }) {
  const sp = await searchParams;
  const q = eins(sp, "q");
  const artRoh = eins(sp, "art");
  const art = artRoh === "firma" || artRoh === "privat" ? artRoh : null;
  const seite = Math.max(1, Number(eins(sp, "seite")) || 1);
  const liste = await listeKunden({ q, art, seite });
  return (
    <>
      <Symbolleiste sucheHref="/alt/kunden" loeschenHinweis="Heute nicht umgesetzt" />
      <div className="inhalt">
        <form className="suchzeile nicht-drucken" method="get" action="/alt/kunden">
          <label htmlFor="q">Kundensuche (Name, Ort)</label>
          <input id="q" name="q" type="search" defaultValue={q} autoFocus />
          <label htmlFor="art">Art</label>
          <select id="art" name="art" defaultValue={art ?? ""}>
            <option value="">alle</option>
            <option value="firma">Firma</option>
            <option value="privat">Privat</option>
          </select>
          <button type="submit" className="knopf">Suchen</button>
          <Link className="knopf" href="/alt/kunden">Zurücksetzen</Link>
        </form>
        <div className="rollen" style={{ maxHeight: "none" }}>
          <table className="tab">
            <thead>
              <tr><th>Kundennr.</th><th>Art</th><th>Name</th><th>Name1</th><th>Straße</th><th>PLZ</th><th>Ort</th><th>Telefon</th><th className="r">Angebote</th><th>Letzter Vorgang</th><th className="r">Umsatz</th></tr>
            </thead>
            <tbody>
              {liste.zeilen.length === 0 && <tr><td colSpan={11}>Keine Kunden gefunden.</td></tr>}
              {liste.zeilen.map((k) => (
                <KlickZeile key={k.id} href={`/alt/kunden/${k.id}`}>
                  <td><Link prefetch={false} href={`/alt/kunden/${k.id}`}>{k.kundennr ?? k.id}</Link></td>
                  <td>{k.art === "firma" ? "Firma" : "Privat"}</td>
                  <td>{[k.name, k.vorname].filter(Boolean).join(", ")}</td>
                  <td>{k.name1}</td>
                  <td>{k.strasse}</td>
                  <td>{k.plz}</td>
                  <td>{k.ort}</td>
                  <td>{k.telefon ?? k.mobil}</td>
                  <td className="r">{k.anzahl_angebote}</td>
                  <td>{formatDatum(k.letzter)}</td>
                  <td className="r">{formatBetrag(k.umsatz)}</td>
                </KlickZeile>
              ))}
            </tbody>
          </table>
        </div>
        <Blaettern basis="/alt/kunden" parameter={{ q, art }} seite={liste.seite} seiten={liste.seiten} gesamt={liste.gesamt} />
      </div>
      <Statusleiste datei="Kunden" satz={`${liste.gesamt} Datensätze`} sperre="Nur lesen" />
    </>
  );
}
