"use client";
// Routenberechnung für LKW mit Karte. An /api/karte/route gehen ausschließlich Straße, PLZ, Ort (und Land).
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { Hinweis, Knopf } from "@/components/neu/ui";

const KartenAnsicht = dynamic(() => import("./karten-ansicht").then((m) => m.KartenAnsicht), {
  ssr: false,
  loading: () => <div className="h-80 w-full" style={{ background: "var(--k-flaeche-3, #ebebeb)", borderRadius: "var(--k-radius, 6px)" }} />,
});

export type RoutenAdresse = { strasse: string | null; plz: string | null; ort: string | null; lkz?: string | null };
export type RoutenErgebnis = { km: number; minuten: number };
export type RoutenBlockProps = {
  start: RoutenAdresse;
  ziel: RoutenAdresse;
  km: number | null;
  onUebernehmen: (r: RoutenErgebnis) => void;
};

type Punkt = { lon: number; lat: number; label: string; genau?: boolean };
type Antwort = { km: number; minuten: number; geometrie: { type: "LineString"; coordinates: [number, number][] }; start: Punkt; ziel: Punkt };

const km1 = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const ganz = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });

function dauer(minuten: number): string {
  const m = Math.max(0, Math.round(minuten));
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")} h`;
}
function leer(s: string | null | undefined): boolean {
  return !s || !s.trim();
}
function fehlt(a: RoutenAdresse): string[] {
  const f: string[] = [];
  if (leer(a.strasse)) f.push("Straße");
  if (leer(a.plz) && leer(a.ort)) f.push("PLZ/Ort");
  return f;
}
function schluessel(a: RoutenAdresse, b: RoutenAdresse): string {
  return [a.strasse, a.plz, a.ort, a.lkz, b.strasse, b.plz, b.ort, b.lkz].map((x) => (x ?? "").trim().toLowerCase()).join("|");
}
function nurAdresse(a: RoutenAdresse) {
  return { strasse: a.strasse ?? "", plz: a.plz ?? "", ort: a.ort ?? "", ...(a.lkz ? { lkz: a.lkz } : {}) };
}

