"use client";
import { memo } from "react";
import { VERSICHERUNGSSTEUER_SATZ, formatBetrag, formatZahl, type PreisUebersicht as Preis } from "@/lib/preis";
import { Karte } from "../ui";

function Zeile({ text, betrag, stark, minus, leise }: { text: string; betrag: number; stark?: boolean; minus?: boolean; leise?: boolean }) {
  return (
    <tr style={stark ? { fontWeight: 700 } : undefined} className={leise ? "k-leise" : undefined}>
      <th scope="row" style={{ textAlign: "left", fontWeight: "inherit", padding: "0.3rem 0" }}>
        {text}
      </th>
      <td className="k-zahl" style={{ padding: "0.3rem 0" }}>
        {minus && betrag ? "− " : ""}
        {formatBetrag(betrag)} €
      </td>
    </tr>
  );
}

export const Preisuebersicht = memo(function Preisuebersicht({ preis }: { preis: Preis }) {
  const linie = { borderTop: "1px solid var(--k-rahmen)" };
  return (
    <div id="preisuebersicht" className="k-abschnitt">
      <Karte titel="Preisübersicht">
        <table style={{ width: "100%", maxWidth: "34rem", borderCollapse: "collapse" }}>
          <caption className="sr-only">Aufstellung aller Summen des Angebots</caption>
          <tbody>
            <Zeile text="Summe Beladekosten" betrag={preis.beladen} />
            <Zeile text="Transportkosten + Freie Leistungen" betrag={preis.transport} />
            {preis.frei ? <Zeile leise text="   davon Freie Leistungen" betrag={preis.frei} /> : null}
            <Zeile text="Summe Entladekosten" betrag={preis.entladen} />
            <Zeile text="Versicherungsbeträge" betrag={preis.versicherung} />
            <Zeile text="Summe Besonderheiten" betrag={preis.besonderheiten} />
            <Zeile text="Summe Packmaterialien" betrag={preis.packmaterial} />
            <Zeile text="Summe Nebenleistungen" betrag={preis.nebenleistungen} />
            <Zeile text="Mautkostenberechnung" betrag={preis.maut} />
          </tbody>
          <tbody style={linie}>
            <Zeile stark text="Gesamtnettosumme" betrag={preis.netto} />
            {preis.rabatt ? (
              <>
                <Zeile minus text="abzügl. Generalrabatt" betrag={preis.rabatt} />
                <Zeile stark text="Netto nach Rabatt" betrag={preis.nettoNachRabatt} />
              </>
            ) : null}
            <Zeile text={`zzgl. USt (${formatZahl(preis.ustSatz)} %)`} betrag={preis.ust} />
            {preis.vsst ? <Zeile text={`zzgl. VsSt (${VERSICHERUNGSSTEUER_SATZ} %)`} betrag={preis.vsst} /> : null}
          </tbody>
          <tbody style={{ borderTop: "2px solid var(--k-schwarz)", fontSize: "var(--k-text-l)" }}>
            <Zeile stark text="Gesamtsumme" betrag={preis.gesamt} />
          </tbody>
        </table>
      </Karte>
    </div>
  );
});
