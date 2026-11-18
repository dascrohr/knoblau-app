"use client";
// Heatmap mit gemeinsamer Farbskala, Legende, Detailanzeige je Zelle (Maus, Tastatur, Tippen) und Tabellenansicht.
import { useState, type ReactNode } from "react";

/** Eine Farbe (Blau), hell → dunkel: fünf Stufen für die Größe des Werts. */
export const STUFEN = ["#eaf1fb", "#c5d8f3", "#94b6e6", "#5a8fd2", "#2c66b0"];

export type ZellStatus =
  | "wert" // normaler Wert (auch echte 0)
  | "klein" // Wert mit kleiner Fallzahl
  | "fehlt" // keine Daten
  | "unreif" // Kohorte noch nicht ausgereift
  | "ausserhalb"; // nicht im gewählten Zeitraum

export type HeatZelle = {
  status: ZellStatus;
  wert: number | null; // für die Farbe
  anzeige: string; // kurzer Text in der Zelle
  detail: string[]; // genaue Angaben: Wert, Zeitraum, Fallzahl, Zähler/Nenner
  teilweise?: boolean; // Monat nur teilweise im Zeitraum
};
export type HeatZeile = { schluessel: string; titel: string; zellen: HeatZelle[] };

const SYMBOL: Record<ZellStatus, string> = { wert: "", klein: "*", fehlt: "–", unreif: "◷", ausserhalb: "" };
const STATUS_TEXT: Record<ZellStatus, string> = { wert: "", klein: "kleine Fallzahl", fehlt: "keine Daten", unreif: "noch nicht ausgereift", ausserhalb: "außerhalb des Zeitraums" };

export function stufeVon(wert: number, max: number): number {
  if (max <= 0 || wert <= 0) return 0;
  return Math.min(STUFEN.length - 1, Math.floor((wert / max) * STUFEN.length - 1e-9));
}

type Props = {
  titel: string; // für Screenreader und Tabelle
  zeilenTitel: string; // Beschriftung der Zeilenachse
  spaltenTitel: string; // Beschriftung der Spaltenachse (zeigt z. B. „Rechnungsmonat“ / „Angebotsmonat“)
  spalten: string[];
  zeilen: HeatZeile[];
  /** Obergrenze der Farbskala; alle Zellen dieser Kennzahl teilen sie. */
  max: number;
  legende: (wert: number) => string;
  fusszeile?: ReactNode;
};

