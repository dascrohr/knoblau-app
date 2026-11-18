"use client";
// Eingabetabelle für Positionen (Beladen, Befördern, Entladen, Freie Leistung, Nebenleistung, Packmaterial)
// und der Auswahl-Dialog „aus Stammdaten“.
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { leerePosition, type Position } from "@/lib/angebot-typen";
import { formatBetrag, zeilenSumme, type Bereich } from "@/lib/preis";
import { Abzeichen, Knopf, Tabelle, ZahlEingabe, type Spalte } from "../ui";

export type StammEintrag = {
  id: number;
  text: string;
  suchbegriff: string | null;
  beschreibung: string | null;
  /** Felder, die in die Zeile übernommen werden. */
  werte: Partial<Position>;
};

type Props = {
  bereich: Bereich;
  /** Name des Bereichs für Screenreader, z. B. "Beladen". */
  name: string;
  /** Zeilennummern, die angezeigt werden (auch leere). */
  zeilen: number[];
  /** Befüllte Positionen dieses Bereichs. */
  positionen: Position[];
  onAendern: (zeile: number, aenderung: Partial<Position>) => void;
  /** Mit Entfernen-Knopf je Zeile (für Bereiche mit „Zeile hinzufügen“). */
  onEntfernen?: (zeile: number) => void;
  /** Mit Knopf „aus Stammdaten“ je Zeile. */
  stamm?: StammEintrag[];
  stammTitel?: string;
  /** Packmaterial: Spalte Verkauf/Leihe, keine Spalte Anzahl (Stück steht in `einheiten`). */
  packmaterial?: boolean;
  /** Spalte Beschreibung unter dem Text (Freie Leistung). */
  mitBeschreibung?: boolean;
  einheitenTitel?: string;
  summenText?: string;
  /** Zeilen ohne Preis als Hinweistext kennzeichnen. */
  hinweistexte?: boolean;
  leerText?: string;
};

