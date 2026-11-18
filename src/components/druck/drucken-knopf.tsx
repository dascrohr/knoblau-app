"use client";

import { useEffect } from "react";

// Nutzbare Seitenhöhe im Druck: A4 (297 mm) minus @page-Ränder oben/unten (je 12 mm), siehe druck.css.
const SEITE_MM = 273;
const RAND_OBEN_MM = 12; // Bildschirm-Innenabstand oben, der im Druck der Seitenrand ist
const FUSS_MM = 24; // für die Fußzeile freigehaltener Platz (padding-bottom des Blatts im Druck)

/**
 * Schätzt die Seitenzahl des Blatts und legt sie als --d-seiten ab. Das Druck-CSS zieht das Blatt damit auf volle Seiten,
 * sodass die Fußzeile auf der letzten Seite unten steht. Schlägt die Messung fehl, bleibt es bei einer Seite
 * (längere Dokumente: Fußzeile dann direkt unter dem Inhalt).
 */
function seitenSetzen() {
  try {
    const blatt = document.querySelector<HTMLElement>(".druck .d-blatt");
    const inhalt = blatt?.querySelector<HTMLElement>(".d-inhalt");
    if (!blatt || !inhalt) return;
    const b = blatt.getBoundingClientRect();
    const mm = b.width / 210; // Blatt ist immer 210 mm breit, auch verkleinert
    if (!(mm > 0)) return;
    const hoehe = (inhalt.getBoundingClientRect().bottom - b.top) / mm - RAND_OBEN_MM + FUSS_MM;
    const seiten = Math.min(40, Math.max(1, Math.ceil((hoehe + 3) / SEITE_MM)));
    blatt.style.setProperty("--d-seiten", String(seiten));
  } catch {
    /* Druck funktioniert auch ohne */
  }
}

export type DruckAnsicht = { titel: string; href: string; aktiv?: boolean };

export function DruckLeiste({ zurueck, hinweis, ansichten }: { zurueck: string; hinweis?: string; ansichten?: DruckAnsicht[] }) {
  useEffect(() => {
    seitenSetzen();
    window.addEventListener("beforeprint", seitenSetzen);
    return () => window.removeEventListener("beforeprint", seitenSetzen);
  }, []);
  return (
    <div className="d-leiste">
      <button
        type="button"
        className="d-knopf d-knopf-haupt"
        onClick={() => {
          seitenSetzen();
          window.print();
        }}
      >
        Drucken oder als PDF speichern
      </button>
      {ansichten?.length ? (
        <nav className="d-umschalter" aria-label="Ansicht">
          {ansichten.map((a) => (
            <a key={a.href} href={a.href} className={a.aktiv ? "d-knopf d-knopf-aktiv" : "d-knopf"} aria-current={a.aktiv ? "page" : undefined}>
              {a.titel}
            </a>
          ))}
        </nav>
      ) : null}
      <a className="d-knopf" href={zurueck}>
        Zurück zur App
      </a>
      <span className="d-leiste-hinweis">{hinweis ?? "Im Druckdialog „Kopf- und Fußzeilen“ abwählen, dann ist das Blatt sauber."}</span>
    </div>
  );
}
