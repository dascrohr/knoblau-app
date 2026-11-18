"use client";
// Monatsverlauf: zwei getrennte, an derselben Zeitachse ausgerichtete Säulendiagramme (Anzahl, Betrag).
// Je Diagramm eine Achse. Der Strich über jeder Säule zeigt den Vorjahresmonat.
import { useState } from "react";
import type { MonatsWert } from "@/lib/dashboard/rechnen";
import { MONATE_KURZ, euro, euroKurz, monatText, zahl } from "./format";

const B = 760, H = 150, LINKS = 56, RECHTS = 8, OBEN = 10, UNTEN = 22;

function schoeneObergrenze(max: number): number {
  if (max <= 0) return 1;
  const potenz = 10 ** Math.floor(Math.log10(max));
  for (const f of [1, 2, 2.5, 5, 10]) if (f * potenz >= max) return f * potenz;
  return 10 * potenz;
}

function Diagramm({ monate, wert, vorjahr, format, titel, aktiv, setAktiv }: { monate: MonatsWert[]; wert: (m: MonatsWert) => number; vorjahr: (m: MonatsWert) => number; format: (x: number) => string; titel: string; aktiv: number | null; setAktiv: (i: number | null) => void }) {
  const max = schoeneObergrenze(Math.max(1, ...monate.map((m) => Math.max(wert(m), vorjahr(m)))));
  const schritt = (B - LINKS - RECHTS) / Math.max(1, monate.length);
  const breite = Math.max(1.5, Math.min(22, schritt - 2));
  const y = (v: number) => OBEN + (H - OBEN - UNTEN) * (1 - v / max);
  const jahresweise = monate.length > 30;
  return (
    <svg viewBox={`0 0 ${B} ${H}`} className="gl-diagramm" role="img" aria-label={`${titel} je Monat. Die genauen Werte stehen in der Tabelle darunter.`}>
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={LINKS} x2={B - RECHTS} y1={y(max * t)} y2={y(max * t)} className="gl-gitter" />
          <text x={LINKS - 6} y={y(max * t) + 3.5} textAnchor="end" className="gl-achse">{format(max * t)}</text>
        </g>
      ))}
      {monate.map((m, i) => {
        const x = LINKS + i * schritt + (schritt - breite) / 2;
        const v = wert(m), vj = vorjahr(m);
        const mon = Number(m.monat.slice(5, 7));
        const zeigeLabel = jahresweise ? mon === 1 : monate.length <= 14 || mon % 3 === 1;
        return (
          <g key={m.monat}>
            {i === aktiv ? <rect x={LINKS + i * schritt} y={OBEN} width={schritt} height={H - OBEN - UNTEN} className="gl-fadenkreuz" /> : null}
            <rect x={x} y={y(v)} width={breite} height={Math.max(0, y(0) - y(v))} rx={Math.min(2, breite / 2)} className="gl-saeule" data-teil={m.teil ? "ja" : undefined} />
            <line x1={x - 1} x2={x + breite + 1} y1={y(vj)} y2={y(vj)} className="gl-vorjahr" />
            {zeigeLabel ? <text x={LINKS + i * schritt + schritt / 2} y={H - 7} textAnchor="middle" className="gl-achse">{jahresweise ? m.monat.slice(0, 4) : `${MONATE_KURZ[mon - 1]} ${m.monat.slice(2, 4)}`}</text> : null}
            <rect x={LINKS + i * schritt} y={OBEN} width={schritt} height={H - OBEN - UNTEN} fill="transparent" tabIndex={0} role="button"
              aria-label={`${monatText(m.monat)}: ${format(v)}, Vorjahresmonat ${format(vj)}${m.teil ? ", Teilmonat" : ""}`}
              onMouseEnter={() => setAktiv(i)} onFocus={() => setAktiv(i)} onClick={() => setAktiv(i)} className="gl-treffer" />
          </g>
        );
      })}
    </svg>
  );
}

export function Monatsverlauf({ monate, waehrung }: { monate: MonatsWert[]; waehrung: string | null }) {
  const [aktiv, setAktiv] = useState<number | null>(null);
  const m = aktiv != null ? monate[aktiv] : null;
  return (
    <div className="gl-verlauf" onMouseLeave={() => setAktiv(null)}>
      <div className="gl-diagramm-legende">
        <span><i className="gl-leg-saeule" /> gewählter Zeitraum</span>
        <span><i className="gl-leg-vorjahr" /> derselbe Monat im Vorjahr</span>
        {monate.some((x) => x.teil) ? <span><i className="gl-leg-saeule" data-teil="ja" /> Teilmonat</span> : null}
      </div>
      <h3 className="gl-diagramm-titel">Rechnungen je Monat (Anzahl, nach Rechnungsdatum)</h3>
      <Diagramm monate={monate} wert={(x) => x.statistik.rechnungen} vorjahr={(x) => x.vorjahr.rechnungen} format={zahl} titel="Anzahl der Rechnungen" aktiv={aktiv} setAktiv={setAktiv} />
      <h3 className="gl-diagramm-titel">Fakturierter Bruttobetrag je Monat (nach Rechnungsdatum)</h3>
      <Diagramm monate={monate} wert={(x) => x.statistik.summe} vorjahr={(x) => x.vorjahr.summe} format={euroKurz} titel="Fakturierter Bruttobetrag" aktiv={aktiv} setAktiv={setAktiv} />
      <p className="gl-diagramm-detail" aria-live="polite">
        {m ? (
          <>
            <strong>{monatText(m.monat)}{m.teil ? " (Teilmonat)" : ""}:</strong> {zahl(m.statistik.rechnungen)} Rechnungen (Vorjahr {zahl(m.vorjahr.rechnungen)}) · {euro(m.statistik.summe, waehrung)} (Vorjahr {euro(m.vorjahr.summe, waehrung)}) · Ø {euro(m.statistik.mittel, waehrung)} · Median {euro(m.statistik.median, waehrung)} aus {zahl(m.statistik.gueltig)} gültigen Beträgen
          </>
        ) : (
          <span className="k-leise">Monat überfahren, antippen oder mit der Tabulatortaste ansteuern, um die genauen Werte zu sehen.</span>
        )}
      </p>
      <details className="gl-tabelle-klappe">
        <summary>Als Tabelle anzeigen</summary>
        <div className="gl-heat-rollen">
          <table className="gl-tabelle">
            <caption>Rechnungen und fakturierter Bruttobetrag je Monat</caption>
            <thead>
              <tr><th scope="col">Monat</th><th scope="col">Rechnungen</th><th scope="col">Vorjahr</th><th scope="col">Bruttobetrag</th><th scope="col">Vorjahr</th><th scope="col">Ø je Rechnung</th><th scope="col">Median</th><th scope="col">gültige Beträge</th></tr>
            </thead>
            <tbody>
              {monate.map((x) => (
                <tr key={x.monat}>
                  <th scope="row">{monatText(x.monat)}{x.teil ? " (Teilmonat)" : ""}</th>
                  <td>{zahl(x.statistik.rechnungen)}</td><td>{zahl(x.vorjahr.rechnungen)}</td>
                  <td>{euro(x.statistik.summe, waehrung)}</td><td>{euro(x.vorjahr.summe, waehrung)}</td>
                  <td>{euro(x.statistik.mittel, waehrung)}</td><td>{euro(x.statistik.median, waehrung)}</td><td>{zahl(x.statistik.gueltig)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