export const PositionsTabelle = memo(function PositionsTabelle({ bereich, name, zeilen, positionen, onAendern, onEntfernen, stamm, stammTitel, packmaterial, mitBeschreibung, einheitenTitel = "Std/Stck", summenText, hinweistexte, leerText }: Props) {
  const [stammFuer, setStammFuer] = useState<number | null>(null);
  const nachZeile = useMemo(() => new Map(positionen.map((p) => [p.zeile, p])), [positionen]);
  const summe = positionen.reduce((s, p) => s + zeilenSumme(p), 0);
  const mitAktion = !!(stamm || onEntfernen);

  const spalten: Spalte[] = [
    { titel: "Nr.", breite: "2.25rem" },
    ...(packmaterial ? [] : [{ titel: "Anzahl", rechts: true, breite: "4.75rem" }]),
    { titel: packmaterial ? "Packmaterial" : "Text" },
    ...(packmaterial ? [{ titel: "Verkauf/Leihe", breite: "7.5rem" }] : []),
    { titel: packmaterial ? "Stück" : einheitenTitel, rechts: true, breite: "5.25rem" },
    { titel: "Einzelpreis €", rechts: true, breite: "7rem" },
    { titel: "+/- %", rechts: true, breite: "4.75rem" },
    { titel: "Gesamt €", rechts: true, breite: "7rem" },
    ...(mitAktion ? [{ titel: "Aktionen", versteckt: true, breite: stamm && onEntfernen ? "8.5rem" : stamm ? "6.5rem" : "2.5rem" }] : []),
  ];
  const spaltenzahl = spalten.length;

  if (zeilen.length === 0) return <p className="k-leise px-1 py-2">{leerText ?? "Noch keine Zeilen."}</p>;

  return (
    <>
      <Tabelle
        eingabe
        beschriftung={name}
        spalten={spalten}
        fuss={
          <tr>
            <td colSpan={spaltenzahl - (mitAktion ? 2 : 1)} className="k-rechts">
              {summenText ?? `Summe ${name}`}
            </td>
            <td className="k-rechts" style={{ paddingRight: "0.9rem" }}>
              {formatBetrag(summe)}
            </td>
            {mitAktion ? <td /> : null}
          </tr>
        }
      >
        {zeilen.map((z) => {
          const p = nachZeile.get(z) ?? leerePosition(bereich, z);
          const gesamt = zeilenSumme(p);
          const istHinweis = !!(p.text && p.text.trim()) && !p.einzelpreis;
          const lbl = (feld: string) => `${name}, Zeile ${z}: ${feld}`;
          return (
            <tr key={z}>
              <td className="k-leise k-rechts">{z}</td>
              {packmaterial ? null : (
                <td>
                  <ZahlEingabe aria-label={lbl("Anzahl")} wert={p.anzahl} onWert={(n) => onAendern(z, { anzahl: n })} />
                </td>
              )}
              <td style={{ minWidth: "12rem" }}>
                <input className="k-eingabe" aria-label={lbl("Text")} value={p.text ?? ""} onChange={(e) => onAendern(z, { text: e.target.value || null })} />
                {mitBeschreibung ? (
                  <textarea
                    className="k-eingabe mt-1"
                    style={{ minHeight: "2.25rem" }}
                    rows={1}
                    aria-label={lbl("Beschreibung")}
                    placeholder="Beschreibung (optional)"
                    value={p.beschreibung ?? ""}
                    onChange={(e) => onAendern(z, { beschreibung: e.target.value || null })}
                  />
                ) : null}
              </td>
              {packmaterial ? (
                <td>
                  <select className="k-eingabe" aria-label={lbl("Verkauf oder Leihe")} value={p.art ?? ""} onChange={(e) => onAendern(z, { art: e.target.value || null })}>
                    <option value="">–</option>
                    {[...new Set(["Verkauf", "Leihe", ...(p.art ? [p.art] : [])])].map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </td>
              ) : null}
              <td>
                <ZahlEingabe aria-label={lbl(packmaterial ? "Stück" : einheitenTitel)} wert={p.einheiten} onWert={(n) => onAendern(z, { einheiten: n })} />
              </td>
              <td>
                <ZahlEingabe aria-label={lbl("Einzelpreis in Euro")} nachkomma={2} wert={p.einzelpreis} onWert={(n) => onAendern(z, { einzelpreis: n })} />
              </td>
              <td>
                <ZahlEingabe aria-label={lbl("Zu- oder Abschlag in Prozent")} wert={p.prozent} onWert={(n) => onAendern(z, { prozent: n })} />
              </td>
              <td className="k-rechts" style={{ paddingRight: "0.9rem" }}>
                {istHinweis && hinweistexte ? <Abzeichen art="info" title="Zeile ohne Preis: erscheint als Hinweistext im Angebot">Hinweistext</Abzeichen> : gesamt ? formatBetrag(gesamt) : <span className="k-leise">–</span>}
              </td>
              {mitAktion ? (
                <td>
                  <span className="flex items-center justify-end gap-1">
                    {stamm ? (
                      <Knopf klein art="still" aria-label={lbl("aus Stammdaten wählen")} onClick={() => setStammFuer(z)}>
                        Stammdaten
                      </Knopf>
                    ) : null}
                    {onEntfernen ? (
                      <Knopf klein art="still" aria-label={lbl("Zeile entfernen")} title="Zeile entfernen" onClick={() => onEntfernen(z)}>
                        ✕
                      </Knopf>
                    ) : null}
                  </span>
                </td>
              ) : null}
            </tr>
          );
        })}
      </Tabelle>
      {stamm && stammFuer != null ? (
        <StammDialog
          titel={stammTitel ?? "Aus Stammdaten übernehmen"}
          eintraege={stamm}
          onZu={() => setStammFuer(null)}
          onWahl={(e) => {
            onAendern(stammFuer, e.werte);
            setStammFuer(null);
          }}
        />
      ) : null}
    </>
  );
});

/** Dialog mit Suchfeld und Liste; Auswahl per Klick oder Enter. Schließen mit Esc. */
export function StammDialog({ titel, eintraege, onWahl, onZu }: { titel: string; eintraege: StammEintrag[]; onWahl: (e: StammEintrag) => void; onZu: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [suche, setSuche] = useState("");
  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);
  const treffer = useMemo(() => {
    const s = suche.trim().toLowerCase();
    if (!s) return eintraege;
    return eintraege.filter((e) => `${e.text} ${e.suchbegriff ?? ""} ${e.beschreibung ?? ""}`.toLowerCase().includes(s));
  }, [suche, eintraege]);
  return (
    <dialog ref={dialog} className="k-dialog" aria-label={titel} onClose={onZu} onClick={(e) => e.target === dialog.current && dialog.current?.close()}>
      <div className="k-karte-kopf">
        <h2 className="k-karte-titel">{titel}</h2>
        <Knopf klein art="still" onClick={() => dialog.current?.close()}>
          Schließen
        </Knopf>
      </div>
      <div className="px-4 pt-3">
        <input
          className="k-eingabe"
          type="search"
          autoFocus
          aria-label="In den Stammdaten suchen"
          placeholder="Suchen …"
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && treffer.length === 1) {
              e.preventDefault();
              onWahl(treffer[0]);
            }
          }}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2" style={{ minHeight: "8rem" }}>
        {eintraege.length === 0 ? (
          <p className="k-leise p-3">
            Es sind noch keine Stammdaten hinterlegt. Sie können sie unter „Stammdaten“ anlegen.
          </p>
        ) : treffer.length === 0 ? (
          <p className="k-leise p-3">Kein Eintrag passt zur Suche.</p>
        ) : (
          <ul className="flex flex-col">
            {treffer.map((e) => (
              <li key={e.id}>
                <button type="button" className="flex w-full items-baseline justify-between gap-4 rounded-md px-3 py-2 text-left hover:bg-[var(--k-flaeche-3)]" onClick={() => onWahl(e)}>
                  <span className="min-w-0">
                    <span className="font-semibold">{e.text || e.suchbegriff || "(ohne Text)"}</span>
                    {e.beschreibung ? <span className="k-leise block truncate text-xs">{e.beschreibung}</span> : null}
                  </span>
                  <span className="k-zahl">{e.werte.einzelpreis != null ? `${formatBetrag(e.werte.einzelpreis)} €` : <span className="k-leise">ohne Preis</span>}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </dialog>
  );
}
