"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { Knopf } from "./ui";

/** Modaler Dialog mit Titelzeile und „Schließen“. Schließt auch mit Esc und Klick neben den Dialog. Inhalt füllt die Höhe (flex-Spalte). */
export function Dialog({ titel, onZu, children }: { titel: string; onZu: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog ref={dialog} className="k-dialog" aria-label={titel} onClose={onZu} onClick={(e) => e.target === dialog.current && dialog.current?.close()}>
      <div className="k-karte-kopf">
        <h2 className="k-karte-titel">{titel}</h2>
        <Knopf klein art="still" onClick={() => dialog.current?.close()}>
          Schließen
        </Knopf>
      </div>
      {children}
    </dialog>
  );
}
