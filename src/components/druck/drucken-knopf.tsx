"use client";

export function DruckLeiste({ zurueck, hinweis }: { zurueck: string; hinweis?: string }) {
  return (
    <div className="d-leiste">
      <button type="button" className="d-knopf d-knopf-haupt" onClick={() => window.print()}>
        Drucken oder als PDF speichern
      </button>
      <a className="d-knopf" href={zurueck}>
        Zurück zur App
      </a>
      <span className="d-leiste-hinweis">{hinweis ?? "Im Druckdialog „Kopf- und Fußzeilen“ abwählen, dann ist das Blatt sauber."}</span>
    </div>
  );
}
