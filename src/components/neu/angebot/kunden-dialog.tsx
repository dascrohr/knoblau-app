"use client";
// Dialog „Aus Kundenstamm“: sucht Kunden auf dem Server (entprellt) und gibt den gewählten Treffer zurück.
import { useEffect, useRef, useState } from "react";
import { sucheKunden, type KundenTreffer } from "@/lib/aktionen";
import { adressName } from "@/lib/angebot-typen";
import { Dialog } from "../dialog";
import { Abzeichen } from "../ui";

export type { KundenTreffer };

export function KundenDialog({ onWahl, onZu }: { onWahl: (k: KundenTreffer) => void; onZu: () => void }) {
  const [q, setQ] = useState("");
  const [treffer, setTreffer] = useState<KundenTreffer[] | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const lauf = useRef(0);
  const text = q.trim();
  const zuKurz = text.length < 2;

  useEffect(() => {
    const nr = ++lauf.current;
    if (text.length < 2) return;
    const t = setTimeout(async () => {
      setLaedt(true);
      try {
        const r = await sucheKunden(text);
        if (nr !== lauf.current) return;
        setTreffer(r);
        setFehler(null);
      } catch {
        if (nr === lauf.current) setFehler("Die Suche hat nicht geklappt. Bitte Verbindung prüfen und erneut versuchen.");
      } finally {
        if (nr === lauf.current) setLaedt(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [text]);

  return (
    <Dialog titel="Auftraggeber aus dem Kundenstamm übernehmen" onZu={onZu}>
      <div className="px-4 pt-3">
        <input
          className="k-eingabe"
          type="search"
          autoFocus
          aria-label="Im Kundenstamm suchen"
          placeholder="Name, Firma oder Ort …"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !zuKurz && !laedt && treffer?.length === 1) {
              e.preventDefault();
              onWahl(treffer[0]);
            }
          }}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2" style={{ minHeight: "10rem" }} aria-live="polite">
        {fehler ? (
          <p className="k-feldfehler p-3" role="alert">
            {fehler}
          </p>
        ) : zuKurz ? (
          <p className="k-leise p-3">Bitte mindestens zwei Zeichen eingeben.</p>
        ) : treffer == null ? (
          <p className="k-leise p-3">Sucht …</p>
        ) : treffer.length === 0 ? (
          <p className="k-leise p-3">{laedt ? "Sucht …" : "Kein Kunde passt zur Suche. Sie können die Adresse von Hand eintragen."}</p>
        ) : (
          <ul className="flex flex-col" style={{ opacity: laedt ? 0.6 : 1 }}>
            {treffer.map((k) => (
              <li key={k.id}>
                <button type="button" className="flex w-full items-center justify-between gap-4 rounded-md px-3 py-2 text-left hover:bg-[var(--k-flaeche-3)]" style={{ minHeight: "2.75rem" }} onClick={() => onWahl(k)}>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{adressName(k) || "ohne Namen"}</span>
                    <span className="k-leise block truncate text-xs">{[k.strasse, [k.plz, k.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "ohne Anschrift"}</span>
                  </span>
                  {k.art === "firma" ? <Abzeichen art="info">Firma</Abzeichen> : <Abzeichen>Privat</Abzeichen>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="k-leise px-4 pb-3 text-xs">Höchstens 20 Treffer. Übernommen wird die Anschrift; Telefon, Mobil, Fax, E-Mail und Zahlungsbedingung nur, wenn sie im Angebot noch leer sind.</p>
    </Dialog>
  );
}
