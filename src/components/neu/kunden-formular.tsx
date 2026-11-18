"use client";
// Stammdaten eines Kunden anlegen oder ändern (Server Action speichereKunde).
import { useRouter } from "next/navigation";
import { useState } from "react";
import { speichereKunde } from "@/lib/aktionen";
import type { KundenZeile } from "@/lib/db-typen";
import { Auswahl, Feld, Hinweis, Knopf, Schalter, Textbereich } from "./ui";

const TEXTFELDER = ["anrede", "titel", "vorname", "name", "name1", "name2", "zuhaenden", "strasse", "lkz", "plz", "ort", "telefon", "telefon2", "mobil", "telefax", "email", "internet", "ustid", "zahlungsbedingung", "info"] as const;
type TextFeld = (typeof TEXTFELDER)[number];
type Werte = Record<TextFeld, string | null> & { aktiv: boolean; art: "firma" | "privat" };

const ANREDEN = ["Herr", "Frau", "Familie", "Firma", "Eheleute"];

function startWerte(k: KundenZeile | null): Werte {
  const w = Object.fromEntries(TEXTFELDER.map((f) => [f, k?.[f] ?? null])) as Record<TextFeld, string | null>;
  return { ...w, aktiv: k ? k.aktiv : true, art: k?.art === "firma" ? "firma" : "privat" };
}

type Props = {
  /** Vorhandener Kunde; `null` = neuen Kunden anlegen. */
  kunde: KundenZeile | null;
  /** Vorschläge für die Zahlungsbedingung (Auswahlliste der Stammdaten). */
  zahlungsbedingungen: string[];
};

export function KundenFormular({ kunde, zahlungsbedingungen }: Props) {
  const router = useRouter();
  const [w, setW] = useState<Werte>(() => startWerte(kunde));
  const [gespeichert, setGespeichert] = useState<Werte>(w);
  const [laeuft, setLaeuft] = useState(false);
  const [meldung, setMeldung] = useState<{ art: "erfolg" | "fehler"; text: string } | null>(null);
  const [namenFehler, setNamenFehler] = useState<string | null>(null);
  const neu = !kunde;
  const offen = w !== gespeichert;

  const t = (feld: TextFeld) => ({
    wert: w[feld],
    onWert: (x: string | null) => {
      setW((alt) => ({ ...alt, [feld]: x }));
      if (feld === "name" || feld === "name1") setNamenFehler(null);
    },
  });

  async function speichere() {
    if (laeuft) return;
    if (!(w.name ?? "").trim() && !(w.name1 ?? "").trim()) {
      setNamenFehler("Bitte einen Namen oder eine Firma eintragen.");
      setMeldung(null);
      return;
    }
    setLaeuft(true);
    setMeldung(null);
    const stand = w;
    try {
      const { art, ...felder } = stand;
      const r = await speichereKunde(kunde ? { id: kunde.id, ...felder } : { art, ...felder });
      if (!r.ok) {
        setMeldung({ art: "fehler", text: r.fehler });
      } else if (neu) {
        router.push(`/neu/kunden/${r.daten.id}`);
        return; // Knopf bleibt bis zum Seitenwechsel gesperrt
      } else {
        setGespeichert(stand);
        setMeldung({ art: "erfolg", text: `Gespeichert um ${new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr.` });
        router.refresh();
      }
    } catch {
      setMeldung({ art: "fehler", text: "Der Kunde konnte nicht gespeichert werden. Bitte Verbindung prüfen und gegebenenfalls neu anmelden. Die Eingaben bleiben erhalten." });
    }
    setLaeuft(false);
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void speichere();
      }}
    >
      <div className="k-raster">
        {neu ? (
          <Auswahl className="k-s4" label="Art" optionen={[{ wert: "privat", text: "Privat" }, { wert: "firma", text: "Firma" }]} wert={w.art} onWert={(x) => setW((alt) => ({ ...alt, art: x === "firma" ? "firma" : "privat" }))} />
        ) : null}
        <Feld className="k-s3" label="Anrede" {...t("anrede")} vorschlaege={ANREDEN} />
        <Feld className="k-s2" label="Titel" {...t("titel")} />
        <Feld className="k-s3" label="Vorname" {...t("vorname")} />
        <Feld className="k-s4" label="Name" {...t("name")} fehler={namenFehler} />
        <Feld className="k-s6" label="Firma / Name 1" {...t("name1")} />
        <Feld className="k-s6" label="Name 2" {...t("name2")} />
        <Feld className="k-s6" label="z. H." {...t("zuhaenden")} />
        <Feld className="k-s6" label="Straße" {...t("strasse")} />
        <Feld className="k-s2" label="LKZ" {...t("lkz")} maxLength={4} />
        <Feld className="k-s3" label="PLZ" {...t("plz")} inputMode="numeric" maxLength={10} />
        <Feld className="k-s7" label="Ort" {...t("ort")} />
      </div>
      <h3 className="k-untertitel">Kontakt</h3>
      <div className="k-raster">
        <Feld className="k-s4" label="Telefon" type="tel" {...t("telefon")} />
        <Feld className="k-s4" label="Telefon 2" type="tel" {...t("telefon2")} />
        <Feld className="k-s4" label="Mobil" type="tel" {...t("mobil")} />
        <Feld className="k-s4" label="Fax" type="tel" {...t("telefax")} />
        <Feld className="k-s4" label="E-Mail" type="email" {...t("email")} />
        <Feld className="k-s4" label="Internet" {...t("internet")} />
      </div>
      <h3 className="k-untertitel">Abrechnung und Notiz</h3>
      <div className="k-raster">
        <Feld className="k-s4" label="USt-IdNr." {...t("ustid")} />
        <Feld className="k-s8" label="Zahlungsbedingung" {...t("zahlungsbedingung")} vorschlaege={zahlungsbedingungen} hinweis="Wird beim Übernehmen in ein Angebot vorgeschlagen." />
        <Textbereich label="Notiz / Info" rows={4} {...t("info")} />
        <Schalter label="Aktiv (erscheint in der Kundensuche der Angebotsmaske)" an={w.aktiv} onAn={(x) => setW((alt) => ({ ...alt, aktiv: x }))} />
      </div>
      {meldung ? <Hinweis art={meldung.art}>{meldung.text}</Hinweis> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Knopf art="primaer" type="submit" disabled={laeuft || (!neu && !offen)} aria-busy={laeuft}>
          {laeuft ? "Speichert …" : neu ? "Kunde anlegen" : "Speichern"}
        </Knopf>
        {neu ? (
          <Knopf href="/neu/kunden" art="still">
            Abbrechen
          </Knopf>
        ) : offen ? (
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
    </form>
  );
}
