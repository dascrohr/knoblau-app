"use client";
// Geschäftsleitungsübersicht: Kennzahlen, Monatsverlauf, Saison- und Regionen-Heatmap, Gebietsrangliste.
// Bekommt vom Server ausschließlich Summen und Zählungen.
import Link from "next/link";
import { useMemo, useState } from "react";
import { Hinweis, Karte, Seitenkopf } from "@/components/neu/ui";
import type { Dashboard, Quote, RegionZeile, SaisonZelle, Vergleich } from "@/lib/dashboard/rechnen";
import { MONATE_KURZ, MONATE_LANG, QUOTE_ERKLAERUNG, QUOTE_NAME, datum, euro, euroKurz, prozent, punkte, quoteText, veraenderung, zahl } from "./format";
import { Heatmap, type HeatZeile, type HeatZelle } from "./heatmap";
import { Monatsverlauf } from "./verlauf";

type Auswahl = { zeitraum: "2" | "5" | "10" | "frei"; von: string; bis: string; perspektive: "beladestelle" | "entladestelle" };
type Props = { daten: Dashboard; auswahl: Auswahl; geladenUm: string; fruehestes: string };

function adresse(a: Auswahl, aenderung: Partial<{ z: string; adresse: string }>): string {
  const p = new URLSearchParams();
  const z = aenderung.z ?? a.zeitraum;
  p.set("z", z);
  if (z === "frei") { p.set("von", a.von); p.set("bis", a.bis); }
  const adr = aenderung.adresse ?? (a.perspektive === "entladestelle" ? "entla" : "bela");
  if (adr === "entla") p.set("adresse", "entla");
  return `/neu/geschaeftsleitung?${p}`;
}

function Kennzahl({ titel, wert, zusatz, vergleich, hilfe }: { titel: string; wert: string; zusatz?: React.ReactNode; vergleich: React.ReactNode; hilfe?: React.ReactNode }) {
  return (
    <section className="gl-kennzahl">
      <h2>{titel}</h2>
      <p className="gl-wert">{wert}</p>
      {zusatz ? <div className="gl-zusatz">{zusatz}</div> : null}
      <p className="gl-vergleich">{vergleich}</p>
      {hilfe ? <p className="gl-hilfe">{hilfe}</p> : null}
    </section>
  );
}

const richtung = (v: Vergleich | number | null) => {
  const x = v == null ? 0 : typeof v === "number" ? v : v.absolut;
  return x > 0 ? "▲" : x < 0 ? "▼" : "■";
};

function quoteZelle(q: Quote, angebote: number, zeitraum: string, kleineFallzahl: number, extra: Partial<HeatZelle> = {}): HeatZelle {
  const ausschluss = q.entwuerfe + q.ohneNummer + q.mehrdeutig;
  const detail = [
    q.nenner > 0 ? `${QUOTE_NAME}: ${quoteText(q)}` : `${QUOTE_NAME}: nicht berechenbar`,
    `Zähler ${zahl(q.zaehler)}, Nenner ${zahl(q.nenner)}`,
    zeitraum,
    `${zahl(angebote)} Angebote, davon ${zahl(q.zuJung)} noch zu jung, ${zahl(ausschluss)} ohne verlässliche Zuordnung oder Entwurf`,
  ];
  if (q.nenner === 0) return { status: angebote === 0 ? "fehlt" : q.zuJung > 0 ? "unreif" : "fehlt", wert: null, anzeige: "", detail, ...extra };
  return { status: q.nenner < kleineFallzahl ? "klein" : "wert", wert: q.wert, anzeige: `${Math.round((q.wert as number) * 100)}`, detail, ...extra };
}

