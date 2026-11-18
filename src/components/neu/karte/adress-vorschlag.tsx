"use client";
// Textfeld mit Adress-Autovervollständigung (Combobox-Muster nach WAI-ARIA).
// Es geht nur der getippte Text an /api/karte/vorschlag – sonst nichts.
import { useEffect, useId, useRef, useState } from "react";
import { FeldRahmen } from "@/components/neu/ui";

export type AdressAuswahl = { strasse: string; plz: string; ort: string; lkz?: string };
export type AdressVorschlagProps = {
  wert: string;
  onWert: (s: string) => void;
  onAuswahl: (a: AdressAuswahl) => void;
  id?: string;
  label?: string;
  platzhalter?: string;
};

type Treffer = { label: string; strasse: string; plz: string; ort: string; lkz: string };

const WARTEZEIT_MS = 300;
const AB_ZEICHEN = 3;

export function AdressVorschlag({ wert, onWert, onAuswahl, id, label, platzhalter }: AdressVorschlagProps) {
  const eigeneId = useId();
  const feldId = id ?? `adr-${eigeneId}`;
  const listeId = `${feldId}-liste`;
  const [treffer, setTreffer] = useState<Treffer[]>([]);
  const [offen, setOffen] = useState(false);
  const [aktiv, setAktiv] = useState(-1);
  const [laedt, setLaedt] = useState(false);
  const [meldung, setMeldung] = useState<string | null>(null);
  const zeit = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abbruch = useRef<AbortController | null>(null);

  function stoppe() {
    if (zeit.current) clearTimeout(zeit.current);
    zeit.current = null;
    abbruch.current?.abort();
    abbruch.current = null;
  }
  useEffect(() => stoppe, []);

  function schliesse() {
    setOffen(false);
    setAktiv(-1);
  }

  function suche(text: string) {
    stoppe();
    setMeldung(null);
    const q = text.trim().slice(0, 120);
    if (q.length < AB_ZEICHEN) {
      setTreffer([]);
      setLaedt(false);
      schliesse();
      return;
    }
    setLaedt(true);
    zeit.current = setTimeout(async () => {
      const ac = new AbortController();
      abbruch.current = ac;
      try {
        const r = await fetch(`/api/karte/vorschlag?q=${encodeURIComponent(q)}`, { signal: ac.signal, cache: "no-store" });
        const j = (await r.json().catch(() => null)) as { treffer?: Treffer[]; fehler?: string } | null;
        if (ac.signal.aborted) return;
        const liste = Array.isArray(j?.treffer) ? j.treffer.slice(0, 6) : [];
        setTreffer(liste);
        setAktiv(-1);
        setMeldung(!r.ok ? (j?.fehler ?? "Vorschläge sind gerade nicht verfügbar.") : liste.length === 0 ? "Keine Vorschläge – Adresse bitte von Hand eintragen." : null);
        setOffen(true);
      } catch {
        if (ac.signal.aborted) return;
        setTreffer([]);
        setMeldung("Vorschläge sind gerade nicht verfügbar.");
        setOffen(true);
      } finally {
        if (!ac.signal.aborted) setLaedt(false);
      }
    }, WARTEZEIT_MS);
  }

  function waehle(t: Treffer) {
    stoppe();
    setLaedt(false);
    setTreffer([]);
    setMeldung(null);
    schliesse();
    // Erst das Feld selbst, dann die ganze Adresse (die Maske setzt damit Straße, PLZ und Ort).
    onWert(t.strasse);
    onAuswahl({ strasse: t.strasse, plz: t.plz, ort: t.ort, ...(t.lkz ? { lkz: t.lkz } : {}) });
  }

  function taste(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (treffer.length === 0) return;
      e.preventDefault();
      if (!offen) {
        setOffen(true);
        setAktiv(e.key === "ArrowDown" ? 0 : treffer.length - 1);
        return;
      }
      const schritt = e.key === "ArrowDown" ? 1 : -1;
      setAktiv((i) => (i + schritt + treffer.length + (i < 0 && schritt < 0 ? 1 : 0)) % treffer.length);
    } else if (e.key === "Enter") {
      if (offen && aktiv >= 0 && treffer[aktiv]) {
        e.preventDefault();
        waehle(treffer[aktiv]);
      }
    } else if (e.key === "Escape") {
      if (offen) {
        e.preventDefault();
        e.stopPropagation();
        schliesse();
      }
    } else if (e.key === "Tab") {
      schliesse();
    }
  }

  const zeigeListe = offen && (treffer.length > 0 || !!meldung);

  const eingabe = (
    <div className="relative">
      <input
        id={feldId}
        type="text"
        role="combobox"
        aria-label={!label && !id ? (platzhalter ?? "Straße und Hausnummer") : undefined}
        aria-expanded={zeigeListe}
        aria-controls={listeId}
        aria-autocomplete="list"
        aria-activedescendant={zeigeListe && aktiv >= 0 ? `${listeId}-${aktiv}` : undefined}
        aria-busy={laedt}
        autoComplete="off"
        spellCheck={false}
        maxLength={120}
        value={wert}
        placeholder={platzhalter}
        onChange={(e) => {
          onWert(e.target.value);
          suche(e.target.value);
        }}
        onKeyDown={taste}
        onFocus={() => {
          if (treffer.length > 0) setOffen(true);
        }}
        onBlur={schliesse}
        className="k-eingabe"
      />
      {zeigeListe ? (
        <ul
          id={listeId}
          role="listbox"
          aria-label="Adressvorschläge"
          className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-auto py-1"
          style={{
            border: "1px solid var(--k-rahmen-stark, #a7a7a7)",
            borderRadius: "var(--k-radius, 6px)",
            background: "var(--k-flaeche, #fff)",
            color: "var(--k-text, #1f1f1f)",
            boxShadow: "var(--k-schatten-gross, 0 8px 24px rgb(0 0 0 / 0.18))",
            fontSize: "var(--k-text-m, 0.875rem)",
            listStyle: "none",
            margin: "0.25rem 0 0",
            padding: "0.25rem 0",
          }}
          // Klick in die Liste darf dem Feld nicht den Fokus nehmen (sonst schließt onBlur vor der Auswahl).
          onMouseDown={(e) => e.preventDefault()}
        >
          {treffer.map((t, i) => (
            <li
              key={`${t.label}-${i}`}
              id={`${listeId}-${i}`}
              role="option"
              aria-selected={i === aktiv}
              className="cursor-pointer px-3 py-2"
              style={i === aktiv ? { background: "var(--k-marke-hell, #fdecee)", boxShadow: "inset 3px 0 0 var(--k-marke, #e1001a)" } : undefined}
              onMouseEnter={() => setAktiv(i)}
              onClick={() => waehle(t)}
            >
              {t.label}
            </li>
          ))}
          {meldung ? (
            <li role="presentation" className="px-3 py-2" style={{ color: "var(--k-text-3, #6b6b6b)" }}>
              {meldung}
            </li>
          ) : null}
        </ul>
      ) : null}
      <span className="sr-only" role="status" aria-live="polite">
        {zeigeListe && treffer.length > 0 ? `${treffer.length} Vorschläge` : ""}
      </span>
    </div>
  );

  if (!label) return eingabe;
  return (
    <FeldRahmen label={label} htmlFor={feldId}>
      {eingabe}
    </FeldRahmen>
  );
}