export function Heatmap({ titel, zeilenTitel, spaltenTitel, spalten, zeilen, max, legende, fusszeile }: Props) {
  const [aktiv, setAktiv] = useState<{ z: number; s: number } | null>(null);
  const zelle = aktiv ? zeilen[aktiv.z]?.zellen[aktiv.s] : null;
  const hatStatus = (st: ZellStatus) => zeilen.some((z) => z.zellen.some((c) => c.status === st));
  const hatTeil = zeilen.some((z) => z.zellen.some((c) => c.teilweise));
  return (
    <div className="gl-heat">
      <div className="gl-heat-achse">
        <span>↓ {zeilenTitel}</span>
        <span>→ {spaltenTitel}</span>
      </div>
      <div className="gl-heat-rollen">
        <div className="gl-heat-raster" role="grid" aria-label={titel} style={{ gridTemplateColumns: `minmax(9.5rem, max-content) repeat(${spalten.length}, minmax(3.1rem, 1fr))` }}>
          <div role="row" className="gl-heat-reihe">
            <span role="columnheader" className="gl-heat-ecke" />
            {spalten.map((s) => (
              <span key={s} role="columnheader" className="gl-heat-kopf">{s}</span>
            ))}
          </div>
          {zeilen.map((z, zi) => (
            <div role="row" className="gl-heat-reihe" key={z.schluessel}>
              <span role="rowheader" className="gl-heat-zeilentitel">{z.titel}</span>
              {z.zellen.map((c, si) => {
                const stufe = c.status === "wert" || c.status === "klein" ? stufeVon(c.wert ?? 0, max) : -1;
                const istAktiv = aktiv?.z === zi && aktiv?.s === si;
                return (
                  <button
                    key={si}
                    type="button"
                    role="gridcell"
                    className="gl-heat-zelle"
                    data-status={c.status}
                    data-teil={c.teilweise ? "ja" : undefined}
                    data-dunkel={stufe === STUFEN.length - 1 ? "ja" : undefined}
                    aria-selected={istAktiv}
                    aria-label={`${z.titel}, ${spalten[si]}: ${c.detail.join("; ")}${STATUS_TEXT[c.status] ? ` (${STATUS_TEXT[c.status]})` : ""}`}
                    style={stufe >= 0 ? { background: STUFEN[stufe] } : undefined}
                    onClick={() => setAktiv(istAktiv ? null : { z: zi, s: si })}
                    onMouseEnter={() => setAktiv({ z: zi, s: si })}
                    onFocus={() => setAktiv({ z: zi, s: si })}
                  >
                    {c.status === "wert" || c.status === "klein" ? c.anzeige : SYMBOL[c.status]}
                    {c.status === "klein" ? <sup aria-hidden="true">*</sup> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="gl-heat-detail" aria-live="polite">
        {zelle && aktiv ? (
          <>
            <strong>{zeilen[aktiv.z].titel} · {spalten[aktiv.s]}</strong>
            {zelle.detail.map((d, i) => <span key={i}>{d}</span>)}
            {STATUS_TEXT[zelle.status] ? <em>{STATUS_TEXT[zelle.status]}</em> : null}
            {zelle.teilweise ? <em>Monat liegt nur teilweise im gewählten Zeitraum</em> : null}
          </>
        ) : (
          <span className="k-leise">Zelle anklicken, antippen oder mit der Tabulatortaste ansteuern: genauer Wert, Zeitraum und Fallzahl.</span>
        )}
      </div>
      <div className="gl-heat-legende">
        <span className="gl-heat-skala" aria-hidden="true">
          {STUFEN.map((f) => <i key={f} style={{ background: f }} />)}
        </span>
        <span>{legende(0)} bis {legende(max)} (gemeinsame Skala für alle Zellen)</span>
        <span><b className="gl-zeichen" data-status="wert" style={{ background: STUFEN[0] }}>0</b> echte Null</span>
        {hatStatus("fehlt") ? <span><b className="gl-zeichen" data-status="fehlt">–</b> keine Daten</span> : null}
        {hatStatus("unreif") ? <span><b className="gl-zeichen" data-status="unreif">◷</b> noch nicht ausgereift</span> : null}
        {hatStatus("klein") ? <span><b className="gl-zeichen" data-status="klein">n*</b> kleine Fallzahl</span> : null}
        {hatStatus("ausserhalb") ? <span><b className="gl-zeichen" data-status="ausserhalb" /> außerhalb des Zeitraums</span> : null}
        {hatTeil ? <span><b className="gl-zeichen" data-teil="ja" style={{ background: STUFEN[1] }} /> Teilmonat</span> : null}
      </div>
      {fusszeile}
      <details className="gl-tabelle-klappe">
        <summary>Als Tabelle anzeigen</summary>
        <div className="gl-heat-rollen">
          <table className="gl-tabelle">
            <caption>{titel}</caption>
            <thead>
              <tr>
                <th scope="col">{zeilenTitel}</th>
                {spalten.map((s) => <th scope="col" key={s}>{s}</th>)}
              </tr>
            </thead>
            <tbody>
              {zeilen.map((z) => (
                <tr key={z.schluessel}>
                  <th scope="row">{z.titel}</th>
                  {z.zellen.map((c, i) => (
                    <td key={i}>
                      {c.status === "wert" || c.status === "klein" ? c.detail[0] : STATUS_TEXT[c.status]}
                      {c.status === "klein" ? " (kleine Fallzahl)" : ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
