"use client";
// Bearbeitungs-Übergabe für die Angebotsmaske (beide Ansichten).
//
// Regeln:
// - Immer nur EIN Fenster bearbeitet ein Angebot. Alle anderen sehen es im Ansichtsmodus und sehen, wer bearbeitet.
// - Die Bearbeitung endet von selbst: beim Schließen/Verlassen, nach 60 s ohne Lebenszeichen (Rechner aus, Ruhezustand)
//   und nach LEERLAUF_MIN Minuten ohne Eingabe (dann „pausiert“; die nächste Eingabe holt sie zurück, falls frei).
// - Jeder kann die Bearbeitung übernehmen: Der bisherige Bearbeiter wird gebeten, zu speichern und abzugeben (geschieht
//   automatisch, die Maske speichert in `onAbgabe`). Reagiert sein Fenster nicht binnen ANFRAGE_WARTEN_S, wird übernommen.
import { useCallback, useEffect, useRef, useState } from "react";
import type { SperrAntwort, SperrModus } from "./angebot-typen";

export const LEBENSZEICHEN_S = 10;
export const ANSICHT_ABFRAGE_S = 12;
export const ANFRAGE_WARTEN_S = 15;
export const LEERLAUF_MIN = 10;

export type BearbeitungsModus =
  | "laedt" // noch keine Antwort
  | "bearbeiten" // dieses Fenster darf ändern und speichern
  | "ansicht" // nur lesen (jemand anderes bearbeitet, oder Bearbeitung noch nicht begonnen)
  | "pausiert"; // wegen Leerlauf abgegeben; nächste Eingabe versucht, sie zurückzuholen

export type Bearbeitung = {
  modus: BearbeitungsModus;
  /** true, solange Felder änderbar sein sollen (modus === "bearbeiten"). */
  darfBearbeiten: boolean;
  /** Wer gerade bearbeitet, wenn nicht dieses Fenster. null = niemand. */
  bearbeiter: { name: string; selberNutzer: boolean; seit: string | null } | null;
  /** Kennung dieses Fensters – an `speichereAngebot({ sitzung })` übergeben. */
  sitzung: string;
  /** Text für eine Meldung, z. B. „Sandra hat die Bearbeitung übernommen“. null = nichts zu melden. */
  hinweis: string | null;
  hinweisSchliessen: () => void;
  /** Läuft gerade eine Übernahme-Anfrage? (Knopf deaktivieren, „wird übernommen …“ zeigen) */
  uebernimmt: boolean;
  /** Der gespeicherte Stand auf dem Server ist neuer als `geladeneVersion` (im Ansichtsmodus: neu laden anbieten). */
  neuerStandVorhanden: boolean;
  /** Bearbeitung beginnen, wenn frei. Liefert true bei Erfolg. */
  beginnen: () => Promise<boolean>;
  /** Bearbeitung von jemand anderem übernehmen (bittet erst um Abgabe, erzwingt nach kurzer Wartezeit). Liefert true bei Erfolg. */
  uebernehmen: () => Promise<boolean>;
  /** Bearbeitung beenden (vorher selbst speichern). Danach Ansichtsmodus. */
  beenden: () => Promise<void>;
};

type Optionen = {
  angebotId: number;
  /** Sofort beim Öffnen versuchen zu bearbeiten (Neuansicht). Sonst erst nach `beginnen()` (Altansicht: Knopf „Bearbeiten“). */
  sofortBeginnen: boolean;
  /** `angebot.version`, die die Maske gerade zeigt (nach jedem Speichern aktualisieren). */
  geladeneVersion: number;
  /**
   * Wird aufgerufen, bevor die Bearbeitung abgegeben wird (Übergabe-Anfrage oder Leerlauf).
   * Die Maske speichert hier ungespeicherte Änderungen. Fehler beim Speichern verhindern die Abgabe nicht.
   */
  onAbgabe?: () => Promise<void>;
};

async function ruf(angebotId: number, sitzung: string, modus: SperrModus, keepalive = false): Promise<SperrAntwort | null> {
  try {
    const r = await fetch("/api/sperre", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ angebotId, sitzung, modus }), keepalive, cache: "no-store" });
    if (!r.ok) return null;
    return (await r.json()) as SperrAntwort;
  } catch {
    return null;
  }
}

