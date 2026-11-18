import type { Metadata } from "next";
import Link from "next/link";
import { angebotFilter, listeAngebote } from "@/lib/daten";
import { formatBetrag, formatDatum } from "@/lib/preis";
import { Blaettern } from "@/components/alt/anzeige";
import { eins, type SuchParameter } from "@/components/alt/hilfen";
import { KlickZeile, Statusleiste, Symbolleiste } from "@/components/alt/leisten";

export const metadata: Metadata = { title: "Angebote (Altansicht)" };

export default async function AngeboteListe({ searchParams }: { searchParams: SuchParameter }) {
  const sp = await searchParams;
  const q = eins(sp, "q");
  const jahr = Number(eins(sp, "jahr")) || null;
  const status = eins(sp, "status") || null;
  const seite = Math.max(1, Number(eins(sp, "seite")) || 1);
  const [filter, liste] = await Promise.all([angebotFilter(), listeAngebote({ q, jahr, status, seite })]);
  return (
    <>
      <Symbolleiste sucheHref="/alt/angebote" loeschenHinweis="Zum Löschen ein Angebot öffnen" />
      <div className="inhalt">
        <form className="suchzeile nicht-drucken" method="get" action="/alt/angebote">
          <label htmlFor="q">Suche (Name, Ort, Angebotsnr.)</label>
          <input id="q" name="q" type="search" defaultValue={q} autoFocus />
          <label htmlFor="jahr">Jahr</label>
          <select id="jahr" name="jahr" defaultValue={jahr ?? ""}>
            <option value="">alle</option>
            {filter.jahre.map((j) => <option key={j} value={j}>{j}</option>)}
          </select>
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={status ?? ""}>
            <option value="">alle</option>
            {filter.status.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="submit" className="knopf">Suchen</button>
          <Link className="knopf" href="/alt/angebote">Zurücksetzen</Link>
        </form>
        <div className="rollen" style={{ maxHeight: "none" }}>
          <table className="tab">
            <thead>
              <tr><th>Angebotsnr.</th><th>Datum</th><th>Name</th><th>von Ort</th><th>nach Ort</th><th>Status</th><th className="r">Nettosumme</th><th>Sachbearbeiter</th></tr>
            </thead>
            <tbody>
              {liste.zeilen.length === 0 && <tr><td colSpan={8}>Keine Angebote gefunden.</td></tr>}
              {liste.zeilen.map((a) => (
                <KlickZeile key={a.id} href={`/alt/angebote/${a.id}`}>
                  <td><Link prefetch={false} href={`/alt/angebote/${a.id}`}>{a.angebotnr ?? "(ohne Nr.)"}</Link></td>
                  <td>{formatDatum(a.angebotsdatum)}</td>
                  <td>{a.name}</td>
                  <td>{a.von_ort}</td>
                  <td>{a.nach_ort}</td>
                  <td>{a.status}</td>
                  <td className="r">{formatBetrag(a.netto_summe)}</td>
                  <td>{a.sachbearbeiter}</td>
                </KlickZeile>
              ))}
            </tbody>
          </table>
        </div>
        <Blaettern basis="/alt/angebote" parameter={{ q, jahr, status }} seite={liste.seite} seiten={liste.seiten} gesamt={liste.gesamt} />
      </div>
      <Statusleiste datei="Angebote" satz={`${liste.gesamt} Datensätze`} sperre="Nur lesen" />
    </>
  );
}
