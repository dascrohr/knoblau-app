"use client";
// Übergabe-Leiste der Angebotsmaske: zeigt, ob dieses Fenster bearbeitet oder nur ansieht, wer sonst bearbeitet,
// und bietet Übernehmen, Beenden und Neuladen an. Die Abläufe selbst stehen in maske.tsx.
import type { Bearbeitung } from "@/lib/bearbeitung";
import { Knopf } from "../ui";
import { StatusText, type SpeicherStatus } from "./summen";

type Props = {
  b: Bearbeitung;
  status: SpeicherStatus;
  /** Es gibt ungespeicherte Änderungen in diesem Fenster. */
  offen: boolean;
  /** Läuft gerade etwas (Übernahme, Laden, Beenden)? Dann sind die Knöpfe gesperrt. */
  beschaeftigt: "uebernahme" | "laden" | "beenden" | null;
  /** Beim Speichern kam „veraltet“ zurück bzw. der Server hat einen neueren Stand als dieses Fenster. */
  konflikt: boolean;
  /** Kurze Meldung der Maske, z. B. „Der neueste Stand wurde geladen.“ */
  meldung: string | null;
  onMeldungZu: () => void;
  onUebernehmen: () => void;
  onBeginnen: () => void;
  onBeenden: () => void;
  /** Neuesten gespeicherten Stand laden (fragt selbst nach, wenn dabei Änderungen verloren gehen). */
  onNeuLaden: () => void;
};

function seitText(seit: string | null): string {
  if (!seit) return "";
  const d = new Date(seit);
  if (Number.isNaN(d.getTime())) return "";
  const zeit = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const heute = new Date().toDateString() === d.toDateString();
  return heute ? ` seit ${zeit} Uhr` : ` seit ${d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })} ${zeit} Uhr`;
}

export function UebergabeLeiste({ b, status, offen, beschaeftigt, konflikt, meldung, onMeldungZu, onUebernehmen, onBeginnen, onBeenden, onNeuLaden }: Props) {
  const uebernimmt = b.uebernimmt || beschaeftigt === "uebernahme";
  const gesperrt = beschaeftigt != null || b.uebernimmt;
  const fremd = b.modus === "ansicht" ? b.bearbeiter : null;
  const neuerStand = !b.darfBearbeiten && b.neuerStandVorhanden && !uebernimmt;

  let art: "ruhig" | "warnung" | "info" = "ruhig";
  let text: string;
  let knopf: React.ReactNode = null;

  if (uebernimmt) {
    art = "warnung";
    const beginnt = !b.uebernimmt && !fremd;
    text = beginnt ? "Bearbeitung wird begonnen, der neueste Stand wird geladen …" : "Wird übernommen … (der aktuelle Stand wird vorher gespeichert)";
    knopf = (
      <Knopf art="primaer" disabled>
        {beginnt ? "Einen Moment …" : "Wird übernommen …"}
      </Knopf>
    );
  } else if (beschaeftigt === "laden") {
    art = "info";
    text = "Der neueste gespeicherte Stand wird geladen …";
  } else if (b.modus === "laedt") {
    text = "Es wird geprüft, ob das Angebot gerade bearbeitet wird …";
  } else if (b.modus === "bearbeiten") {
    text = "Du bearbeitest dieses Angebot.";
    knopf = (
      <Knopf onClick={onBeenden} disabled={gesperrt} title="Speichert und gibt das Angebot für andere frei">
        {beschaeftigt === "beenden" ? "Wird beendet …" : "Bearbeitung beenden"}
      </Knopf>
    );
  } else if (b.modus === "pausiert") {
    art = "info";
    text = "Bearbeitung pausiert (längere Zeit keine Eingabe). Der Stand ist gespeichert. Einfach weiterschreiben oder klicken, um fortzufahren.";
  } else if (fremd) {
    art = "warnung";
    text = fremd.selberNutzer
      ? "Nur Ansicht: Du bearbeitest dieses Angebot gerade in einem anderen Fenster oder an einem anderen Gerät."
      : `Nur Ansicht: ${fremd.name} bearbeitet dieses Angebot${seitText(fremd.seit)}.`;
    knopf = (
      <Knopf art="primaer" onClick={onUebernehmen} disabled={gesperrt}>
        {fremd.selberNutzer ? "Hier weiterarbeiten" : "Bearbeitung übernehmen"}
      </Knopf>
    );
  } else {
    art = "warnung";
    text = "Nur Ansicht.";
    knopf = (
      <Knopf art="primaer" onClick={onBeginnen} disabled={gesperrt}>
        Bearbeiten
      </Knopf>
    );
  }

  return (
    <div className="k-uebergabe" role="region" aria-label="Bearbeitung dieses Angebots">
      <div className="k-uebergabe-zeile" data-art={art}>
        <span className="k-uebergabe-text" role="status" aria-live="polite">
          {text}
        </span>
        <span className="k-uebergabe-rechts">
          {b.darfBearbeiten || offen ? <StatusText status={status} /> : null}
          {knopf}
        </span>
      </div>
      {neuerStand ? (
        <div className="k-uebergabe-zeile" data-art="info">
          <span className="k-uebergabe-text">Es gibt einen neueren gespeicherten Stand.</span>
          <span className="k-uebergabe-rechts">
            <Knopf onClick={onNeuLaden} disabled={gesperrt}>
              Neu laden
            </Knopf>
          </span>
        </div>
      ) : null}
      {konflikt ? (
        <div className="k-uebergabe-zeile" data-art="fehler" role="alert">
          <span className="k-uebergabe-text">Dieses Angebot wurde inzwischen an anderer Stelle geändert. Speichern ist erst wieder möglich, wenn der neueste Stand geladen ist.</span>
          <span className="k-uebergabe-rechts">
            <Knopf onClick={onNeuLaden} disabled={gesperrt}>
              Neuesten Stand laden
            </Knopf>
          </span>
        </div>
      ) : null}
      {b.hinweis && b.modus !== "pausiert" ? (
        <div className="k-uebergabe-zeile" data-art="info" role="status">
          <span className="k-uebergabe-text">{b.hinweis}</span>
          <span className="k-uebergabe-rechts">
            <Knopf art="still" onClick={b.hinweisSchliessen} aria-label="Meldung schließen">
              ✕ Schließen
            </Knopf>
          </span>
        </div>
      ) : null}
      {meldung ? (
        <div className="k-uebergabe-zeile" data-art="info" role="status">
          <span className="k-uebergabe-text">{meldung}</span>
          <span className="k-uebergabe-rechts">
            <Knopf art="still" onClick={onMeldungZu} aria-label="Meldung schließen">
              ✕ Schließen
            </Knopf>
          </span>
        </div>
      ) : null}
    </div>
  );
}
