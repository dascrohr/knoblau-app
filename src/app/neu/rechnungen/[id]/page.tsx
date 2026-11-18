import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Anschrift, Datenliste } from "@/components/neu/datenliste";
import { Abzeichen, Hinweis, Karte, Knopf, Seitenkopf, Tabelle } from "@/components/neu/ui";
import { ladeRechnung } from "@/lib/daten";
import { formatBetrag, formatDatum, formatZahl, zeilenSumme } from "@/lib/preis";

export const metadata: Metadata = { title: "Rechnung" };

export default async function RechnungSeite({ params }: { params: Promise<{ id: string }> }) {
  const { id: roh } = await params;
  const id = Number(roh);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const daten = await ladeRechnung(id);
  if (!daten) notFound();
  const { rechnung: r, positionen } = daten;

  const summePositionen = positionen.reduce((s, p) => s + (p.netto ?? zeilenSumme(p)), 0);
  const steuer = r.netto != null && r.gesamtsumme != null ? Math.round((r.gesamtsumme - r.netto) * 100) / 100 : null;
  const erwarteteUst = r.netto != null && r.ust_satz != null ? Math.round(r.netto * r.ust_satz) / 100 : null;
  const istReineUst = steuer != null && erwarteteUst != null && Math.abs(steuer - erwarteteUst) < 0.02;
  const offen = r.gesamtsumme != null && r.aconto ? Math.round((r.gesamtsumme - r.aconto) * 100) / 100 : null;

  return (
    <>
      <Seitenkopf
        titel={<>Rechnung {r.rechnungnr || <span className="k-leise">ohne Nummer</span>}</>}
        unter={
          <span className="flex flex-wrap items-center gap-3">
            {r.rechnungsdatum ? <span>vom {formatDatum(r.rechnungsdatum)}</span> : null}
            {r.gebucht ? <Abzeichen art="erfolg">gebucht</Abzeichen> : <Abzeichen>nicht gebucht</Abzeichen>}
          </span>
        }
        aktionen={
          <>
            {r.angebot_id ? <Knopf href={`/neu/angebote/${r.angebot_id}`}>Zum Angebot {r.angebotnr ?? ""}</Knopf> : null}
            <Knopf href="/neu/rechnungen" art="still">
              ← Zur Rechnungsliste
            </Knopf>
          </>
        }
      />
      <Hinweis className="mb-4" titel="Rechnungen werden heute nur angezeigt">
        Diese Rechnung stammt aus dem Altbestand und kann hier nicht geändert werden.
      </Hinweis>
      <div className="grid gap-4 lg:grid-cols-3">
        <Karte titel="Rechnungsadresse">
          <Anschrift a={r} />
          {r.kunde_id ? (
            <p className="mt-3">
              <Link href={`/neu/kunden/${r.kunde_id}`} className="k-link">
                Zum Kunden
              </Link>
            </p>
          ) : null}
        </Karte>
        <Karte titel="Rechnungsdaten">
          <Datenliste
            eintraege={[
              ["Rechnungsdatum", formatDatum(r.rechnungsdatum)],
              ["Leistungsdatum", formatDatum(r.leistungsdatum)],
              ["Fällig am", formatDatum(r.faellig)],
              ["Angebotsnr.", r.angebotnr],
              ["Auftragsnr.", r.auftragnr],
              ["Kundennr.", r.kundennr != null ? String(r.kundennr) : null],
              ["Sachbearbeiter", r.sachbearbeiter],
              ["Zahlungsbedingung", r.zahlungsbedingung],
              ["USt-IdNr.", r.ustid],
            ]}
          />
        </Karte>
        <Karte titel="Summen">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <caption className="sr-only">Summen der Rechnung</caption>
            <tbody>
              <tr>
                <th scope="row" className="py-1 text-left font-normal">Netto</th>
                <td className="k-zahl">{formatBetrag(r.netto)} €</td>
              </tr>
              {r.generalrabatt ? (
                <tr className="k-leise">
                  <th scope="row" className="py-1 text-left font-normal">Generalrabatt</th>
                  <td className="k-zahl">{formatZahl(r.generalrabatt)} %</td>
                </tr>
              ) : null}
              {steuer != null ? (
                <tr>
                  <th scope="row" className="py-1 text-left font-normal">{istReineUst ? `USt ${formatZahl(r.ust_satz)} %` : "Steuern (Differenz zu Netto)"}</th>
                  <td className="k-zahl">{formatBetrag(steuer)} €</td>
                </tr>
              ) : null}
              <tr style={{ borderTop: "2px solid var(--k-schwarz)", fontSize: "var(--k-text-l)", fontWeight: 700 }}>
                <th scope="row" className="py-1.5 text-left">Gesamtsumme</th>
                <td className="k-zahl">{formatBetrag(r.gesamtsumme)} €</td>
              </tr>
              {r.aconto ? (
                <>
                  <tr>
                    <th scope="row" className="py-1 text-left font-normal">Anzahlung{r.aconto_datum ? ` vom ${formatDatum(r.aconto_datum)}` : ""}</th>
                    <td className="k-zahl">− {formatBetrag(r.aconto)} €</td>
                  </tr>
                  <tr style={{ fontWeight: 700 }}>
                    <th scope="row" className="py-1 text-left">Restbetrag</th>
                    <td className="k-zahl">{formatBetrag(offen)} €</td>
                  </tr>
                </>
              ) : null}
            </tbody>
          </table>
        </Karte>
      </div>
      {r.betreff1 || r.betreff2 || r.betreff_text ? (
        <Karte titel="Betreff" className="mt-4">
          {r.betreff1 ? <p className="font-semibold">{r.betreff1}</p> : null}
          {r.betreff2 ? <p>{r.betreff2}</p> : null}
          {r.betreff_text ? <p className="mt-2 whitespace-pre-wrap">{r.betreff_text}</p> : null}
        </Karte>
      ) : null}
      <Karte titel={`Positionen (${positionen.length})`} randlos className="mt-4">
        {positionen.length === 0 ? (
          <p className="k-leise k-karte-inhalt">Diese Rechnung hat keine Positionen.</p>
        ) : (
          <Tabelle
            beschriftung="Rechnungspositionen"
            spalten={[{ titel: "Nr.", breite: "3rem" }, { titel: "Anzahl", rechts: true }, "Text", { titel: "Std/Stck", rechts: true }, { titel: "Einzelpreis €", rechts: true }, { titel: "+/- %", rechts: true }, { titel: "USt %", rechts: true }, { titel: "Netto €", rechts: true }]}
            fuss={
              <tr>
                <td colSpan={7} className="k-rechts">
                  Summe der Positionen
                </td>
                <td className="k-rechts">{formatBetrag(summePositionen)}</td>
              </tr>
            }
          >
            {positionen.map((p, i) => (
              <tr key={p.id}>
                <td className="k-leise">{p.zeile ?? i + 1}</td>
                <td className="k-rechts">{formatZahl(p.anzahl)}</td>
                <td>
                  <span className="whitespace-pre-wrap">{p.text}</span>
                  {p.inhalt && p.inhalt !== p.text ? <span className="k-leise block whitespace-pre-wrap text-xs">{p.inhalt}</span> : null}
                </td>
                <td className="k-rechts">{formatZahl(p.einheiten)}</td>
                <td className="k-rechts">{formatBetrag(p.einzelpreis)}</td>
                <td className="k-rechts">{formatZahl(p.prozent)}</td>
                <td className="k-rechts">{formatZahl(p.ust)}</td>
                <td className="k-rechts">{formatBetrag(p.netto ?? (zeilenSumme(p) || null))}</td>
              </tr>
            ))}
          </Tabelle>
        )}
      </Karte>
      {r.endetext ? (
        <Karte titel="Schlusstext" className="mt-4">
          <p className="whitespace-pre-wrap">{r.endetext}</p>
        </Karte>
      ) : null}
    </>
  );
}
