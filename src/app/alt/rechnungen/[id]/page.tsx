import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ladeRechnung } from "@/lib/daten";
import { formatBetrag, formatDatum, formatZahl } from "@/lib/preis";
import { Anzeige, AnzeigeText, Gruppe } from "@/components/alt/anzeige";
import { Statusleiste, Symbolleiste } from "@/components/alt/leisten";

export const metadata: Metadata = { title: "Rechnung (Altansicht)" };

export default async function RechnungSeite({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const daten = await ladeRechnung(id);
  if (!daten) notFound();
  const { rechnung: r, positionen } = daten;
  const summePositionen = positionen.reduce((s, p) => s + (p.netto ?? 0), 0);
  return (
    <>
      <Symbolleiste sucheHref="/alt/rechnungen" loeschenHinweis="Rechnungen sind nur lesbar" />
      <div className="inhalt">
        <div className="kopfzeile">
          <span>Rechnungsnr.: <b>{r.rechnungnr ?? "(ohne)"}</b></span>
          <span>Datum: <b>{formatDatum(r.rechnungsdatum) || "–"}</b></span>
          <span>Angebot: {r.angebot_id != null ? <Link href={`/alt/angebote/${r.angebot_id}`}>{r.angebotnr ?? r.angebot_id}</Link> : <b>{r.angebotnr ?? "–"}</b>}</span>
          {r.kunde_id != null && <span><Link href={`/alt/kunden/${r.kunde_id}`}>Kundenstamm</Link></span>}
          <span>{r.gebucht ? "gebucht" : "nicht gebucht"}</span>
        </div>
        <div className="spalten s3">
          <Gruppe titel="Rechnungsadresse">
            <Anzeige label="Anrede" wert={r.anrede} />
            <Anzeige label="Titel" wert={r.titel} />
            <Anzeige label="Vorname" wert={r.vorname} />
            <Anzeige label="Name" wert={r.name} />
            <Anzeige label="Name1" wert={r.name1} />
            <Anzeige label="Name2" wert={r.name2} />
            <Anzeige label="z. H." wert={r.zuhaenden} />
            <Anzeige label="Straße" wert={r.strasse} />
            <Anzeige label="LKZ" wert={r.lkz} kurz />
            <Anzeige label="PLZ" wert={r.plz} kurz />
            <Anzeige label="Ort" wert={r.ort} />
            <Anzeige label="E-Mail" wert={r.email} />
          </Gruppe>
          <Gruppe titel="Kopf">
            <Anzeige label="Rechnungsdatum" wert={formatDatum(r.rechnungsdatum)} kurz />
            <Anzeige label="Leistungsdatum" wert={formatDatum(r.leistungsdatum)} kurz />
            <Anzeige label="Fällig" wert={formatDatum(r.faellig)} kurz />
            <Anzeige label="Auftragsnr." wert={r.auftragnr} />
            <Anzeige label="Kundennr." wert={r.kundennr} kurz />
            <Anzeige label="Sachbearbeiter" wert={r.sachbearbeiter} />
            <Anzeige label="Akquisiteur" wert={r.akquisiteur} />
            <Anzeige label="Herkunft" wert={r.herkunft} />
            <Anzeige label="USt-IdNr." wert={r.ustid} />
            <Anzeige label="Zahlungsbedingung" wert={r.zahlungsbedingung} />
          </Gruppe>
          <Gruppe titel="Betreff">
            <Anzeige label="Betreff 1" wert={r.betreff1} />
            <Anzeige label="Betreff 2" wert={r.betreff2} />
            <AnzeigeText label="Betrefftext" wert={r.betreff_text} zeilen={8} />
          </Gruppe>
        </div>
        <Gruppe titel="Positionen">
          <table className="tab">
            <thead>
              <tr><th className="r">Nr</th><th className="r">Anzahl</th><th>Text</th><th className="r">Std/Stck</th><th className="r">EP</th><th className="r">%</th><th className="r">USt</th><th className="r">Netto</th></tr>
            </thead>
            <tbody>
              {positionen.length === 0 && <tr><td colSpan={8}>Keine Positionen.</td></tr>}
              {positionen.map((p) => (
                <tr key={p.id}>
                  <td className="r">{p.zeile}</td>
                  <td className="r">{formatZahl(p.anzahl)}</td>
                  <td style={{ whiteSpace: "pre-wrap" }}>{p.text}{p.inhalt ? `\n${p.inhalt}` : ""}</td>
                  <td className="r">{formatZahl(p.einheiten)}</td>
                  <td className="r">{formatBetrag(p.einzelpreis)}</td>
                  <td className="r">{formatZahl(p.prozent)}</td>
                  <td className="r">{formatZahl(p.ust)}</td>
                  <td className="r">{formatBetrag(p.netto)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={7} className="r">Summe der Positionen</td><td className="r">{formatBetrag(summePositionen)}</td></tr></tfoot>
          </table>
        </Gruppe>
        <div className="spalten s2">
          <Gruppe titel="Schlusstext">
            <AnzeigeText label="Endetext" wert={r.endetext} zeilen={6} />
          </Gruppe>
          <Gruppe titel="Summen">
            <div style={{ ["--lb" as string]: "160px" }}>
              <Anzeige label="Generalrabatt %" wert={formatZahl(r.generalrabatt)} zahl kurz />
              <Anzeige label="Netto" wert={formatBetrag(r.netto)} zahl kurz />
              <Anzeige label="USt %" wert={formatZahl(r.ust_satz)} zahl kurz />
              <Anzeige label={`Gesamtsumme${r.waehrung ? ` (${r.waehrung})` : ""}`} wert={formatBetrag(r.gesamtsumme)} zahl kurz />
              <Anzeige label="A-conto" wert={formatBetrag(r.aconto)} zahl kurz />
              <Anzeige label="A-conto-Datum" wert={formatDatum(r.aconto_datum)} kurz />
            </div>
          </Gruppe>
        </div>
      </div>
      <Statusleiste datei="Rechnungen" satz={`Rechnung ${r.rechnungnr ?? r.id}`} sperre="Nur lesen" />
    </>
  );
}
