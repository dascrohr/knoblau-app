import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Anschrift, Datenliste } from "@/components/neu/datenliste";
import { Abzeichen, Karte, Knopf, Seitenkopf, Tabelle } from "@/components/neu/ui";
import { adressName } from "@/lib/angebot-typen";
import { ladeKunde } from "@/lib/daten";
import { formatBetrag, formatDatum } from "@/lib/preis";

export const metadata: Metadata = { title: "Kunde" };

export default async function KundeSeite({ params }: { params: Promise<{ id: string }> }) {
  const { id: roh } = await params;
  const id = Number(roh);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const daten = await ladeKunde(id);
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
      <div className="grid gap-4 lg:grid-cols-3">
        <Karte titel="Anschrift">
          <Anschrift a={k} />
        </Karte>
        <Karte titel="Kontakt">
          <Datenliste
            eintraege={[
              ["Telefon", k.telefon ? <a className="k-link" href={`tel:${k.telefon.replace(/[^\d+]/g, "")}`}>{k.telefon}</a> : null],
              ["Telefon 2", k.telefon2],
              ["Mobil", k.mobil ? <a className="k-link" href={`tel:${k.mobil.replace(/[^\d+]/g, "")}`}>{k.mobil}</a> : null],
              ["Fax", k.telefax],
              ["E-Mail", k.email ? <a className="k-link" href={`mailto:${k.email}`}>{k.email}</a> : null],
              ["Internet", k.internet],
            ]}
          />
        </Karte>
        <Karte titel="Kundendaten">
          <Datenliste
            eintraege={[
              ["Erster Kontakt", formatDatum(k.erstmals)],
              ["Letzter Kontakt", formatDatum(k.letzter)],
              ["Angebote", String(k.anzahl_angebote)],
              ["Umsatz", k.umsatz != null ? `${formatBetrag(k.umsatz)} €` : null],
              ["Umsatz Vorjahr", k.umsatz_vj != null ? `${formatBetrag(k.umsatz_vj)} €` : null],
              ["USt-IdNr.", k.ustid],
              ["Zahlungsbedingung", k.zahlungsbedingung],
            ]}
          />
        </Karte>
      </div>
      {k.info ? (
        <Karte titel="Notizen" className="mt-4">
          <p className="whitespace-pre-wrap">{k.info}</p>
        </Karte>
      ) : null}
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
