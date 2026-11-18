"use client";
// Pflege der Firmenangaben und festen Drucktexte (Tabelle app.einstellungen). Speichern darf nur der Admin.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { speichereEinstellungen } from "@/lib/aktionen";
import { FIRMA_FELDER, FIRMA_VORGABE, type FirmaSchluessel } from "@/lib/firma";
import { Feld, Hinweis, Karte, Knopf, Textbereich } from "@/components/neu/ui";

type Werte = Record<FirmaSchluessel, string>;
const GRUPPEN: { gruppe: (typeof FIRMA_FELDER)[number]["gruppe"]; titel: string }[] = [
  { gruppe: "Firma", titel: "Firma (Briefkopf)" },
  { gruppe: "Fußzeile", titel: "Fußzeile" },
  { gruppe: "Texte", titel: "Feste Texte in den Ausdrucken" },
];

export function FirmaFormular({ werte, darfSpeichern }: { werte: Werte; darfSpeichern: boolean }) {
  const router = useRouter();
  const [w, setW] = useState<Werte>(werte);
  const [gespeichert, setGespeichert] = useState<Werte>(werte);
  const [laeuft, setLaeuft] = useState(false);
  const [meldung, setMeldung] = useState<{ art: "erfolg" | "fehler"; text: string } | null>(null);
  const geaendert = FIRMA_FELDER.filter((f) => w[f.schluessel] !== gespeichert[f.schluessel]).map((f) => f.schluessel);

  async function speichere() {
    if (laeuft || !darfSpeichern || geaendert.length === 0) return;
    setLaeuft(true);
    setMeldung(null);
    const stand = w;
    try {
      const r = await speichereEinstellungen(Object.fromEntries(geaendert.map((k) => [k, stand[k]])));
      if (r.ok) {
        // Geleerte Felder fallen auf dem Server auf die Vorgabe zurück; das Formular zeigt das sofort.
        const neu = { ...stand };
        for (const k of geaendert) if (!stand[k].trim()) neu[k] = FIRMA_VORGABE[k];
        setW((jetzt) => (jetzt === stand ? neu : jetzt));
        setGespeichert(neu);
        setMeldung({ art: "erfolg", text: "Gespeichert. Die Angaben gelten ab sofort für alle Ausdrucke." });
        router.refresh();
      } else {
        setMeldung({ art: "fehler", text: r.fehler });
      }
    } catch {
      setMeldung({ art: "fehler", text: "Die Angaben konnten nicht gespeichert werden. Bitte Verbindung prüfen und gegebenenfalls neu anmelden. Die Eingaben bleiben erhalten." });
    }
    setLaeuft(false);
  }

  return (
    <form
      noValidate
      className="flex max-w-4xl flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void speichere();
      }}
    >
      {darfSpeichern ? (
        <Hinweis>Ein geleertes Feld fällt nach dem Speichern auf die Vorgabe zurück (Felder ohne Vorgabe bleiben leer).</Hinweis>
      ) : (
        <Hinweis art="warnung">Nur der Admin darf die Firmenangaben ändern. Sie sehen die Angaben hier zur Ansicht.</Hinweis>
      )}
      {GRUPPEN.map((g) => (
        <Karte key={g.gruppe} titel={g.titel}>
          <div className="k-raster">
            {FIRMA_FELDER.filter((f) => f.gruppe === g.gruppe).map((f) => {
              const gemeinsam = { label: f.titel, hinweis: f.hilfe ?? null, wert: w[f.schluessel], onWert: (x: string | null) => setW((alt) => ({ ...alt, [f.schluessel]: x ?? "" })), readOnly: !darfSpeichern };
              return f.lang ? <Textbereich key={f.schluessel} rows={3} maxLength={8000} {...gemeinsam} /> : <Feld key={f.schluessel} className={f.schluessel === "fusszeile_zusatz" ? undefined : "k-s6"} maxLength={500} {...gemeinsam} />;
            })}
          </div>
        </Karte>
      ))}
      {meldung ? <Hinweis art={meldung.art}>{meldung.text}</Hinweis> : null}
      {darfSpeichern ? (
        <div className="flex flex-wrap items-center gap-3">
          <Knopf art="primaer" type="submit" disabled={laeuft || geaendert.length === 0} aria-busy={laeuft}>
            {laeuft ? "Speichert …" : "Speichern"}
          </Knopf>
          {geaendert.length > 0 ? (
            <>
              <Knopf art="still" onClick={() => setW(gespeichert)} disabled={laeuft}>
                Änderungen verwerfen
              </Knopf>
              <span className="k-speicherstatus" data-zustand="offen">
                Ungespeicherte Änderungen
              </span>
            </>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
