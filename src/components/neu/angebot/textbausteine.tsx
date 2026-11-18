"use client";
// „Textbaustein einfügen“ an den großen Textfeldern der Angebotsmaske.
// Die Bausteine kommen über einen Kontext aus der Maske; je Feld werden die zum Bereich passenden zuerst gezeigt.
import { createContext, useContext, useMemo, useState } from "react";
import { TEXTBAUSTEIN_BEREICHE } from "@/app/neu/stammdaten/konfig";
import { Dialog } from "../dialog";
import { Abzeichen, Knopf } from "../ui";

export type Textbaustein = { id: number; bereich: string | null; titel: string; text: string | null };
export type TextbausteinBereich = "vereinbarungen" | "handwerker" | "packarbeit" | "frei" | "termine" | "intern" | "zahlungsbedingung";

const Kontext = createContext<Textbaustein[]>([]);
export const TextbausteinAnbieter = Kontext.Provider;

const BEKANNT = new Set(TEXTBAUSTEIN_BEREICHE.map((b) => b.wert));
function bereichVon(b: Textbaustein): string {
  const w = (b.bereich ?? "").trim().toLowerCase();
  return BEKANNT.has(w) ? w : "allgemein";
}
function bereichTitel(wert: string): string {
  return TEXTBAUSTEIN_BEREICHE.find((b) => b.wert === wert)?.text ?? wert;
}

type Props = {
  bereich: TextbausteinBereich;
  /** Aktueller Feldinhalt. */
  wert: string | null;
  onWert: (wert: string | null) => void;
  /** Baustein ersetzt den Inhalt (einzeilige Felder wie die Zahlungsbedingung); sonst wird er unten angehängt. */
  ersetzen?: boolean;
  className?: string;
};

export function TextbausteinKnopf({ bereich, wert, onWert, ersetzen, className }: Props) {
  const [offen, setOffen] = useState(false);
  const waehle = (b: Textbaustein) => {
    const text = (b.text ?? "").trim() || b.titel;
    if (ersetzen) onWert(text.replace(/\s+/g, " "));
    else onWert(wert && wert.trim() ? `${wert.replace(/\s+$/, "")}\n${text}` : text);
    setOffen(false);
  };
  return (
    <span className={className}>
      <Knopf klein art="still" className="k-baustein-knopf" onClick={() => setOffen(true)} title={ersetzen ? "Ersetzt den Inhalt des Feldes durch einen Textbaustein" : "Hängt einen Textbaustein am Ende des Feldes an"}>
        + Textbaustein einfügen
      </Knopf>
      {offen ? <BausteinDialog bereich={bereich} ersetzen={ersetzen} onWahl={waehle} onZu={() => setOffen(false)} /> : null}
    </span>
  );
}

function BausteinDialog({ bereich, ersetzen, onWahl, onZu }: { bereich: TextbausteinBereich; ersetzen?: boolean; onWahl: (b: Textbaustein) => void; onZu: () => void }) {
  const alle = useContext(Kontext);
  const [suche, setSuche] = useState("");
  const { passend, andere } = useMemo(() => {
    const s = suche.trim().toLowerCase();
    const treffer = s ? alle.filter((b) => `${b.titel} ${b.text ?? ""}`.toLowerCase().includes(s)) : alle;
    return { passend: treffer.filter((b) => bereichVon(b) === bereich), andere: treffer.filter((b) => bereichVon(b) !== bereich) };
  }, [alle, suche, bereich]);

  const liste = (eintraege: Textbaustein[], mitBereich: boolean) => (
    <ul className="flex flex-col">
      {eintraege.map((b) => (
        <li key={b.id}>
          <button type="button" className="flex w-full items-start justify-between gap-4 rounded-md px-3 py-2 text-left hover:bg-[var(--k-flaeche-3)]" style={{ minHeight: "2.75rem" }} onClick={() => onWahl(b)}>
            <span className="min-w-0">
              <span className="block font-semibold">{b.titel}</span>
              {b.text ? (
                <span className="k-leise block text-xs" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {b.text}
                </span>
              ) : null}
            </span>
            {mitBereich ? <Abzeichen>{bereichTitel(bereichVon(b))}</Abzeichen> : null}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <Dialog titel={`Textbaustein ${ersetzen ? "übernehmen" : "einfügen"}: ${bereichTitel(bereich)}`} onZu={onZu}>
      {alle.length === 0 ? (
        <div className="p-4">
          <p>Es sind noch keine Textbausteine hinterlegt.</p>
          <p className="mt-2">
            <a href="/neu/stammdaten/textbausteine" target="_blank" rel="noopener" className="k-link">
              Textbausteine anlegen
            </a>{" "}
            <span className="k-leise">(öffnet in einem neuen Fenster; neue Bausteine erscheinen hier nach dem nächsten Speichern oder Neuladen)</span>
          </p>
        </div>
      ) : (
        <>
          <div className="px-4 pt-3">
            <input
              className="k-eingabe"
              type="search"
              autoFocus
              aria-label="Textbausteine durchsuchen"
              placeholder="Suchen …"
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && passend.length + andere.length === 1) {
                  e.preventDefault();
                  onWahl(passend[0] ?? andere[0]);
                }
              }}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2" style={{ minHeight: "8rem" }}>
            {passend.length + andere.length === 0 ? <p className="k-leise p-3">Kein Textbaustein passt zur Suche.</p> : null}
            {passend.length ? (
              <>
                <h3 className="k-untertitel px-3 pt-2 pb-1">Passend zu „{bereichTitel(bereich)}“</h3>
                {liste(passend, false)}
              </>
            ) : null}
            {andere.length ? (
              <>
                <h3 className="k-untertitel px-3 pt-3 pb-1">{passend.length ? "Alle anderen" : "Alle Textbausteine"}</h3>
                {liste(andere, true)}
              </>
            ) : null}
          </div>
          <p className="k-leise px-4 pb-3 text-xs">{ersetzen ? "Der Baustein ersetzt den Inhalt des Feldes." : "Der Baustein wird am Ende des Feldes angehängt."} Pflege unter Stammdaten → Textbausteine.</p>
        </>
      )}
    </Dialog>
  );
}
