import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Datenliste } from "@/components/neu/datenliste";
import { KundenFormular } from "@/components/neu/kunden-formular";
import { Abzeichen, Karte, Knopf, Seitenkopf, Tabelle } from "@/components/neu/ui";
import { adressName } from "@/lib/angebot-typen";
import { ladeAuswahl, ladeKunde } from "@/lib/daten";
import { formatBetrag, formatDatum } from "@/lib/preis";

export const metadata: Metadata = { title: "Kunde" };

export default async function KundeSeite({ params }: { params: Promise<{ id: string }> }) {
  const { id: roh } = await params;
  const id = Number(roh);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [daten, zahlungsbedingungen] = await Promise.all([ladeKunde(id), ladeAuswahl("zahlungsbedingung")]);
  if (!daten) notFound();
  const { kunde: k, angebote, rechnungen } = daten;

  return (
    <>
      <Seitenkopf
        titel={adressName(k) || "Kunde ohne Namen"}
        unter={
          <span className="flex flex-wrap items-center gap-3">
            {k.art === "firma" ? <Abzeichen art="info">Firma</Abzeichen> : <Abzeichen>Privat</Abzeichen>}
            {k.kundennr ? <span>Kundennr. {k.kundennr}</span> : null}
            {!k.aktiv ? <Abzeichen art="warnung">inaktiv</Abzeichen> : null}
          </span>
        }
        aktionen={
          <Knopf href="/neu/kunden" art="still">
            ← Zur Kundenliste
          </Knopf>
        }
      />
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <Karte titel="Stammdaten" className="lg:col-span-2">
          <KundenFormular kunde={k} zahlungsbedingungen={zahlungsbedingungen} />
        </Karte>
        <div className="flex flex-col gap-4">
          <Karte titel="Schnellkontakt">
            <Datenliste
              eintraege={[
                ["Telefon", k.telefon ? <a className="k-link" href={`tel:${k.telefon.replace(/[^\d+]/g, "")}`}>{k.telefon}</a> : null],
                ["Telefon 2", k.telefon2 ? <a className="k-link" href={`tel:${k.telefon2.replace(/[^\d+]/g, "")}`}>{k.telefon2}</a> : null],
                ["Mobil", k.mobil ? <a className="k-link" href={`tel:${k.mobil.replace(/[^\d+]/g, "")}`}>{k.mobil}</a> : null],
                ["E-Mail", k.email ? <a className="k-link" href={`mailto:${k.email}`}>{k.email}</a> : null],
              ]}
            />
          </Karte>
          <Karte titel="Kundendaten">
            <Datenliste
              eintraege={[
                ["Kundennr.", k.kundennr != null ? String(k.kundennr) : null],
                ["Erster Kontakt", formatDatum(k.erstmals)],
                ["Letzter Kontakt", formatDatum(k.letzter)],
                ["Angebote", String(k.anzahl_angebote)],
                ["Umsatz", k.umsatz != null ? `${formatBetrag(k.umsatz)} €` : null],
                ["Umsatz Vorjahr", k.umsatz_vj != null ? `${formatBetrag(k.umsatz_vj)} €` : null],
              ]}
            />
          </Karte>
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Karte titel={`Angebote (${angebote.length})`} randlos>
          {angebote.length === 0 ? (
            <p className="k-leise k-karte-inhalt">Zu diesem Kunden gibt es keine Angebote.</p>
          ) : (
            <Tabelle beschriftung="Angebote des Kunden" spalten={["Nr.", "Datum", "Status", { titel: "Netto €", rechts: true }]}>
              {angebote.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link href={`/neu/angebote/${a.id}`} className="k-link">
                      {a.angebotnr || "ohne Nr."}
                    </Link>
                  </td>
                  <td>{formatDatum(a.angebotsdatum)}</td>
                  <td>{a.status ? <Abzeichen>{a.status}</Abzeichen> : <span className="k-leise">–</span>}</td>
                  <td className="k-rechts">{formatBetrag(a.netto_summe)}</td>
                </tr>
              ))}
            </Tabelle>
          )}
        </Karte>
        <Karte titel={`Rechnungen (${rechnungen.length})`} randlos>
          {rechnungen.length === 0 ? (
            <p className="k-leise k-karte-inhalt">Zu diesem Kunden gibt es keine Rechnungen.</p>
          ) : (
            <Tabelle beschriftung="Rechnungen des Kunden" spalten={["Rechnungsnr.", "Datum", { titel: "Gesamt €", rechts: true }]}>
              {rechnungen.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/neu/rechnungen/${r.id}`} className="k-link">
                      {r.rechnungnr || "ohne Nr."}
                    </Link>
                  </td>
                  <td>{formatDatum(r.rechnungsdatum)}</td>
                  <td className="k-rechts">{formatBetrag(r.gesamtsumme)}</td>
                </tr>
              ))}
            </Tabelle>
          )}
        </Karte>
      </div>
    </>
  );
}
