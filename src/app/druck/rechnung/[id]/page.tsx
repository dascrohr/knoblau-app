import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Blatt, DruckHinweis, Freitext, Titel } from "@/components/druck/blatt";
import { DruckLeiste } from "@/components/druck/drucken-knopf";
import { ladeFirma, ladeRechnung } from "@/lib/daten";
import { formatBetrag, formatDatum, formatZahl, runde2, zeilenSumme } from "@/lib/preis";

export const metadata: Metadata = { title: "Rechnung – Druckansicht" };

export default async function RechnungDruck({ params }: { params: Promise<{ id: string }> }) {
  const { id: roh } = await params;
  const id = Number(roh);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [daten, firma] = await Promise.all([ladeRechnung(id), ladeFirma()]);
  if (!daten) notFound();
  const { rechnung: r, positionen } = daten;
  const summePos = runde2(positionen.reduce((s, p) => s + (p.netto ?? zeilenSumme(p)), 0));
  const netto = r.netto ?? summePos;
  const steuer = r.gesamtsumme != null ? runde2(r.gesamtsumme - netto) : null;
  const erwartet = r.ust_satz != null ? runde2((netto * r.ust_satz) / 100) : null;
  const reineUst = steuer != null && erwartet != null && Math.abs(steuer - erwartet) < 0.02;
  const offen = r.gesamtsumme != null && r.aconto ? runde2(r.gesamtsumme - r.aconto) : null;

  return (
    <>
      <DruckLeiste zurueck={`/neu/rechnungen/${r.id}`} />
      <DruckHinweis firma={firma} />
      <Blatt
        firma={firma}
        empfaenger={r}
        info={[
          ["Rechnung Nr.", r.rechnungnr],
          ["Rechnungsdatum", formatDatum(r.rechnungsdatum)],
          ["Leistungsdatum", r.leistungsdatum && /^\d{4}-\d{2}-\d{2}/.test(r.leistungsdatum) ? formatDatum(r.leistungsdatum) : r.leistungsdatum],
          ["Angebot Nr.", r.angebotnr],
          ["Auftrag Nr.", r.auftragnr],
          ["Ihre USt-IdNr.", r.ustid],
          ["Fällig am", formatDatum(r.faellig)],
        ]}
      >
        <Titel>Rechnung</Titel>
        {r.betreff1 || r.betreff2 ? <p className="d-unter">{[r.betreff1, r.betreff2].filter(Boolean).join(" · ")}</p> : null}
        {firma.text_rechnung_einleitung.trim() ? <p className="d-einleitung">{firma.text_rechnung_einleitung.trim()}</p> : null}
        <Freitext text={r.betreff_text} />
        <table style={{ marginTop: "4mm" }}>
          <thead>
            <tr>
              <th style={{ width: "12mm" }} className="r">Anzahl</th>
              <th style={{ paddingLeft: "3mm" }}>Leistung</th>
              <th style={{ width: "18mm" }} className="r">Std/Stück</th>
              <th style={{ width: "24mm" }} className="r">Einzelpreis</th>
              <th style={{ width: "12mm" }} className="r">USt %</th>
              <th style={{ width: "26mm" }} className="r">Netto €</th>
            </tr>
          </thead>
          <tbody>
            {positionen.map((p) => {
              const betrag = p.netto ?? zeilenSumme(p);
              if (!p.einzelpreis && !betrag) {
                return p.text ? (
                  <tr key={p.id} className="d-hinweiszeile">
                    <td />
                    <td colSpan={5} style={{ paddingLeft: "3mm" }}>{p.text}</td>
                  </tr>
                ) : null;
              }
              const ep = p.einzelpreis != null ? runde2(p.einzelpreis * (1 + (p.prozent ?? 0) / 100)) : null;
              return (
                <tr key={p.id}>
                  <td className="r">{formatZahl(p.anzahl || 1)}</td>
                  <td style={{ paddingLeft: "3mm" }}>
                    {p.text}
                    {p.inhalt ? <div className="d-klein">{p.inhalt}</div> : null}
                  </td>
                  <td className="r">{formatZahl(p.einheiten)}</td>
                  <td className="r">{formatBetrag(ep)}</td>
                  <td className="r">{formatZahl(p.ust)}</td>
                  <td className="r">{formatBetrag(betrag)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <table className="d-summen">
          <tbody>
            <tr>
              <td>Nettosumme</td>
              <td className="r">{formatBetrag(netto)} €</td>
            </tr>
            {steuer != null ? (
              <tr>
                <td>{reineUst ? `zzgl. Umsatzsteuer ${formatZahl(r.ust_satz)} %` : "zzgl. Steuern und Zu-/Abschläge"}</td>
                <td className="r">{formatBetrag(steuer)} €</td>
              </tr>
            ) : null}
            <tr className="d-gesamt">
              <td>Rechnungsbetrag</td>
              <td className="r">{formatBetrag(r.gesamtsumme)} €</td>
            </tr>
            {r.aconto ? (
              <tr>
                <td>bereits gezahlt{r.aconto_datum ? ` am ${formatDatum(r.aconto_datum)}` : ""}</td>
                <td className="r">{formatBetrag(-r.aconto)} €</td>
              </tr>
            ) : null}
            {offen != null ? (
              <tr>
                <td><strong>noch offen</strong></td>
                <td className="r"><strong>{formatBetrag(offen)} €</strong></td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <Freitext titel="Zahlungsbedingungen" text={r.zahlungsbedingung} />
        <Freitext text={r.endetext} />
        {firma.text_rechnung_schluss.trim() ? (
          <div className="d-schluss">
            <Freitext text={firma.text_rechnung_schluss} />
          </div>
        ) : null}
      </Blatt>
    </>
  );
}
