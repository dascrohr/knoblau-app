import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ladeKunde } from "@/lib/daten";
import { formatBetrag, formatDatum } from "@/lib/preis";
import { Anzeige, AnzeigeText, Gruppe } from "@/components/alt/anzeige";
import { Statusleiste, Symbolleiste } from "@/components/alt/leisten";

export const metadata: Metadata = { title: "Kunde (Altansicht)" };

export default async function KundeSeite({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const daten = await ladeKunde(id);
  if (!daten) notFound();
  const { kunde: k, angebote, rechnungen } = daten;
  return (
    <>
      <Symbolleiste sucheHref="/alt/kunden" loeschenHinweis="Heute nicht umgesetzt" />
      <div className="inhalt">
        <div className="kopfzeile">
          <span>Kundennr.: <b>{k.kundennr ?? k.id}</b></span>
          <span>Art: <b>{k.art === "firma" ? "Firma" : "Privat"}</b></span>
          <span>Name: <b>{[[k.name, k.vorname].filter(Boolean).join(", "), k.name1].filter(Boolean).join(" · ") || "–"}</b></span>
          <span>{k.aktiv ? "aktiv" : "inaktiv"}</span>
        </div>
        <div className="spalten s3">
          <Gruppe titel="Adresse">
            <Anzeige label="Anrede" wert={k.anrede} />
            <Anzeige label="Titel" wert={k.titel} />
            <Anzeige label="Vorname" wert={k.vorname} />
            <Anzeige label="Name" wert={k.name} />
            <Anzeige label="Name1" wert={k.name1} />
            <Anzeige label="Name2" wert={k.name2} />
            <Anzeige label="z. H." wert={k.zuhaenden} />
            <Anzeige label="Straße" wert={k.strasse} />
            <Anzeige label="LKZ" wert={k.lkz} kurz />
            <Anzeige label="PLZ" wert={k.plz} kurz />
            <Anzeige label="Ort" wert={k.ort} />
          </Gruppe>
          <Gruppe titel="Kontakt">
            <Anzeige label="Telefon" wert={k.telefon} />
            <Anzeige label="Telefon 2" wert={k.telefon2} />
            <Anzeige label="Mobil" wert={k.mobil} />
            <Anzeige label="Fax" wert={k.telefax} />
            <Anzeige label="E-Mail" wert={k.email} />
            <Anzeige label="Internet" wert={k.internet} />
            <Anzeige label="USt-IdNr." wert={k.ustid} />
            <Anzeige label="Zahlungsbedingung" wert={k.zahlungsbedingung} />
          </Gruppe>
          <Gruppe titel="Umsatz und Verlauf">
            <Anzeige label="Erster Vorgang" wert={formatDatum(k.erstmals)} kurz />
            <Anzeige label="Letzter Vorgang" wert={formatDatum(k.letzter)} kurz />
            <Anzeige label="Anzahl Angebote" wert={k.anzahl_angebote} zahl kurz />
            <Anzeige label="Umsatz" wert={formatBetrag(k.umsatz)} zahl kurz />
            <Anzeige label="Umsatz Vorjahr" wert={formatBetrag(k.umsatz_vj)} zahl kurz />
            <AnzeigeText label="Info" wert={k.info} zeilen={5} />
          </Gruppe>
        </div>
        <div className="spalten s2">
          <Gruppe titel={`Angebote (${angebote.length})`}>
            <div className="rollen" style={{ maxHeight: 320 }}>
              <table className="tab">
                <thead><tr><th>Angebotsnr.</th><th>Datum</th><th>Status</th><th className="r">Nettosumme</th></tr></thead>
                <tbody>
                  {angebote.length === 0 && <tr><td colSpan={4}>Keine Angebote.</td></tr>}
                  {angebote.map((a) => (
                    <tr key={a.id}>
                      <td><Link href={`/alt/angebote/${a.id}`}>{a.angebotnr ?? "(ohne Nr.)"}</Link></td>
                      <td>{formatDatum(a.angebotsdatum)}</td>
                      <td>{a.status}</td>
                      <td className="r">{formatBetrag(a.netto_summe)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Gruppe>
          <Gruppe titel={`Rechnungen (${rechnungen.length})`}>
            <div className="rollen" style={{ maxHeight: 320 }}>
              <table className="tab">
                <thead><tr><th>Rechnungsnr.</th><th>Datum</th><th className="r">Gesamtsumme</th></tr></thead>
                <tbody>
                  {rechnungen.length === 0 && <tr><td colSpan={3}>Keine Rechnungen.</td></tr>}
                  {rechnungen.map((r) => (
                    <tr key={r.id}>
                      <td><Link href={`/alt/rechnungen/${r.id}`}>{r.rechnungnr ?? "(ohne Nr.)"}</Link></td>
                      <td>{formatDatum(r.rechnungsdatum)}</td>
                      <td className="r">{formatBetrag(r.gesamtsumme)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Gruppe>
        </div>
      </div>
      <Statusleiste datei="Kunden" satz={`Kunde ${k.kundennr ?? k.id}`} sperre="Nur lesen" />
    </>
  );
}