export function RoutenBlock({ start, ziel, km, onUebernehmen }: RoutenBlockProps) {
  const [ergebnis, setErgebnis] = useState<{ antwort: Antwort; fuer: string } | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [uebernommen, setUebernommen] = useState<number | null>(null);
  const lauf = useRef(0);

  const fehltStart = fehlt(start);
  const fehltZiel = fehlt(ziel);
  // Rechnen geht, sobald je Adresse mindestens PLZ oder Ort da ist; ohne Straße wird die Ortsmitte genommen.
  const rechenbar = !fehltStart.includes("PLZ/Ort") && !fehltZiel.includes("PLZ/Ort");
  const unvollstaendig = fehltStart.length > 0 || fehltZiel.length > 0;
  const aktuell = schluessel(start, ziel);
  const veraltet = !!ergebnis && ergebnis.fuer !== aktuell;

  async function berechne() {
    const nr = ++lauf.current;
    setLaedt(true);
    setFehler(null);
    setUebernommen(null);
    try {
      const r = await fetch("/api/karte/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start: nurAdresse(start), ziel: nurAdresse(ziel) }),
        cache: "no-store",
      });
      const j = (await r.json().catch(() => null)) as (Antwort & { fehler?: string }) | null;
      if (nr !== lauf.current) return;
      if (!r.ok || !j || typeof j.km !== "number" || !j.geometrie) {
        setFehler(j?.fehler ?? (r.status === 401 ? "Bitte neu anmelden." : "Die Route konnte nicht berechnet werden."));
        return;
      }
      setErgebnis({ antwort: j, fuer: aktuell });
    } catch {
      if (nr === lauf.current) setFehler("Keine Verbindung – bitte erneut versuchen.");
    } finally {
      if (nr === lauf.current) setLaedt(false);
    }
  }

  const a = ergebnis?.antwort ?? null;
  const kmGanz = a ? Math.round(a.km) : null;
  const abweichung = kmGanz != null && km != null ? kmGanz - Math.round(km) : null;
  const ungenau = a ? [a.start.genau === false ? "Beladestelle" : null, a.ziel.genau === false ? "Entladestelle" : null].filter(Boolean) : [];

  const leise = { color: "var(--k-text-2, #505050)" } as const;
  const kennzahl = { fontSize: "var(--k-text-xxl, 1.5rem)", fontWeight: 600, fontVariantNumeric: "tabular-nums", lineHeight: 1.2 } as const;
  const kennLabel = { fontSize: "var(--k-text-xs, 0.75rem)", fontWeight: 600, color: "var(--k-text-2, #505050)" } as const;

  return (
    <section className="flex flex-col gap-3" aria-label="Route und Entfernung">
      <div className="flex flex-wrap items-center gap-3">
        <Knopf art="primaer" onClick={berechne} disabled={!rechenbar || laedt} aria-busy={laedt}>
          {laedt ? "Route wird berechnet …" : ergebnis ? "Route neu berechnen (LKW)" : "Route berechnen (LKW)"}
        </Knopf>
        {km != null ? (
          <span style={leise}>
            Bisher eingetragen: <strong>{ganz.format(km)} km</strong>
          </span>
        ) : null}
      </div>

      {unvollstaendig ? (
        <Hinweis art="warnung" titel="Adressen unvollständig">
          {rechenbar ? "Die Route wird nur ungefähr (ab Ortsmitte) berechnet. " : "Für die Route werden Belade- und Entladestelle gebraucht. "}
          Es fehlt: {[fehltStart.length ? `Beladestelle (${fehltStart.join(", ")})` : null, fehltZiel.length ? `Entladestelle (${fehltZiel.join(", ")})` : null].filter(Boolean).join("; ")}.
        </Hinweis>
      ) : null}

      {fehler ? <Hinweis art="fehler">{fehler}</Hinweis> : null}

      {a && kmGanz != null ? (
        <>
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3" aria-live="polite">
            <div>
              <div style={kennLabel}>Strecke</div>
              <div style={kennzahl}>{km1.format(a.km)} km</div>
            </div>
            <div>
              <div style={kennLabel}>Fahrzeit LKW</div>
              <div style={kennzahl}>{dauer(a.minuten)}</div>
            </div>
            <div className="pb-1">
              {abweichung == null ? (
                <span style={leise}>Bisher sind keine km eingetragen.</span>
              ) : abweichung === 0 ? (
                <span>Stimmt mit dem eingetragenen Wert überein ({ganz.format(kmGanz)} km).</span>
              ) : (
                <span>
                  Eingetragen: {ganz.format(Math.round(km!))} km · berechnet: {ganz.format(kmGanz)} km ·{" "}
                  <strong>
                    {abweichung > 0 ? "+" : "−"}
                    {ganz.format(Math.abs(abweichung))} km
                  </strong>
                </span>
              )}
            </div>
          </div>

          {veraltet ? <Hinweis art="warnung">Die Adressen wurden seit der Berechnung geändert – bitte neu berechnen.</Hinweis> : null}
          {ungenau.length > 0 ? <Hinweis art="warnung">{ungenau.join(" und ")} nur ungefähr gefunden (Ortsmitte statt Hausadresse).</Hinweis> : null}

          <KartenAnsicht linie={a.geometrie.coordinates} start={a.start} ziel={a.ziel} />

          <div className="flex flex-wrap items-center gap-3">
            <Knopf
              art="sekundaer"
              disabled={veraltet || laedt}
              onClick={() => {
                onUebernehmen({ km: kmGanz, minuten: a.minuten });
                setUebernommen(kmGanz);
              }}
            >
              km in Transport übernehmen ({ganz.format(kmGanz)} km)
            </Knopf>
            {uebernommen != null ? (
              <span role="status" style={{ color: "var(--k-erfolg, #17693a)" }}>
                {ganz.format(uebernommen)} km übernommen.
              </span>
            ) : null}
          </div>
        </>
      ) : null}

      <p style={{ fontSize: "var(--k-text-xs, 0.75rem)", color: "var(--k-text-3, #6b6b6b)" }}>Route für LKW (openrouteservice, © OpenStreetMap-Mitwirkende)</p>
    </section>
  );
}
