"use client";
import { memo } from "react";
import type { Checkpunkt } from "@/lib/angebot-typen";
import type { StammChecklisteZeile } from "@/lib/db-typen";
import { Karte, Knopf, Leerzustand, Tabelle } from "../ui";
import type { Setzer } from "./zustand";

type Props = { checkliste: Checkpunkt[]; vorlage: StammChecklisteZeile[]; setzer: Setzer };

/** Vorgaben der Altsoftware sind eine Liste in einem Textfeld; gängige Trenner werden erkannt. */
function vorschlaege(c: Checkpunkt): string[] {
  const teile = (c.vorgaben ?? "").split(/[;|\n\r]+/).map((s) => s.trim()).filter(Boolean);
  if (teile.length > 1) return teile;
  if (teile.length === 1 && teile[0].includes(",")) return teile[0].split(",").map((s) => s.trim()).filter(Boolean);
  if (teile.length === 1) return teile;
  return /^(l|j|b)/i.test(c.datentyp ?? "") ? ["Ja", "Nein"] : [];
}

export const Checkliste = memo(function Checkliste({ checkliste, vorlage, setzer }: Props) {
  const aendern = (zeile: number, a: Partial<Checkpunkt>) => setzer.checkliste((l) => l.map((c) => (c.zeile === zeile ? { ...c, ...a } : c)));
  const erzeugen = () => {
    if (checkliste.length && !window.confirm("Die vorhandene Checkliste wird durch die Vorlage ersetzt. Eingetragene Antworten gehen verloren. Fortfahren?")) return;
    setzer.checkliste(() => vorlage.map((v, i) => ({ zeile: i + 1, aufgabe: v.aufgabe, erledigt: false, ignorieren: false, datentyp: v.datentyp, wert: null, vorgaben: v.vorgaben, eintragen: v.eintragen })));
  };
  const leeren = () => {
    if (window.confirm("Checkliste wirklich leeren? Alle Punkte und Antworten werden entfernt.")) setzer.checkliste(() => []);
  };
  const offen = checkliste.filter((c) => !c.erledigt && !c.ignorieren).length;
  return (
    <div id="checkliste" className="k-abschnitt">
      <Karte
        titel="Checkliste"
        randlos
        aktionen={
          <>
            {checkliste.length ? (
              <span className="k-leise text-xs">
                {offen === 0 ? "alles erledigt" : `${offen} von ${checkliste.length} offen`}
              </span>
            ) : null}
            <Knopf klein onClick={erzeugen} disabled={vorlage.length === 0} title={vorlage.length === 0 ? "In den Stammdaten ist keine Checklisten-Vorlage hinterlegt" : undefined}>
              Aus Vorlage erzeugen
            </Knopf>
            {checkliste.length ? (
              <Knopf klein art="still" onClick={leeren}>
                Leeren
              </Knopf>
            ) : null}
          </>
        }
      >
        {checkliste.length === 0 ? (
          <Leerzustand titel="Noch keine Checkliste" text={vorlage.length ? "Mit „Aus Vorlage erzeugen“ legen Sie die Fragen für die Besichtigung an." : "In den Stammdaten ist noch keine Checklisten-Vorlage hinterlegt."} />
        ) : (
          <div className="px-1">
            <Tabelle eingabe beschriftung="Checkliste" spalten={["Aufgabe", { titel: "Eingabe", breite: "32%" }, { titel: "Erledigt", breite: "5rem" }, { titel: "Ignorieren", breite: "5.5rem" }]}>
              {checkliste.map((c) => {
                const liste = vorschlaege(c);
                const listenId = liste.length ? `k-check-${c.zeile}` : undefined;
                const kasten = { width: "1.1rem", height: "1.1rem", accentColor: "var(--k-marke)" };
                return (
                  <tr key={c.zeile} style={c.ignorieren ? { opacity: 0.55 } : undefined}>
                    <td style={{ padding: "0.4rem 0.6rem", textDecoration: c.erledigt ? "line-through" : undefined }}>{c.aufgabe || <span className="k-leise">(ohne Text)</span>}</td>
                    <td>
                      <input className="k-eingabe" list={listenId} aria-label={`${c.aufgabe ?? "Punkt " + c.zeile}: Eingabe`} value={c.wert ?? ""} disabled={c.ignorieren} onChange={(e) => aendern(c.zeile, { wert: e.target.value || null })} />
                      {listenId ? (
                        <datalist id={listenId}>
                          {liste.map((v) => (
                            <option key={v} value={v} />
                          ))}
                        </datalist>
                      ) : null}
                    </td>
                    <td className="text-center">
                      <input type="checkbox" style={kasten} aria-label={`${c.aufgabe ?? "Punkt " + c.zeile}: erledigt`} checked={c.erledigt} onChange={(e) => aendern(c.zeile, { erledigt: e.target.checked })} />
                    </td>
                    <td className="text-center">
                      <input type="checkbox" style={kasten} aria-label={`${c.aufgabe ?? "Punkt " + c.zeile}: ignorieren`} checked={c.ignorieren} onChange={(e) => aendern(c.zeile, { ignorieren: e.target.checked })} />
                    </td>
                  </tr>
                );
              })}
            </Tabelle>
          </div>
        )}
      </Karte>
    </div>
  );
});
