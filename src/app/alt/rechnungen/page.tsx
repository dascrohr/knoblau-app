import type { Metadata } from "next";
import Link from "next/link";
import { angebotFilter, listeRechnungen } from "@/lib/daten";
import { formatBetrag, formatDatum } from "@/lib/preis";
import { Blaettern } from "@/components/alt/anzeige";
import { eins, type SuchParameter } from "@/components/alt/hilfen";
import { KlickZeile, Statusleiste, Symbolleiste } from "@/components/alt/leisten";

export const metadata: Metadata = { title: "Rechnungen (Altansicht)" };

export default async function RechnungenListe({ searchParams }: { searchParams: SuchParameter }) {
  const sp = await searchParams;
  const q = eins(sp, "q");
  const jahr = Number(eins(sp, "jahr")) || null;
  const seite = Math.max(1, Number(eins(sp, "seite")) || 1);
  const [filter, liste] = await Promise.all([angebotFilter(), listeRechnungen({ q, jahr, seite })]);
  return (
    <>
      <Symbolleiste sucheHref="/alt/rechnungen" loeschenHinweis="Rechnungen sind nur lesbar" />
      <div className="inhalt">
        <form className="suchzeile nicht-drucken" method="get" action="/alt/rechnungen">
          <label htmlFor="q">Suche (Name, Ort, Rechnungsnr.)</label>
          <input id="q" name="q" type="search" defaultValue={q} autoFocus />
          <label htmlFor="jahr">Jahr</label>
          <select id="jahr" name="jahr" defaultValue={jahr ?? ""}>
            <option value="">alle</option>
            {filter.jahre.map((j) => <option key={j} value={j}>{j}</option>)}
          </select>
          <button type="submit" className="knopf">Suchen</button>
          <Link className="knopf" href="/alt/rechnungen">Zurücksetzen</Link>
        </form>
        <div className="rollen" style={{ maxHeight: "none" }}>
          <table className="tab">
            <thead>
              <tr><th>Rechnungsnr.</th><th>Datum</th><th>Name</th><th>PLZ</th><th>Ort</th><th>Betreff</th><th>Angebotsnr.</th><th className="r">Netto</th><th className="r">Gesamtsumme</th><th>Gebucht</th></tr>
            </thead>
            <tbody>
              {liste.zeilen.length === 0 && <tr><td colSpan={10}>Keine Rechnungen gefunden.</td></tr>}
              {liste.zeilen.map((r) => (
                <KlickZeile key={r.id} href={`/alt/rechnungen/${r.id}`}>
                  <td><Link prefetch={false} href={`/alt/rechnungen/${r.id}`}>{r.rechnungnr ?? "(ohne Nr.)"}</Link></td>
                  <td>{formatDatum(r.rechnungsdatum)}</td>
                  <td>{[[r.name, r.vorname].filter(Boolean).join(", "), r.name1].filter(Boolean).join(" · ")}</td>
                  <td>{r.plz}</td>
                  <td>{r.ort}</td>
                  <td>{r.betreff1}</td>
                  <td>{r.angebotnr}</td>
                  <td className="r">{formatBetrag(r.netto)}</td>
                  <td className="r">{formatBetrag(r.gesamtsumme)}</td>
                  <td>{r.gebucht ? "✓" : ""}</td>
                </KlickZeile>
              ))}
            </tbody>
          </table>
        </div>
        <Blaettern basis="/alt/rechnungen" parameter={{ q, jahr }} seite={liste.seite} seiten={liste.seiten} gesamt={liste.gesamt} />
      </div>
      <Statusleiste datei="Rechnungen" satz={`${liste.gesamt} Datensätze`} sperre="Nur lesen" />
    </>
  );
}
