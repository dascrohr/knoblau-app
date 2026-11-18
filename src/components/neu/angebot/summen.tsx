"use client";
import { VERSICHERUNGSSTEUER_SATZ, formatBetrag, formatZahl, type PreisUebersicht } from "@/lib/preis";
import { Knopf } from "../ui";

export type SpeicherStatus = { art: "sauber" } | { art: "offen" } | { art: "speichert" } | { art: "gespeichert"; um: string } | { art: "fehler" };

export function StatusText({ status }: { status: SpeicherStatus }) {
  const text =
    status.art === "offen" ? "Ungespeicherte Änderungen" : status.art === "speichert" ? "Speichert …" : status.art === "gespeichert" ? `Gespeichert um ${status.um}` : status.art === "fehler" ? "Nicht gespeichert" : "Keine Änderungen";
  return (
    <span className="k-speicherstatus" data-zustand={status.art} role="status" aria-live="polite">
      {text}
    </span>
  );
}

export function SpeicherKnopf({ status, onSpeichern }: { status: SpeicherStatus; onSpeichern: () => void }) {
  const nichtsZuTun = status.art === "sauber" || status.art === "gespeichert";
  return (
    <Knopf art="primaer" onClick={onSpeichern} disabled={status.art === "speichert" || nichtsZuTun} aria-keyshortcuts="Control+S Meta+S" title="Speichern (Strg+S bzw. Cmd+S)">
      {status.art === "speichert" ? "Speichert …" : "Speichern"}
    </Knopf>
  );
}

/** Summen rechts neben der Maske (ab 1280 px). */
export function SummenKarte({ preis, status, onSpeichern }: { preis: PreisUebersicht; status: SpeicherStatus; onSpeichern: () => void }) {
  return (
    <aside className="k-summenleiste k-karte" aria-label="Summen und Speichern">
      <div className="k-karte-inhalt flex flex-col gap-3">
        <div>
          <h2 className="k-untertitel mb-1">Summen</h2>
          {preis.rabatt ? (
            <div className="k-summenzeile k-leise">
              <span>Generalrabatt</span>
              <span>− {formatBetrag(preis.rabatt)} €</span>
            </div>
          ) : null}
          <div className="k-summenzeile">
            <span>Netto</span>
            <span className="font-semibold">{formatBetrag(preis.nettoNachRabatt)} €</span>
          </div>
          <div className="k-summenzeile">
            <span>USt {formatZahl(preis.ustSatz)} %</span>
            <span>{formatBetrag(preis.ust)} €</span>
          </div>
          {preis.vsst ? (
            <div className="k-summenzeile">
              <span>VsSt {VERSICHERUNGSSTEUER_SATZ} %</span>
              <span>{formatBetrag(preis.vsst)} €</span>
            </div>
          ) : null}
          <div className="k-summenzeile k-summenzeile-gesamt">
            <span>Gesamt</span>
            <span>{formatBetrag(preis.gesamt)} €</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <SpeicherKnopf status={status} onSpeichern={onSpeichern} />
          <StatusText status={status} />
          <span className="k-leise text-xs">Tastenkürzel: Strg+S bzw. Cmd+S</span>
        </div>
        <a href="#preisuebersicht" className="k-link text-xs">
          Zur vollständigen Preisübersicht
        </a>
      </div>
    </aside>
  );
}

/** Dieselben Summen als Fußleiste (unter 1280 px). */
export function SummenFuss({ preis, status, onSpeichern }: { preis: PreisUebersicht; status: SpeicherStatus; onSpeichern: () => void }) {
  return (
    <div className="k-fussleiste" role="region" aria-label="Summen und Speichern">
      <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-0 k-zahl" style={{ textAlign: "left" }}>
        <div className="flex gap-1.5">
          <dt className="k-leise">Netto</dt>
          <dd className="font-semibold">{formatBetrag(preis.nettoNachRabatt)} €</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="k-leise">USt</dt>
          <dd>{formatBetrag(preis.ust)} €</dd>
        </div>
        {preis.vsst ? (
          <div className="flex gap-1.5">
            <dt className="k-leise">VsSt</dt>
            <dd>{formatBetrag(preis.vsst)} €</dd>
          </div>
        ) : null}
        <div className="flex gap-1.5 text-base">
          <dt className="font-bold">Gesamt</dt>
          <dd className="font-bold">{formatBetrag(preis.gesamt)} €</dd>
        </div>
      </dl>
      <div className="flex items-center gap-3">
        <StatusText status={status} />
        <SpeicherKnopf status={status} onSpeichern={onSpeichern} />
      </div>
    </div>
  );
}
