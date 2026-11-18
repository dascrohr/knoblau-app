import { Blatt, DruckHinweis, Freitext, Titel } from "@/components/druck/blatt";
import { DruckLeiste } from "@/components/druck/drucken-knopf";
import type { Adresse, AngebotKomplett, Position } from "@/lib/angebot-typen";
import type { Firma } from "@/lib/firma";
import { berechnePreis, formatBetrag, formatDatum, formatZahl, runde2, zeilenSumme, type Bereich } from "@/lib/preis";

export type AngebotDruckArt = "angebot" | "auftrag";

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
/** Heutiges Datum in deutscher Zeit, unabhängig von der Zeitzone des Servers. */
function heute(): string {
  return new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());
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

/** Gemeinsame Druckansicht für Angebot und Auftragsbestätigung (Leiste, Bildschirmhinweis, Blatt). */
export function AngebotDruckAnsicht({ daten, firma, art }: { daten: AngebotKomplett; firma: Firma; art: AngebotDruckArt }) {
  const { angebot: a, adressen, positionen, termine } = daten;
  const auftrag = art === "auftrag";
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
  const terminZeilen = termineBefuellt.map((t) => (
    <p key={t.zeile}>{[formatDatum(t.datum), [t.von, t.bis].filter(Boolean).join(" – "), t.text].filter(Boolean).join(" · ")}</p>
  ));
  const hatTermine = termineBefuellt.length > 0 || Boolean(a.termine_frei?.trim());
  const einleitung = (auftrag ? firma.text_auftrag_einleitung : firma.text_angebot_einleitung).trim();
  const schluss = auftrag ? firma.text_auftrag_schluss : firma.text_angebot_schluss;
  const firmenOrt = firma.plz_ort.replace(/^\s*\d{4,5}\s+/, "").trim() || "Köln";

  return (
    <>
      <DruckLeiste
        zurueck={`/neu/angebote/${a.id}`}
        ansichten={[
          { titel: "Angebot", href: `/druck/angebot/${a.id}`, aktiv: !auftrag },
          { titel: "Auftragsbestätigung", href: `/druck/auftrag/${a.id}`, aktiv: auftrag },
        ]}
      />
      <DruckHinweis firma={firma} />
      <Blatt
        firma={firma}
        empfaenger={adressen.auftraggeber}
        info={
          auftrag
            ? [
                ["Auftrag Nr.", a.auftragnr],
                ["Auftragsdatum", formatDatum(a.auftragsdatum)],
                ["Angebot Nr.", a.angebotnr],
                ["Angebotsdatum", formatDatum(a.angebotsdatum)],
                ["Ihr Ansprechpartner", a.sachbearbeiter],
                ["Umzugstermin", formatDatum(a.umzugstermin)],
              ]
            : [
                ["Angebot Nr.", a.angebotnr],
                ["Datum", formatDatum(a.angebotsdatum)],
                ["Ihr Ansprechpartner", a.sachbearbeiter],
                ["Umzugstermin", a.umzugstermin],
                ["Besichtigung", formatDatum(a.besichtigung_datum)],
              ]
        }
      >
        <Titel entwurf={a.entwurf === true}>{auftrag ? "Auftragsbestätigung" : ueberschrift(a.ueberschrift1, "Angebot")}</Titel>
        {einleitung ? <p className="d-unter">{einleitung}</p> : null}

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

        {auftrag && (a.umzugstermin || hatTermine) ? (
          <section className="d-termine">
            <h3>Ihre Termine</h3>
            {a.umzugstermin ? (
              <p className="d-termin-haupt">
                <span>Umzugstermin</span> {formatDatum(a.umzugstermin)}
              </p>
            ) : null}
            {terminZeilen}
            {a.termine_frei?.trim() ? <p>{a.termine_frei.trim()}</p> : null}
          </section>
        ) : null}

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
        {!auftrag && hatTermine ? (
          <section className="d-text">
            <h3>Termine</h3>
            {terminZeilen}
            {a.termine_frei?.trim() ? <p>{a.termine_frei.trim()}</p> : null}
          </section>
        ) : null}
        <Freitext titel="Vereinbarungen über Packleistungen" text={a.packarbeit} lang />
        <Freitext titel="Arbeiten der Handwerker" text={a.handwerker} lang />
        <Freitext titel="Leistungsbeschreibung" text={a.freie_leistung_text} lang />
        <div className="d-vertrag">
          <Freitext titel="Vereinbarungen (Vertragsbestandteil)" text={a.vereinbarungen} lang />
        </div>
        {schluss.trim() ? (
          <div className="d-schluss">
            <Freitext text={schluss} />
          </div>
        ) : null}
        {auftrag ? (
          <div className="d-unterschrift">
            <div>
              <p className="d-u-vor">{firmenOrt}, den {heute()}</p>
              <div className="d-u-linie">{firma.name}</div>
            </div>
            <div>
              <p className="d-u-vor">&nbsp;</p>
              <div className="d-u-linie">Auftraggeber</div>
            </div>
          </div>
        ) : (
          <div className="d-unterschrift">
            <div>
              <div className="d-u-linie">Ort, Datum</div>
            </div>
            <div>
              <div className="d-u-linie">Unterschrift Auftraggeber (Auftragserteilung)</div>
            </div>
          </div>
        )}
      </Blatt>
    </>
  );
}