function neueSitzung(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `s-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function useBearbeitung({ angebotId, sofortBeginnen, geladeneVersion, onAbgabe }: Optionen): Bearbeitung {
  const [sitzung] = useState(neueSitzung);
  const [modus, setModus] = useState<BearbeitungsModus>("laedt");
  const [bearbeiter, setBearbeiter] = useState<Bearbeitung["bearbeiter"]>(null);
  const [hinweis, setHinweis] = useState<string | null>(null);
  const [uebernimmt, setUebernimmt] = useState(false);
  const [serverVersion, setServerVersion] = useState(geladeneVersion);
  const modusRef = useRef(modus);
  const abgabeRef = useRef(onAbgabe);
  const letzteEingabe = useRef(0);
  const gibtAb = useRef(false);
  useEffect(() => { modusRef.current = modus; }, [modus]);
  useEffect(() => { abgabeRef.current = onAbgabe; }, [onAbgabe]);

  const uebernimmAntwort = useCallback((a: SperrAntwort | null): boolean => {
    if (!a) return modusRef.current === "bearbeiten"; // Netzfehler: Zustand behalten
    if (typeof a.version === "number") setServerVersion(a.version);
    if (a.habe) {
      setBearbeiter(null);
      setModus("bearbeiten");
      return true;
    }
    setBearbeiter(a.frei || !a.nutzer_name ? null : { name: a.nutzer_name, selberNutzer: Boolean(a.selber_nutzer), seit: a.seit ?? null });
    if (modusRef.current !== "pausiert" || !a.frei) setModus("ansicht");
    return false;
  }, []);

  const beginnen = useCallback(async () => {
    letzteEingabe.current = Date.now();
    return uebernimmAntwort(await ruf(angebotId, sitzung, "holen"));
  }, [angebotId, sitzung, uebernimmAntwort]);

  const abgeben = useCallback(async (danach: BearbeitungsModus, text: string | null) => {
    if (gibtAb.current) return;
    gibtAb.current = true;
    try {
      try { await abgabeRef.current?.(); } catch { /* Abgabe trotzdem */ }
      await ruf(angebotId, sitzung, "abgeben");
      setModus(danach);
      if (text) setHinweis(text);
    } finally {
      gibtAb.current = false;
    }
  }, [angebotId, sitzung]);

  const beenden = useCallback(async () => {
    await ruf(angebotId, sitzung, "abgeben");
    setBearbeiter(null);
    setModus("ansicht");
  }, [angebotId, sitzung]);

  const uebernehmen = useCallback(async () => {
    setUebernimmt(true);
    try {
      let a = await ruf(angebotId, sitzung, "anfragen");
      const ende = Date.now() + ANFRAGE_WARTEN_S * 1000;
      while (a && !a.habe && Date.now() < ende) {
        await new Promise((r) => setTimeout(r, 1500));
        a = await ruf(angebotId, sitzung, "holen");
      }
      if (!a?.habe) a = await ruf(angebotId, sitzung, "erzwingen");
      letzteEingabe.current = Date.now();
      return uebernimmAntwort(a);
    } finally {
      setUebernimmt(false);
    }
  }, [angebotId, sitzung, uebernimmAntwort]);

  // Beim Öffnen: bearbeiten (Neuansicht) oder nur nachsehen (Altansicht).
  useEffect(() => {
    let aktiv = true;
    letzteEingabe.current = Date.now();
    ruf(angebotId, sitzung, sofortBeginnen ? "holen" : "status").then((a) => { if (aktiv) uebernimmAntwort(a ?? { habe: false, frei: true }); });
    return () => { aktiv = false; };
  }, [angebotId, sitzung, sofortBeginnen, uebernimmAntwort]);

  // Lebenszeichen (bearbeiten) bzw. Nachsehen (ansicht/pausiert).
  useEffect(() => {
    if (modus === "laedt") return;
    const takt = modus === "bearbeiten" ? LEBENSZEICHEN_S : ANSICHT_ABFRAGE_S;
    const schritt = async () => {
      if (modusRef.current === "bearbeiten") {
        if (Date.now() - letzteEingabe.current > LEERLAUF_MIN * 60_000) {
          await abgeben("pausiert", `Bearbeitung pausiert, weil ${LEERLAUF_MIN} Minuten nichts eingegeben wurde. Der Stand ist gespeichert; andere können jetzt bearbeiten.`);
          return;
        }
        const a = await ruf(angebotId, sitzung, "halten");
        if (!a) return;
        if (typeof a.version === "number") setServerVersion(a.version);
        if (a.habe && a.anfrage_name) {
          await abgeben("ansicht", `${a.anfrage_name} hat die Bearbeitung übernommen. Dein Stand wurde vorher gespeichert.`);
        } else if (!a.habe) {
          setBearbeiter(a.nutzer_name ? { name: a.nutzer_name, selberNutzer: Boolean(a.selber_nutzer), seit: a.seit ?? null } : null);
          setModus("ansicht");
          setHinweis(a.selber_nutzer ? "Du bearbeitest dieses Angebot jetzt in einem anderen Fenster. Hier ist es nur noch zur Ansicht." : `${a.nutzer_name || "Jemand anderes"} hat die Bearbeitung übernommen. Hier ist das Angebot nur noch zur Ansicht.`);
        }
      } else {
        uebernimmAntwort(await ruf(angebotId, sitzung, "status"));
      }
    };
    const t = setInterval(schritt, takt * 1000);
    const sichtbar = () => { if (document.visibilityState === "visible") void schritt(); };
    document.addEventListener("visibilitychange", sichtbar);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", sichtbar); };
  }, [modus, angebotId, sitzung, abgeben, uebernimmAntwort]);

  // Eingaben merken (Leerlauf) und nach einer Pause die Bearbeitung zurückholen.
  useEffect(() => {
    const eingabe = () => {
      letzteEingabe.current = Date.now();
      if (modusRef.current === "pausiert") {
        modusRef.current = "laedt";
        void ruf(angebotId, sitzung, "holen").then((a) => {
          if (a?.habe) setHinweis(null);
          else modusRef.current = "pausiert";
          uebernimmAntwort(a);
        });
      }
    };
    window.addEventListener("keydown", eingabe, true);
    window.addEventListener("pointerdown", eingabe, true);
    return () => { window.removeEventListener("keydown", eingabe, true); window.removeEventListener("pointerdown", eingabe, true); };
  }, [angebotId, sitzung, uebernimmAntwort]);

  // Fenster schließen oder Seite verlassen: sofort freigeben.
  useEffect(() => {
    const frei = () => { if (modusRef.current === "bearbeiten") void ruf(angebotId, sitzung, "abgeben", true); };
    window.addEventListener("pagehide", frei);
    return () => { window.removeEventListener("pagehide", frei); frei(); };
  }, [angebotId, sitzung]);

  return {
    modus,
    darfBearbeiten: modus === "bearbeiten",
    bearbeiter,
    sitzung,
    hinweis,
    hinweisSchliessen: () => setHinweis(null),
    uebernimmt,
    neuerStandVorhanden: serverVersion > geladeneVersion,
    beginnen,
    uebernehmen,
    beenden,
  };
}
