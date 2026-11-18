import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Blatt, Freitext } from "@/components/druck/blatt";
import { DruckLeiste } from "@/components/druck/drucken-knopf";
import type { Adresse, Position } from "@/lib/angebot-typen";
import { ladeAngebot } from "@/lib/daten";
import { berechnePreis, formatBetrag, formatDatum, formatZahl, runde2, zeilenSumme, type Bereich } from "@/lib/preis";

export const metadata: Metadata = { title: "Angebot – Druckansicht" };

/** Gesperrt geschriebene Überschriften der Altsoftware ("A N G E B O T") normal lesbar machen. */
function ueberschrift(roh: string | null, ersatz: string): string {
  const t = (roh ?? "").trim();
  if (!t) return ersatz;
  const dicht = /^(\S )+\S$/.test(t) ? t.replace(/ /g, "") : t;
  return dicht.replace(/\//g, " / ");
}
function ort(a: Adresse): string {
  return [a.strasse, [a.plz, a.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
}
function stelle(etage: string | null, tragweg: number | null, aufzug: boolean, hvz: boolean): string {
  return [etage, tragweg ? `Tragweg ${formatZahl(tragweg)} m` : null, aufzug ? "Außenaufzug" : null, hvz ? "Halteverbotszone wird eingerichtet" : null].filter(Boolean).join(" · ");
}

function PositionsTabelle({ zeilen, summenText }: { zeilen: Position[]; summenText?: string }) {
  if (!zeilen.length) return null;
  const summe = runde2(zeilen.reduce((s, p) => s + zeilenSumme(p), 0));
  return (
    <table>
      <thead>
        <tr>
          <th style={{ width: "12mm" }} className="r">Anzahl</th>
          <th style={{ paddingLeft: "3mm" }}>Leistung</th>
          <th style={{ width: "18mm" }} className="r">Std/Stück</th>
          <th style={{ width: "24mm" }} className="r">Einzelpreis</th>
          <th style={{ width: "26mm" }} className="r">Gesamt €</th>
        </tr>
      </thead>
      <tbody>
        {zeilen.map((p) => {
          const gesamt = zeilenSumme(p);
          // Zu-/Abschlag ist im Einzelpreis enthalten, so wie die Preisübersicht rechnet.
          const ep = p.einzelpreis != null ? runde2(p.einzelpreis * (1 + (p.prozent ?? 0) / 100)) : null;
          if (!p.einzelpreis) {
            return (
              <tr key={`${p.bereich}-${p.zeile}`} className="d-hinweiszeile">
                <td />
                <td colSpan={4} style={{ paddingLeft: "3mm" }}>{p.text}</td>
              </tr>
            );
          }
          return (
            <tr key={`${p.bereich}-${p.zeile}`}>
              <td className="r">{formatZahl(p.anzahl ?? 1)}</td>
              <td style={{ paddingLeft: "3mm" }}>
                {p.text}
                {p.bereich === "packmaterial" && p.art ? <span className="d-klein"> ({p.art})</span> : null}
                {p.beschreibung ? <div className="d-klein">{p.beschreibung}</div> : null}
              </td>
              <td className="r">{formatZahl(p.einheiten)}</td>
              <td className="r">{formatBetrag(ep)}</td>
              <td className="r">{formatBetrag(gesamt)}</td>
            </tr>
          );
        })}
        {summenText ? (
          <tr className="d-zwischen">
            <td />
            <td colSpan={3} style={{ paddingLeft: "3mm" }}>{summenText}</td>
            <td className="r">{formatBetrag(summe)}</td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}

export default async function AngebotDruck({ params }: { params: Promise<{ id: string }> }) {
  const { id: roh } = await params;
  const id = Number(roh);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const daten = await ladeAngebot(id);
  if (!daten) notFound();
  const { angebot: a, adressen, positionen, termine } = daten;
  const preis = berechnePreis(a, positionen);
  const von = (b: Bereich) => positionen.filter((p) => p.bereich === b).sort((x, y) => x.zeile - y.zeile);
  const transport = [...von("beladen"), ...von("befoerdern"), ...von("entladen"), ...von("frei"), ...von("maut")];
  const neben = von("nebenleistung");
  const pack = von("packmaterial");
  const besonderes: [string, number][] = [];
  if (a.klavier && a.klavier_preis) besonderes.push([`Klavier (${formatZahl(a.klavier_anzahl || 1)} ×)`, (a.klavier_anzahl || 1) * a.klavier_preis]);
  if (a.fluegel && a.fluegel_preis) besonderes.push([`Flügel (${formatZahl(a.fluegel_anzahl || 1)} ×)`, (a.fluegel_anzahl || 1) * a.fluegel_preis]);
  if (a.schwergut && a.schwergut_preis && a.schwergut_kilo) besonderes.push([`Schwergutzuschlag (${formatZahl(a.schwergut_kilo)} kg)`, (a.schwergut_kilo / 100) * a.schwergut_preis]);
  if (preis.versicherung) besonderes.push(["Transportversicherung", preis.versicherung]);
  if (a.maut_in_angebot && a.maut_gesamt) besonderes.push([a.maut_text || "Mautkosten", a.maut_gesamt]);
  const bela = adressen.beladestelle;
  const entla = adressen.entladestelle;
  const termineBefuellt = termine.filter((t) => t.text || t.datum);

  return (
    <>
      <DruckLeiste zurueck={`/neu/angebote/${a.id}`} />
      <p className="d-entwurf">
        <strong>Druckvorlage im Entwurf.</strong> Gezeigt wird der zuletzt gespeicherte Stand. Aufbau, Texte und Fußzeile sind ein erster Vorschlag und mit dem Inhaber abzustimmen.
      </p>
      <Blatt
        empfaenger={adressen.auftraggeber}
        info={[
          ["Angebot Nr.", a.angebotnr],
          ["Datum", formatDatum(a.angebotsdatum)],
          ["Ihr Ansprechpartner", a.sachbearbeiter],
          ["Umzugstermin", a.umzugstermin],
          ["Besichtigung", formatDatum(a.besichtigung_datum)],
        ]}
      >
        <h1>{ueberschrift(a.ueberschrift1, "Angebot")}</h1>
        <p className="d-unter">Vielen Dank für Ihre Anfrage. Für Ihren Umzug bieten wir Ihnen folgende Leistungen an:</p>

        <div className="d-orte">
          <div>
            <h3>Beladestelle</h3>
            <p>{ort(bela) || ort(adressen.auftraggeber) || "–"}</p>
            <p className="d-klein">{stelle(a.b_etage, a.b_tragweg, a.b_aussenaufzug, a.b_hvz)}</p>
          </div>
          <div>
            <h3>Entladestelle</h3>
            <p>{ort(entla) || "–"}</p>
            <p className="d-klein">{stelle(a.e_etage, a.e_tragweg, a.e_aussenaufzug, a.e_hvz)}</p>
          </div>
        </div>
        {a.volumen ? <p className="d-klein">Umzugsvolumen: {formatZahl(a.volumen)} {a.volumen_einheit || "m³"}{a.volumen_ermittlung ? ` (${a.volumen_ermittlung})` : ""}{a.km ? ` · Entfernung ${formatZahl(a.km)} km` : ""}</p> : null}

        {transport.length ? <h2>{ueberschrift(a.ueberschrift4, "Beförderung")}</h2> : null}
        <PositionsTabelle zeilen={transport} />
        {neben.length ? <h2>{ueberschrift(a.ueberschrift2, "Nebenleistungen")}</h2> : null}
        <PositionsTabelle zeilen={neben} />
        {pack.length ? <h2>{ueberschrift(a.ueberschrift3, "Packmaterial")}</h2> : null}
        <PositionsTabelle zeilen={pack} />
        {besonderes.length ? (
          <>
            <h2>Besonderheiten und Versicherung</h2>
            <table>
              <tbody>
                {besonderes.map(([text, betrag]) => (
                  <tr key={text}>
                    <td style={{ paddingLeft: "15mm" }}>{text}</td>
                    <td className="r" style={{ width: "26mm" }}>{formatBetrag(runde2(betrag))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}

        <table className="d-summen">
          <tbody>
            <tr>
              <td>{a.text_netto || "Gesamtnettosumme"}</td>
              <td className="r">{formatBetrag(preis.netto)} €</td>
            </tr>
            {preis.rabatt ? (
              <tr>
                <td>{preis.rabatt > 0 ? "abzüglich Nachlass" : "zuzüglich Zuschlag"} ({formatZahl(Math.abs(a.generalrabatt ?? 0))} %)</td>
                <td className="r">{formatBetrag(-preis.rabatt)} €</td>
              </tr>
            ) : null}
            <tr>
              <td>zzgl. Umsatzsteuer {formatZahl(preis.ustSatz)} %</td>
              <td className="r">{formatBetrag(preis.ust)} €</td>
            </tr>
            {preis.vsst ? (
              <tr>
                <td>zzgl. Versicherungssteuer 16 %</td>
                <td className="r">{formatBetrag(preis.vsst)} €</td>
              </tr>
            ) : null}
            <tr className="d-gesamt">
              <td>{a.text_brutto || "Gesamtsumme"}</td>
              <td className="r">{formatBetrag(preis.gesamt)} €</td>
            </tr>
          </tbody>
        </table>

        {a.zahlungsbedingung ? <Freitext titel="Zahlungsbedingungen" text={a.zahlungsbedingung} /> : null}
        {termineBefuellt.length || a.termine_frei ? (
          <section className="d-text">
            <h3>Termine</h3>
            {termineBefuellt.map((t) => (
              <p key={t.zeile}>{[formatDatum(t.datum), [t.von, t.bis].filter(Boolean).join(" – "), t.text].filter(Boolean).join(" · ")}</p>
            ))}
            {a.termine_frei ? <p>{a.termine_frei.trim()}</p> : null}
          </section>
        ) : null}
        <Freitext titel="Vereinbarungen über Packleistungen" text={a.packarbeit} />
        <Freitext titel="Arbeiten der Handwerker" text={a.handwerker} />
        <Freitext titel="Leistungsbeschreibung" text={a.freie_leistung_text} />
        <div className="d-vertrag">
          <Freitext titel="Vereinbarungen (Vertragsbestandteil)" text={a.vereinbarungen} />
        </div>
        <div className="d-unterschrift">
          <div>Ort, Datum</div>
          <div>Unterschrift Auftraggeber (Auftragserteilung)</div>
        </div>
      </Blatt>
    </>
  );
}
