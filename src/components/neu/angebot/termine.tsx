"use client";
import { memo, useState } from "react";
import { TERMIN_ZEILEN, type Termin } from "@/lib/angebot-typen";
import { Karte, Knopf, Tabelle, Textbereich } from "../ui";
import { TextbausteinKnopf } from "./textbausteine";
import { freieZeile, type Setzer } from "./zustand";

type Props = { termine: Termin[]; termineFrei: string | null; info: string | null; setzer: Setzer };

export const Termine = memo(function Termine({ termine, termineFrei, info, setzer }: Props) {
  const [extra, setExtra] = useState<number[]>([]);
  const zeilen = [...new Set([...termine.map((t) => t.zeile), ...extra])].sort((a, b) => a - b);
  const naechste = freieZeile(zeilen, TERMIN_ZEILEN);
  const nach = new Map(termine.map((t) => [t.zeile, t]));
  const aendern = (zeile: number, a: Partial<Termin>) =>
    setzer.termine((l) => (l.some((t) => t.zeile === zeile) ? l.map((t) => (t.zeile === zeile ? { ...t, ...a } : t)) : [...l, { zeile, text: null, datum: null, von: null, bis: null, gebucht: false, ...a }]));
  const entfernen = (zeile: number) => {
    setExtra((x) => x.filter((y) => y !== zeile));
    setzer.termine((l) => l.filter((t) => t.zeile !== zeile));
  };
  return (
    <div id="termine" className="k-abschnitt flex flex-col gap-4">
      <Karte
        titel="Termine"
        randlos
        aktionen={
          <>
            <span className="k-leise text-xs">{zeilen.length} von 10 Terminen</span>
            <Knopf klein disabled={naechste == null} onClick={() => naechste != null && setExtra((x) => [...x, naechste])}>
              + Termin hinzufügen
            </Knopf>
          </>
        }
      >
        <div className="k-karte-inhalt flex flex-col gap-1">
          <Textbereich label="Freie Termine" rows={3} wert={termineFrei} onWert={(w) => setzer.kopf({ termine_frei: w })} />
          <TextbausteinKnopf bereich="termine" wert={termineFrei} onWert={(w) => setzer.kopf({ termine_frei: w })} />
        </div>
        {zeilen.length === 0 ? (
          <p className="k-leise px-4 pb-2">Noch keine Ausführungstermine eingetragen.</p>
        ) : (
          <div className="px-1">
            <Tabelle
              eingabe
              beschriftung="Ausführungstermine"
              spalten={[{ titel: "Nr.", breite: "2.25rem" }, "Text", { titel: "Datum", breite: "10rem" }, { titel: "von", breite: "6rem" }, { titel: "bis", breite: "6rem" }, { titel: "Im Kalender", breite: "6.5rem" }, { titel: "Aktionen", versteckt: true, breite: "2.5rem" }]}
            >
              {zeilen.map((z) => {
                const t = nach.get(z);
                const lbl = (f: string) => `Termin ${z}: ${f}`;
                return (
                  <tr key={z}>
                    <td className="k-leise k-rechts">{z}</td>
                    <td style={{ minWidth: "12rem" }}>
                      <input className="k-eingabe" aria-label={lbl("Text")} value={t?.text ?? ""} onChange={(e) => aendern(z, { text: e.target.value || null })} />
                    </td>
                    <td>
                      <input className="k-eingabe" type="date" aria-label={lbl("Datum")} value={t?.datum ?? ""} onChange={(e) => aendern(z, { datum: e.target.value || null })} />
                    </td>
                    <td>
                      <input className="k-eingabe" aria-label={lbl("von Uhrzeit")} placeholder="08:00" value={t?.von ?? ""} onChange={(e) => aendern(z, { von: e.target.value || null })} />
                    </td>
                    <td>
                      <input className="k-eingabe" aria-label={lbl("bis Uhrzeit")} placeholder="16:00" value={t?.bis ?? ""} onChange={(e) => aendern(z, { bis: e.target.value || null })} />
                    </td>
                    <td className="text-center">
                      <input type="checkbox" style={{ width: "1.1rem", height: "1.1rem", accentColor: "var(--k-marke)" }} aria-label={lbl("im Kalender gebucht")} checked={!!t?.gebucht} onChange={(e) => aendern(z, { gebucht: e.target.checked })} />
                    </td>
                    <td>
                      <Knopf klein art="still" aria-label={lbl("entfernen")} title="Termin entfernen" onClick={() => entfernen(z)}>
                        ✕
                      </Knopf>
                    </td>
                  </tr>
                );
              })}
            </Tabelle>
          </div>
        )}
        <div className="k-karte-inhalt flex flex-col gap-1">
          <Textbereich label="Absprachen, die nicht ins Angebot gehören (intern)" rows={4} wert={info} onWert={(w) => setzer.kopf({ info: w })} />
          <TextbausteinKnopf bereich="intern" wert={info} onWert={(w) => setzer.kopf({ info: w })} />
        </div>
      </Karte>
    </div>
  );
});
