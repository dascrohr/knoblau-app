"use client";
// Suchfeld + Filter für Listen. Schreibt GET-Parameter in die Adresse (Enter sofort, Tippen entprellt).
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Auswahl, Feld, Knopf, type AuswahlOption } from "./ui";

export type SuchFilter = { name: string; label: string; leer: string; optionen: AuswahlOption[] };

export function Suchleiste({ q, platzhalter, filter = [], werte = {} }: { q: string; platzhalter: string; filter?: SuchFilter[]; werte?: Record<string, string> }) {
  const router = useRouter();
  const pfad = usePathname();
  const [text, setText] = useState(q);
  const [laedt, starte] = useTransition();
  const uhr = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aktuell = useRef({ q, werte });
  useEffect(() => {
    aktuell.current = { q, werte };
  });
  useEffect(() => () => void (uhr.current && clearTimeout(uhr.current)), []);

  function gehe(aenderung: Record<string, string>) {
    if (uhr.current) clearTimeout(uhr.current);
    const alle: Record<string, string> = { q: text, ...aktuell.current.werte, ...aenderung };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(alle)) if (v.trim()) p.set(k, v.trim());
    const ziel = p.size ? `${pfad}?${p}` : pfad;
    starte(() => router.replace(ziel, { scroll: false }));
  }

  const gefiltert = !!q || Object.values(werte).some(Boolean);
  return (
    <form
      role="search"
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        gehe({});
      }}
    >
      <Feld
        label="Suche"
        type="search"
        name="q"
        className="min-w-[14rem] flex-1"
        placeholder={platzhalter}
        wert={text}
        onWert={(w) => {
          const neu = w ?? "";
          setText(neu);
          if (uhr.current) clearTimeout(uhr.current);
          uhr.current = setTimeout(() => gehe({ q: neu }), 350);
        }}
      />
      {filter.map((f) => (
        <Auswahl key={f.name} label={f.label} name={f.name} className="w-40" leer={f.leer} optionen={f.optionen} wert={werte[f.name] ?? ""} onWert={(w) => gehe({ [f.name]: w ?? "" })} />
      ))}
      <Knopf type="submit" art="sekundaer">
        Suchen
      </Knopf>
      {gefiltert ? (
        <Knopf
          art="still"
          onClick={() => {
            setText("");
            if (uhr.current) clearTimeout(uhr.current);
            starte(() => router.replace(pfad, { scroll: false }));
          }}
        >
          Zurücksetzen
        </Knopf>
      ) : null}
      <span className="k-leise self-center text-xs" role="status" aria-live="polite" style={{ minWidth: "4.5rem" }}>
        {laedt ? "Sucht …" : ""}
      </span>
    </form>
  );
}
