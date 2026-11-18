"use client";
// Dialoge der Angebotsmaske im Altstil: Adresse aus Kundenstamm, Textbausteine.
import { useEffect, useId, useRef, useState } from "react";
import { sucheKunden, type KundenTreffer } from "@/lib/aktionen";
import type { Angebot } from "@/lib/angebot-typen";
import { useMaske, type ATextSpalte, type Textbaustein } from "./felder";

function Dialog({ titel, onZu, children }: { titel: string; onZu: () => void; children: React.ReactNode }) {
  return (
    <div className="schleier" onClick={onZu} onKeyDown={(e) => { if (e.key === "Escape") onZu(); }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={titel} onClick={(e) => e.stopPropagation()}>
        <div className="titel"><span>{titel}</span><button type="button" className="knopf klein" onClick={onZu} aria-label="Schließen">✕</button></div>
        <div className="koerper">{children}</div>
      </div>
    </div>
  );
}

const kundenName = (k: KundenTreffer) => [[k.name, k.vorname].filter(Boolean).join(", "), k.name1].filter(Boolean).join(" · ");

/** „Adresse aus Kundenstamm“: Suche im Kundenstamm (ab 2 Zeichen, entprellt), Auswahl per Knopf oder Doppelklick. */
export function KundenDialog({ onWahl, onZu }: { onWahl: (k: KundenTreffer) => void; onZu: () => void }) {
  const [q, setQ] = useState("");
  const [ergebnis, setErgebnis] = useState<{ q: string; treffer: KundenTreffer[]; fehler: boolean } | null>(null);
  const id = useId();
  const lauf = useRef(0);
  const text = q.trim();
  const genug = text.length >= 2;

  useEffect(() => {
    if (!genug) return;
    const nr = ++lauf.current;
    const t = setTimeout(() => {
      sucheKunden(text)
        .then((treffer) => { if (lauf.current === nr) setErgebnis({ q: text, treffer, fehler: false }); })
        .catch(() => { if (lauf.current === nr) setErgebnis({ q: text, treffer: [], fehler: true }); });
    }, 300);
    return () => clearTimeout(t);
  }, [text, genug]);

  const aktuell = genug && ergebnis?.q === text ? ergebnis : null;
  const treffer = aktuell?.treffer ?? [];
  return (
    <Dialog titel="Adresse aus Kundenstamm" onZu={onZu}>
      <div className="suchzeile">
        <label htmlFor={id}>Suche (Name, Firma, Straße, PLZ, Ort)</label>
        <input id={id} type="text" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        <span>{!genug ? "" : aktuell ? `${treffer.length} Treffer${treffer.length >= 20 ? " (höchstens 20 – Suche verfeinern)" : ""}` : "Suche läuft …"}</span>
      </div>
      {!genug ? (
        <p className="hinweistext">Bitte mindestens zwei Zeichen eingeben.</p>
      ) : aktuell?.fehler ? (
        <p className="hinweistext">Die Suche ist fehlgeschlagen. Bitte Verbindung und Anmeldung prüfen.</p>
      ) : aktuell && treffer.length === 0 ? (
        <p className="hinweistext">Keine Kunden gefunden.</p>
      ) : treffer.length > 0 ? (
        <table className="tab">
          <thead><tr><th>Kundennr.</th><th>Name</th><th>Straße</th><th>PLZ</th><th>Ort</th><th /></tr></thead>
          <tbody>
            {treffer.map((k) => (
              <tr key={k.id} className="klick" onDoubleClick={() => onWahl(k)}>
                <td>{k.kundennr ?? ""}</td>
                <td>{kundenName(k)}</td>
                <td>{k.strasse}</td>
                <td>{k.plz}</td>
                <td>{k.ort}</td>
                <td><button type="button" className="knopf klein" onClick={() => onWahl(k)}>Übernehmen</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <p className="hinweistext">Die Auswahl überschreibt die Auftraggeber-Adresse. Telefon, Mobil, Fax und E-Mail werden nur gefüllt, wenn sie im Angebot leer sind.</p>
    </Dialog>
  );
}

const BEREICH_TITEL: Record<string, string> = { vereinbarungen: "Vereinbarungen", handwerker: "Handwerker", packarbeit: "Packleistungen", frei: "Freie Leistung" };

function BausteinDialog({ bereich, liste, onWahl, onZu }: { bereich: string; liste: Textbaustein[]; onWahl: (b: Textbaustein) => void; onZu: () => void }) {
  const sortiert = [...liste.filter((b) => b.bereich === bereich), ...liste.filter((b) => b.bereich !== bereich)];
  return (
    <Dialog titel="Textbaustein einfügen" onZu={onZu}>
      {sortiert.length === 0 ? (
        <p className="hinweistext">Noch keine Textbausteine angelegt (Stammdaten → Datenbestände pflegen)</p>
      ) : (
        <>
          <p className="hinweistext">Der gewählte Text wird an das Ende des Feldes angehängt.</p>
          <table className="tab">
            <thead><tr><th>Bereich</th><th>Titel</th><th>Text</th><th /></tr></thead>
            <tbody>
              {sortiert.map((b) => (
                <tr key={b.id} className="klick" onDoubleClick={() => { if (b.text) onWahl(b); }}>
                  <td>{b.bereich ? (BEREICH_TITEL[b.bereich] ?? b.bereich) : ""}</td>
                  <td>{b.titel}</td>
                  <td style={{ whiteSpace: "pre-wrap" }}>{b.text}</td>
                  <td><button type="button" className="knopf klein" disabled={!b.text} onClick={() => onWahl(b)}>Einfügen</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Dialog>
  );
}

/** Knopf „Textbaustein einfügen“ für ein großes Textfeld des Angebots; hängt den gewählten Baustein ans Feldende an. */
export function BausteinKnopf({ spalte, bereich, children }: { spalte: ATextSpalte; bereich: "vereinbarungen" | "handwerker" | "packarbeit" | "frei"; children: React.ReactNode }) {
  const m = useMaske();
  const [offen, setOffen] = useState(false);
  const einfuegen = (b: Textbaustein) => {
    if (!b.text) return;
    const alt = (m.z.angebot[spalte] ?? "").replace(/\s+$/, "");
    m.setA({ [spalte]: alt ? `${alt}\n${b.text}` : b.text } as Partial<Angebot>);
    setOffen(false);
  };
  return (
    <>
      <button type="button" className="knopf" disabled={m.lesen} onClick={() => setOffen(true)}>{children}</button>
      {offen && !m.lesen && <BausteinDialog bereich={bereich} liste={m.bausteine} onWahl={einfuegen} onZu={() => setOffen(false)} />}
    </>
  );
}