export function DashboardAnsicht({ daten: d, auswahl, geladenUm, fruehestes }: Props) {
  const z = d.zeitraum;
  const w = d.waehrung;
  const zeitraumText = `${datum(z.von)} bis ${datum(z.effBis)}`;
  const vjText = `${datum(z.vjVon)} bis ${datum(z.vjBis)}`;
  const mehrereJahre = z.jahre.length > 1;
  const jahreText = mehrereJahre ? `${z.jahre[0]}–${z.jahre[z.jahre.length - 1]}` : `${z.jahre[0]}`;

  const [saisonKennzahl, setSaisonKennzahl] = useState<"rechnungen" | "betrag" | "mittel" | "quote">("betrag");
  const [regionKennzahl, setRegionKennzahl] = useState<"angebote" | "quote" | "betrag">("angebote");
  const [alleGebiete, setAlleGebiete] = useState(false);
  const [sortierung, setSortierung] = useState<{ spalte: "gebiet" | "angebote" | "quote" | "betrag" | "dAngebote" | "dBetrag"; ab: boolean }>({ spalte: "angebote", ab: true });

  // ---------------------------------------------------------------- Saison: Jahr × Monat
  const saison = useMemo(() => {
    const nachRechnung = saisonKennzahl !== "quote";
    const wertVon = (c: SaisonZelle): number | null =>
      saisonKennzahl === "rechnungen" ? c.statistik.rechnungen : saisonKennzahl === "betrag" ? c.statistik.summe : saisonKennzahl === "mittel" ? c.statistik.mittel : c.quote.wert;
    const zeilen: HeatZeile[] = z.jahre.map((jahr) => ({
      schluessel: String(jahr),
      titel: String(jahr),
      zellen: d.saison.filter((c) => c.jahr === jahr).map((c): HeatZelle => {
        const monat = `${MONATE_LANG[c.monat - 1]} ${c.jahr}`;
        const teilweise = c.lage === "teilweise";
        if (c.lage === "ausserhalb") return { status: "ausserhalb", wert: null, anzeige: "", detail: [monat] };
        if (saisonKennzahl === "quote") return quoteZelle(c.quote, c.angebote, `Angebotsmonat ${monat}`, z.kleineFallzahl, { teilweise });
        const s = c.statistik;
        const fallzahl = `${zahl(s.rechnungen)} Rechnungen, ${zahl(s.gueltig)} mit gültigem Betrag${s.fehlend ? `, ${zahl(s.fehlend)} ohne Betrag` : ""}${s.nullbetraege ? `, ${zahl(s.nullbetraege)} mit Betrag 0` : ""}`;
        const zeit = `Rechnungsmonat ${monat}`;
        if (saisonKennzahl === "rechnungen") return { status: "wert", wert: s.rechnungen, anzeige: zahl(s.rechnungen), detail: [`${zahl(s.rechnungen)} Rechnungen`, zeit, fallzahl], teilweise };
        if (s.rechnungen === 0) return { status: "wert", wert: 0, anzeige: "0", detail: [saisonKennzahl === "betrag" ? euro(0, w) : "kein Ø: keine Rechnung", zeit, fallzahl], teilweise };
        if (s.gueltig === 0) return { status: "fehlt", wert: null, anzeige: "", detail: ["kein gültiger Betrag gespeichert", zeit, fallzahl], teilweise };
        if (saisonKennzahl === "betrag") return { status: "wert", wert: s.summe, anzeige: euroKurz(s.summe).replace(" €", ""), detail: [`Fakturierter Bruttobetrag ${euro(s.summe, w)}`, zeit, fallzahl], teilweise };
        return { status: s.gueltig < z.kleineFallzahl ? "klein" : "wert", wert: s.mittel, anzeige: euroKurz(s.mittel as number).replace(" €", ""), detail: [`Ø-Rechnungsbetrag ${euro(s.mittel, w)} (Median ${euro(s.median, w)})`, zeit, fallzahl], teilweise };
      }),
    }));
    const max = saisonKennzahl === "quote" ? 1 : Math.max(0, ...d.saison.filter((c) => c.lage !== "ausserhalb").map((c) => wertVon(c) ?? 0));
    return { zeilen, max, nachRechnung };
  }, [d, saisonKennzahl, w, z.jahre, z.kleineFallzahl]);

  // ---------------------------------------------------------------- Regionen: Gebiet × Kalendermonat
  const regionen = useMemo(() => {
    const quelle = alleGebiete ? d.regionen.zeilen : d.regionen.zeilen.slice(0, 15);
    // Kalendermonate, in die kein Tag des Zeitraums fällt (z. B. Dezember in einem laufenden Jahr), sind keine echte Null.
    const monatImZeitraum = Array.from({ length: 12 }, (_, i) => d.saison.some((c) => c.monat === i + 1 && c.lage !== "ausserhalb"));
    const zeilen: HeatZeile[] = quelle.map((g) => ({
      schluessel: g.schluessel,
      titel: g.label,
      zellen: g.monate.map((c, i): HeatZelle => {
        const monat = `${MONATE_LANG[i]} ${jahreText}${mehrereJahre ? " (gleiche Kalendermonate zusammengefasst)" : ""}`;
        if (!monatImZeitraum[i]) return { status: "ausserhalb", wert: null, anzeige: "", detail: [monat] };
        if (regionKennzahl === "quote") return quoteZelle(c.quote, c.angebote, `Angebotsmonat ${monat}`, z.kleineFallzahl);
        if (regionKennzahl === "angebote") return { status: "wert", wert: c.angebote, anzeige: zahl(c.angebote), detail: [`${zahl(c.angebote)} Angebote`, `Angebotsmonat ${monat}`, `Fallzahl ${zahl(c.angebote)}`] };
        const fall = `${zahl(c.rechnungen)} eindeutig zugeordnete Rechnungen, ${zahl(c.gueltig)} mit gültigem Betrag`;
        if (c.rechnungen > 0 && c.gueltig === 0) return { status: "fehlt", wert: null, anzeige: "", detail: ["kein gültiger Betrag gespeichert", `Rechnungsmonat ${monat}`, fall] };
        return { status: "wert", wert: c.betrag, anzeige: c.betrag === 0 ? "0" : euroKurz(c.betrag).replace(" €", ""), detail: [`Eindeutig zugeordneter Rechnungsbetrag ${euro(c.betrag, w)}`, `Rechnungsmonat ${monat}`, fall] };
      }),
    }));
    const max = regionKennzahl === "quote" ? 1 : Math.max(0, ...d.regionen.zeilen.flatMap((g) => g.monate.map((c) => (regionKennzahl === "angebote" ? c.angebote : c.betrag))));
    return { zeilen, max };
  }, [d, regionKennzahl, alleGebiete, jahreText, mehrereJahre, w, z.kleineFallzahl]);

  const rangliste = useMemo(() => {
    const wert = (g: RegionZeile): number | string => {
      switch (sortierung.spalte) {
        case "gebiet": return g.label;
        case "angebote": return g.angebote;
        case "quote": return g.quote.wert ?? -1;
        case "betrag": return g.betrag;
        case "dAngebote": return g.angebote - g.vorjahr.angebote;
        case "dBetrag": return g.betrag - g.vorjahr.betrag;
      }
    };
    return [...d.regionen.zeilen].sort((a, b) => {
      const x = wert(a), y = wert(b);
      const r = typeof x === "string" ? x.localeCompare(y as string, "de") : (x as number) - (y as number);
      return sortierung.ab ? -r : r;
    });
  }, [d, sortierung]);
  const kopf = (spalte: typeof sortierung.spalte, text: string, rechts = true) => (
    <th scope="col" className={rechts ? "gl-r" : undefined} aria-sort={sortierung.spalte === spalte ? (sortierung.ab ? "descending" : "ascending") : "none"}>
      <button type="button" className="gl-sortierknopf" onClick={() => setSortierung((s) => ({ spalte, ab: s.spalte === spalte ? !s.ab : spalte !== "gebiet" }))}>
        {text} <span aria-hidden="true">{sortierung.spalte === spalte ? (sortierung.ab ? "↓" : "↑") : "↕"}</span>
      </button>
    </th>
  );

  const besterMonat = [...d.kalendermonate].filter((k) => k.statistik.mittel != null).sort((a, b) => (b.statistik.mittel as number) - (a.statistik.mittel as number));
  const rang = new Map(besterMonat.map((k, i) => [k.monat, i + 1]));
  const maxMittel = Math.max(1, ...d.kalendermonate.map((k) => k.statistik.mittel ?? 0));
  const q = d.quote.aktuell;
  const s = d.betrag.statistik;
  const nz = d.regionen.nichtZuordenbar;
  const ohnePlz = d.regionen.zeilen.find((g) => g.plz2 == null);

  return (
    <div className="gl">
      <Seitenkopf
        titel="Geschäftsleitung"
        unter={<>Datenstand {datum(z.stichtag)} (jüngster Beleg im Bestand) · Zeitraum {zeitraumText} · Vergleich mit {vjText}</>}
      />

      <nav className="gl-filter" aria-label="Zeitraum und Adresse">
        <div className="k-segment" role="group" aria-label="Zeitraum">
          {(["2", "5", "10"] as const).map((n) => (
            <Link key={n} href={adresse(auswahl, { z: n })} className={auswahl.zeitraum === n ? "k-segment-aktiv" : undefined} aria-current={auswahl.zeitraum === n ? "true" : undefined}>
              {n} Jahre
            </Link>
          ))}
        </div>
        <form method="get" action="/neu/geschaeftsleitung" className="gl-frei">
          <input type="hidden" name="z" value="frei" />
          {auswahl.perspektive === "entladestelle" ? <input type="hidden" name="adresse" value="entla" /> : null}
          <label>von <input type="date" name="von" defaultValue={auswahl.von} min={fruehestes} max={z.stichtag} required className="k-eingabe" /></label>
          <label>bis <input type="date" name="bis" defaultValue={auswahl.bis} min={fruehestes} max={z.stichtag} required className="k-eingabe" /></label>
          <button type="submit" className={`k-knopf ${auswahl.zeitraum === "frei" ? "k-knopf-primaer" : "k-knopf-sekundaer"}`}>Zeitraum anwenden</button>
        </form>
      </nav>

      {d.andereWaehrungen.length ? (
        <Hinweis art="warnung" titel="Weitere Währungen im Zeitraum">
          Beträge stehen in {w}. Nicht addiert: {d.andereWaehrungen.map((a) => `${zahl(a.rechnungen)} Rechnungen in ${a.waehrung} (${euro(a.summe, a.waehrung)})`).join(", ")}.
        </Hinweis>
      ) : null}

      <div className="gl-kennzahlen">
        <Kennzahl
          titel="Angebote"
          wert={zahl(d.angebote.wert)}
          zusatz="nach Angebotsdatum"
          vergleich={<>{richtung(d.angebote)} Vorjahreszeitraum {zahl(d.angebote.vorjahr)} · {veraenderung(d.angebote)}</>}
        />
        <Kennzahl
          titel="Rechnungen"
          wert={zahl(d.rechnungen.wert)}
          zusatz="nach Rechnungsdatum, jede Rechnung zählt einmal"
          vergleich={<>{richtung(d.rechnungen)} Vorjahreszeitraum {zahl(d.rechnungen.vorjahr)} · {veraenderung(d.rechnungen)}</>}
        />
        <Kennzahl
          titel="Fakturierter Bruttobetrag"
          wert={euro(s.summe, w)}
          zusatz={
            <>
              Ø je Rechnung {euro(s.mittel, w)} · Median {euro(s.median, w)}
              <br />
              aus {zahl(s.gueltig)} gültigen Rechnungsendbeträgen{s.nullbetraege ? `, davon ${zahl(s.nullbetraege)} mit Betrag 0` : ""}{s.fehlend ? ` · ${zahl(s.fehlend)} Rechnungen ohne gespeicherten Betrag nicht enthalten` : ""}
            </>
          }
          vergleich={
            <>
              {richtung(d.betrag.summe)} Vorjahreszeitraum {euro(d.betrag.summe.vorjahr, w)} · {veraenderung(d.betrag.summe, true)}
              {d.betrag.mittel ? <><br />Ø: {veraenderung(d.betrag.mittel, true)}</> : null}
              {d.betrag.median ? <> · Median: {veraenderung(d.betrag.median, true)}</> : null}
            </>
          }
        />
        <Kennzahl
          titel={QUOTE_NAME}
          wert={prozent(q.wert)}
          zusatz={q.nenner > 0 ? <>{zahl(q.zaehler)} von {zahl(q.nenner)} auswertbaren Angeboten (Angebotsdatum bis {datum(z.reifBis)})</> : <>Kein auswertbares Angebot im Zeitraum</>}
          vergleich={<>{richtung(d.quote.differenzPunkte)} Vorjahreskohorte {quoteText(d.quote.vorjahr)} · {punkte(d.quote.differenzPunkte)}</>}
          hilfe={QUOTE_ERKLAERUNG}
        />
      </div>

      <Karte titel={`${QUOTE_NAME}: Zähler, Nenner und Ausschlüsse`}>
        <p className="gl-absatz">{QUOTE_ERKLAERUNG} Ausgewählt werden Angebote nach ihrem Angebotsdatum ({zeitraumText}). Eine Rechnung nach dem Ende dieses Zeitraums zählt, wenn sie innerhalb der {z.fenster} Tage liegt und am Datenstand vorlag.</p>
        <div className="gl-heat-rollen">
          <table className="gl-tabelle gl-tabelle-schmal">
            <caption>Aufschlüsselung der Angebotskohorte</caption>
            <thead><tr><th scope="col">Gruppe</th><th scope="col" className="gl-r">Zeitraum</th><th scope="col" className="gl-r">Vorjahr</th><th scope="col">Behandlung</th></tr></thead>
            <tbody>
              <tr><th scope="row">Erste Rechnung an Tag 0 bis {z.fenster}</th><td className="gl-r">{zahl(q.zaehler)}</td><td className="gl-r">{zahl(d.quote.vorjahr.zaehler)}</td><td>Zähler</td></tr>
              <tr><th scope="row">Erste Rechnung nach Tag {z.fenster}</th><td className="gl-r">{zahl(q.spaeter)}</td><td className="gl-r">{zahl(d.quote.vorjahr.spaeter)}</td><td>im Nenner, kein Treffer</td></tr>
              <tr><th scope="row">Keine Rechnung zugeordnet</th><td className="gl-r">{zahl(q.ohneRechnung)}</td><td className="gl-r">{zahl(d.quote.vorjahr.ohneRechnung)}</td><td>im Nenner, kein Treffer</td></tr>
              <tr><th scope="row">Erste Rechnung vor dem Angebotsdatum</th><td className="gl-r">{zahl(q.widerspruch)}</td><td className="gl-r">{zahl(d.quote.vorjahr.widerspruch)}</td><td>Datenwiderspruch: im Nenner, kein Treffer</td></tr>
              <tr className="gl-summe"><th scope="row">Auswertbare Angebote</th><td className="gl-r">{zahl(q.nenner)}</td><td className="gl-r">{zahl(d.quote.vorjahr.nenner)}</td><td>Nenner</td></tr>
              <tr><th scope="row">Noch zu jung (Fenster läuft noch)</th><td className="gl-r">{zahl(q.zuJung)}</td><td className="gl-r">{zahl(d.quote.vorjahr.zuJung)}</td><td>nicht im Nenner; Vorjahr mit gleichem Reifegrad</td></tr>
              <tr><th scope="row">Angebotsnummer mehrfach vergeben</th><td className="gl-r">{zahl(q.mehrdeutig)}</td><td className="gl-r">{zahl(d.quote.vorjahr.mehrdeutig)}</td><td>nicht im Nenner: Zuordnung mehrdeutig</td></tr>
              <tr><th scope="row">Ohne Angebotsnummer</th><td className="gl-r">{zahl(q.ohneNummer)}</td><td className="gl-r">{zahl(d.quote.vorjahr.ohneNummer)}</td><td>nicht im Nenner: keine Zuordnungsgrundlage</td></tr>
              <tr><th scope="row">Als Entwurf markiert</th><td className="gl-r">{zahl(q.entwuerfe)}</td><td className="gl-r">{zahl(d.quote.vorjahr.entwuerfe)}</td><td>nicht im Nenner</td></tr>
            </tbody>
          </table>
        </div>
        <details className="gl-tabelle-klappe">
          <summary>Kennzahlenhilfe: Was hier bewusst fehlt</summary>
          <p className="gl-absatz">Eine <strong>Abschlussquote</strong>, die <strong>Anzahl gewonnener Aufträge</strong> und ein <strong>Ø-Auftragswert</strong> brauchen einen belegten Auftragsstatus bzw. einen festgehaltenen Annahmewert. Beides gibt es im Bestand noch nicht: Die Statuskürzel der Altsoftware sind ungeklärt, und ein Angebot kann nach der Annahme geändert worden sein. Eine Rechnung belegt Fakturierung, nicht Annahme. Deshalb zeigt diese Übersicht die {QUOTE_NAME} und den Rechnungsendbetrag unter ihren eigenen Namen; der kalkulierte Angebotswert wird hier nicht als Auftragswert ausgegeben.</p>
          <p className="gl-absatz">Im gesamten Bestand ohne Datum und deshalb in keinem Zeitraum: {zahl(d.ohneDatum.angebote)} Angebote ohne Angebotsdatum, {zahl(d.ohneDatum.rechnungen)} Rechnungen ohne Rechnungsdatum ({euro(d.ohneDatum.rechnungenBetrag, w)}).</p>
        </details>
      </Karte>

      <Karte titel="Monatsverlauf">
        <Monatsverlauf monate={d.monate} waehrung={w} />
      </Karte>

      <Karte titel="In welchem Monat sind die Rechnungen im Mittel am höchsten?">
        <p className="gl-absatz">Alle Rechnungen im Zeitraum {zeitraumText}, nach Kalendermonat des Rechnungsdatums. Der Ø ist die Summe der gültigen Beträge geteilt durch ihre Anzahl, direkt über die Rechnungen gerechnet.</p>
        <div className="gl-heat-rollen">
          <table className="gl-tabelle">
            <caption>Ø, Median und Anzahl gültiger Rechnungsbeträge je Kalendermonat</caption>
            <thead><tr><th scope="col">Monat</th><th scope="col" className="gl-r">Ø je Rechnung</th><th scope="col" aria-hidden="true" /><th scope="col" className="gl-r">Median</th><th scope="col" className="gl-r">gültige Beträge</th><th scope="col" className="gl-r">Rang nach Ø</th></tr></thead>
            <tbody>
              {d.kalendermonate.map((k) => (
                <tr key={k.monat} className={rang.get(k.monat) === 1 ? "gl-spitze" : undefined}>
                  <th scope="row">{MONATE_LANG[k.monat - 1]}</th>
                  <td className="gl-r">{euro(k.statistik.mittel, w)}</td>
                  <td className="gl-balkenzelle" aria-hidden="true"><span className="gl-balken" style={{ width: `${((k.statistik.mittel ?? 0) / maxMittel) * 100}%` }} /></td>
                  <td className="gl-r">{euro(k.statistik.median, w)}</td>
                  <td className="gl-r">{zahl(k.statistik.gueltig)}{k.statistik.gueltig > 0 && k.statistik.gueltig < z.kleineFallzahl ? " (kleine Fallzahl)" : ""}</td>
                  <td className="gl-r">{rang.get(k.monat) ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Karte>

      <Karte
        titel="Saisonalität: Jahr × Monat"
        aktionen={
          <div className="k-segment" role="group" aria-label="Kennzahl der Saison-Heatmap">
            {([["rechnungen", "Rechnungen"], ["betrag", "Bruttobetrag"], ["mittel", "Ø-Rechnungsbetrag"], ["quote", "Quote"]] as const).map(([k, t]) => (
              <button key={k} type="button" className={saisonKennzahl === k ? "k-segment-aktiv" : undefined} aria-pressed={saisonKennzahl === k} onClick={() => setSaisonKennzahl(k)}>{t}</button>
            ))}
          </div>
        }
      >
        <p className="gl-absatz">
          {saisonKennzahl === "rechnungen" ? "Anzahl der Rechnungen" : saisonKennzahl === "betrag" ? `Fakturierter Bruttobetrag in Tausend ${w === "EUR" ? "Euro" : w}` : saisonKennzahl === "mittel" ? `Ø-Rechnungsbetrag in Tausend ${w === "EUR" ? "Euro" : w}` : `${QUOTE_NAME} in Prozent`}
          {" · "}
          <strong>{saison.nachRechnung ? "Spalten = Rechnungsmonat" : "Spalten = Angebotsmonat"}</strong>
        </p>
        <Heatmap
          titel={`Saisonalität: ${saisonKennzahl === "quote" ? QUOTE_NAME : saisonKennzahl === "rechnungen" ? "Rechnungen" : saisonKennzahl === "betrag" ? "fakturierter Bruttobetrag" : "Ø-Rechnungsbetrag"} je Jahr und Monat`}
          zeilenTitel="Kalenderjahr"
          spaltenTitel={saison.nachRechnung ? "Rechnungsmonat" : "Angebotsmonat"}
          spalten={MONATE_KURZ}
          zeilen={saison.zeilen}
          max={saison.max}
          legende={(v) => (saisonKennzahl === "quote" ? `${Math.round(v * 100)} %` : saisonKennzahl === "rechnungen" ? zahl(v) : euroKurz(v))}
        />
      </Karte>

      <Karte
        titel="Regionen: PLZ-Gebiet × Monat"
        aktionen={
          <div className="gl-aktionen">
            <div className="k-segment" role="group" aria-label="Adresse">
              <Link href={adresse(auswahl, { adresse: "bela" })} className={auswahl.perspektive === "beladestelle" ? "k-segment-aktiv" : undefined} aria-current={auswahl.perspektive === "beladestelle" ? "true" : undefined}>Beladestelle</Link>
              <Link href={adresse(auswahl, { adresse: "entla" })} className={auswahl.perspektive === "entladestelle" ? "k-segment-aktiv" : undefined} aria-current={auswahl.perspektive === "entladestelle" ? "true" : undefined}>Entladestelle</Link>
            </div>
            <div className="k-segment" role="group" aria-label="Kennzahl der Regionen-Heatmap">
              {([["angebote", "Angebote"], ["quote", "Quote"], ["betrag", "Rechnungsbetrag"]] as const).map(([k, t]) => (
                <button key={k} type="button" className={regionKennzahl === k ? "k-segment-aktiv" : undefined} aria-pressed={regionKennzahl === k} onClick={() => setRegionKennzahl(k)}>{t}</button>
              ))}
            </div>
          </div>
        }
      >
        <p className="gl-absatz">
          {regionKennzahl === "angebote" ? "Anzahl der Angebote" : regionKennzahl === "quote" ? `${QUOTE_NAME} in Prozent` : `Eindeutig zugeordneter Rechnungsbetrag in Tausend ${w === "EUR" ? "Euro" : w}`} nach {auswahl.perspektive === "beladestelle" ? "Beladestelle" : "Entladestelle"}
          {" · "}
          <strong>{regionKennzahl === "betrag" ? "Spalten = Rechnungsmonat" : "Spalten = Angebotsmonat"}</strong>
          {mehrereJahre ? ` · gleiche Kalendermonate der Jahre ${jahreText} zusammengefasst` : ` · Jahr ${jahreText}`}
          {" · "}Zeitraum {zeitraumText}. Je Angebot genau ein Gebiet; ein fehlendes Land wird nicht aus der PLZ erraten.
        </p>
        <Heatmap
          titel={`Regionen: ${regionKennzahl === "quote" ? QUOTE_NAME : regionKennzahl === "angebote" ? "Angebote" : "eindeutig zugeordneter Rechnungsbetrag"} je PLZ-Gebiet (${auswahl.perspektive === "beladestelle" ? "Beladestelle" : "Entladestelle"}) und Kalendermonat, ${jahreText}`}
          zeilenTitel={`Land und PLZ-Gebiet (${auswahl.perspektive === "beladestelle" ? "Beladestelle" : "Entladestelle"})`}
          spaltenTitel={`${regionKennzahl === "betrag" ? "Rechnungsmonat" : "Angebotsmonat"} (${jahreText})`}
          spalten={MONATE_KURZ}
          zeilen={regionen.zeilen}
          max={regionen.max}
          legende={(v) => (regionKennzahl === "quote" ? `${Math.round(v * 100)} %` : regionKennzahl === "angebote" ? zahl(v) : euroKurz(v))}
          fusszeile={
            d.regionen.zeilen.length > 15 ? (
              <p className="gl-mehr">
                <button type="button" className="k-knopf k-knopf-sekundaer k-knopf-klein" onClick={() => setAlleGebiete((x) => !x)}>
                  {alleGebiete ? "Nur die 15 Gebiete mit den meisten Angeboten zeigen" : `Alle ${zahl(d.regionen.zeilen.length)} Gebiete zeigen`}
                </button>
              </p>
            ) : null
          }
        />

        <h3 className="gl-zwischentitel">Abstimmung mit der Gesamtübersicht</h3>
        <ul className="gl-liste">
          <li>Angebote: {zahl(d.regionen.zeilen.reduce((x, g) => x + g.angebote, 0))} in den Gebieten = {zahl(d.angebote.wert)} gesamt{ohnePlz ? `, davon ${zahl(ohnePlz.angebote)} ohne lesbare PLZ` : ""}.</li>
          <li>
            Rechnungsbetrag: {euro(d.regionen.summeBetrag - nz.betrag, w)} in den Gebieten + {euro(nz.betrag, w)} regional nicht zuordenbar = {euro(d.regionen.summeBetrag, w)} (Gesamtübersicht {euro(s.summe, w)}).
          </li>
          <li>Regional nicht zuordenbar sind {zahl(nz.rechnungen)} Rechnungen: {zahl(nz.ohneAngebot)} ohne Angebotszuordnung, {zahl(nz.mehrdeutig)} mit mehrdeutiger Angebotsnummer.</li>
        </ul>

        <h3 className="gl-zwischentitel">Gebietsrangliste</h3>
        <div className="gl-heat-rollen">
          <table className="gl-tabelle">
            <caption>Gebiete nach {auswahl.perspektive === "beladestelle" ? "Beladestelle" : "Entladestelle"}, {zeitraumText}, Vergleich mit {vjText}</caption>
            <thead>
              <tr>
                {kopf("gebiet", "Gebiet", false)}
                {kopf("angebote", "Angebote")}
                {kopf("dAngebote", "Δ Vorjahr")}
                {kopf("quote", QUOTE_NAME)}
                <th scope="col" className="gl-r">Δ Vorjahr</th>
                {kopf("betrag", "Zugeordneter Rechnungsbetrag")}
                {kopf("dBetrag", "Δ Vorjahr")}
              </tr>
            </thead>
            <tbody>
              {rangliste.map((g) => {
                const dq = g.quote.wert != null && g.vorjahr.quote.wert != null ? (g.quote.wert - g.vorjahr.quote.wert) * 100 : null;
                return (
                  <tr key={g.schluessel}>
                    <th scope="row">{g.label}</th>
                    <td className="gl-r">{zahl(g.angebote)}</td>
                    <td className="gl-r">{veraenderung({ wert: g.angebote, vorjahr: g.vorjahr.angebote, absolut: g.angebote - g.vorjahr.angebote, relativ: g.vorjahr.angebote ? (g.angebote - g.vorjahr.angebote) / g.vorjahr.angebote : null })}</td>
                    <td className="gl-r">{quoteText(g.quote)}{g.quote.nenner > 0 && g.quote.nenner < z.kleineFallzahl ? " · kleine Fallzahl" : ""}</td>
                    <td className="gl-r">{punkte(dq)}</td>
                    <td className="gl-r">{euro(g.betrag, w)}</td>
                    <td className="gl-r">{veraenderung({ wert: g.betrag, vorjahr: g.vorjahr.betrag, absolut: Math.round((g.betrag - g.vorjahr.betrag) * 100) / 100, relativ: g.vorjahr.betrag ? (g.betrag - g.vorjahr.betrag) / g.vorjahr.betrag : null }, true)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Karte>

      <p className="gl-fuss">Grundlage geladen am {datum(geladenUm.slice(0, 10))} um {new Date(geladenUm).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" })} Uhr (wird höchstens fünf Minuten zwischengespeichert). Alle Werte stammen aus den gespeicherten Angeboten und Rechnungen; es werden keine Adressen an externe Dienste übermittelt.</p>
    </div>
  );
}
