"use client";
// Angebotsmaske der Altansicht: ein Formular hält den gesamten Zustand, 13 Reiter zeigen ihn.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { adressName, leerePosition, type AdressArt, type Adresse, type AngebotKomplett } from "@/lib/angebot-typen";
import type { StammChecklisteZeile, StammLeistungenZeile, StammPackmaterialZeile, StammZimmerZeile } from "@/lib/db-typen";
import { loescheAngebot, speichereAngebot } from "@/lib/aktionen";
import { MaskeKontext, type Maske, type Zustand } from "./felder";
import { Statusleiste, Symbolleiste, type Nachbarn } from "./leisten";
import { ReiterAdressdaten, ReiterBesichtigung, type Auswahl } from "./reiter-a";
import { ReiterFrei, ReiterNebenleistung, ReiterPackmaterial, ReiterTransport } from "./reiter-b";
import { ReiterAdressenAnlagen, ReiterCheckliste, ReiterPreis, ReiterTermine } from "./reiter-c";
import { ReiterUmzugsgutErfassung, ReiterUmzugsgutKomplett, ReiterUmzugsgutSummen } from "./reiter-d";

export type MaskeStamm = {
  leistungen: StammLeistungenZeile[];
  packmaterial: StammPackmaterialZeile[];
  checkliste: StammChecklisteZeile[];
  zimmer: StammZimmerZeile[];
  auswahl: Auswahl;
};

const REITER = ["Adreßdaten", "Besichtigungsergebnisse", "Transport/Maut", "Freie Leistung", "Nebenleistung", "Packmaterial", "Termine", "Preisübersicht", "Adressen+Anlagen", "Checkliste", "UmzugsgutErfassung", "Komplette Umzugsgutliste", "Summen Umzugsgutliste"] as const;
const WARNUNG = "Es gibt ungespeicherte Änderungen. Trotzdem verlassen?";

const hatInhalt = (a: Adresse) => Object.entries(a).some(([k, v]) => k !== "art" && v != null && v !== "");

export function AngebotMaske({ daten, nachbarn, position, gesamt, stamm, admin, neu }: { daten: AngebotKomplett; nachbarn: Nachbarn; position: number; gesamt: number; stamm: MaskeStamm; admin: boolean; neu: boolean }) {
  const id = daten.angebot.id;
  const router = useRouter();
  const [z, setZ] = useState<Zustand>(() => ({ angebot: daten.angebot, adressen: daten.adressen, positionen: daten.positionen, termine: daten.termine, checkliste: daten.checkliste }));
  const [geaendert, setGeaendert] = useState(false);
  const [lesen, setLesen] = useState(!neu);
  const [reiter, setReiter] = useState(0);
  const [meldung, setMeldung] = useState<{ art: "ok" | "fehler"; text: string } | null>(null);
  const [laeuft, start] = useTransition();
  const reiterRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const aendere = useCallback((f: (alt: Zustand) => Zustand) => {
    setZ(f);
    setGeaendert(true);
    setMeldung(null);
  }, []);

  const maske = useMemo<Maske>(() => ({
    z,
    lesen,
    setA: (patch) => aendere((s) => ({ ...s, angebot: { ...s.angebot, ...patch } })),
    setAdr: (art, patch) => aendere((s) => ({ ...s, adressen: { ...s.adressen, [art]: { ...s.adressen[art], ...patch } } })),
    setPos: (bereich, zeile, patch) => aendere((s) => {
      const i = s.positionen.findIndex((p) => p.bereich === bereich && p.zeile === zeile);
      const positionen = i >= 0 ? s.positionen.map((p, j) => (j === i ? { ...p, ...patch } : p)) : [...s.positionen, { ...leerePosition(bereich, zeile), ...patch }];
      return { ...s, positionen };
    }),
    entfernePos: (bereich, zeile) => aendere((s) => ({ ...s, positionen: s.positionen.filter((p) => !(p.bereich === bereich && p.zeile === zeile)) })),
    setTermin: (zeile, patch) => aendere((s) => {
      const i = s.termine.findIndex((t) => t.zeile === zeile);
      const termine = i >= 0 ? s.termine.map((t, j) => (j === i ? { ...t, ...patch } : t)) : [...s.termine, { zeile, text: null, datum: null, von: null, bis: null, gebucht: false, ...patch }];
      return { ...s, termine };
    }),
    setCheckliste: (checkliste) => aendere((s) => ({ ...s, checkliste })),
  }), [z, lesen, aendere]);

  // Vor dem Verlassen warnen: Browser (Schließen/Neuladen) und Links innerhalb der Anwendung.
  useEffect(() => {
    if (!geaendert) return;
    const vorEntladen = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    const klick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!a || a.getAttribute("target") === "_blank" || (a.getAttribute("href") ?? "").startsWith("#")) return;
      if (!window.confirm(WARNUNG)) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener("beforeunload", vorEntladen);
    document.addEventListener("click", klick, true);
    return () => {
      window.removeEventListener("beforeunload", vorEntladen);
      document.removeEventListener("click", klick, true);
    };
  }, [geaendert]);

  const darfWeg = () => !geaendert || window.confirm(WARNUNG);

  const speichern = () => {
    const adressen: Partial<Record<AdressArt, Adresse>> = { auftraggeber: z.adressen.auftraggeber, beladestelle: z.adressen.beladestelle, entladestelle: z.adressen.entladestelle };
    for (const art of ["zusatz1", "zusatz2"] as const) if (hatInhalt(z.adressen[art]) || hatInhalt(daten.adressen[art])) adressen[art] = z.adressen[art];
    const angebot = { ...z.angebot, ust_satz: z.angebot.ust_satz ?? 19 };
    setMeldung(null);
    start(async () => {
      try {
        const r = await speichereAngebot({ id, angebot, adressen, positionen: z.positionen, termine: z.termine, checkliste: z.checkliste });
        if (r.ok) {
          setGeaendert(false);
          setMeldung({ art: "ok", text: "Gespeichert." });
        } else setMeldung({ art: "fehler", text: r.fehler });
      } catch {
        setMeldung({ art: "fehler", text: "Speichern fehlgeschlagen. Bitte Verbindung und Anmeldung prüfen." });
      }
    });
  };

  const loeschen = () => {
    if (!window.confirm(`Angebot ${z.angebot.angebotnr ?? ""} wirklich löschen? Das lässt sich nicht rückgängig machen.`)) return;
    start(async () => {
      try {
        const r = await loescheAngebot(id);
        if (r.ok) {
          setGeaendert(false);
          router.push("/alt/angebote");
        } else setMeldung({ art: "fehler", text: r.fehler });
      } catch {
        setMeldung({ art: "fehler", text: "Löschen fehlgeschlagen." });
      }
    });
  };

  const reiterTaste = (e: React.KeyboardEvent) => {
    const n = REITER.length;
    const ziel = e.key === "ArrowRight" ? (reiter + 1) % n : e.key === "ArrowLeft" ? (reiter + n - 1) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (ziel < 0) return;
    e.preventDefault();
    setReiter(ziel);
    reiterRefs.current[ziel]?.focus();
  };

  const blatt = () => {
    switch (reiter) {
      case 0: return <ReiterAdressdaten id={id} auswahl={stamm.auswahl} />;
      case 1: return <ReiterBesichtigung id={id} auswahl={stamm.auswahl} />;
      case 2: return <ReiterTransport />;
      case 3: return <ReiterFrei />;
      case 4: return <ReiterNebenleistung stamm={stamm.leistungen} />;
      case 5: return <ReiterPackmaterial stamm={stamm.packmaterial} />;
      case 6: return <ReiterTermine />;
      case 7: return <ReiterPreis auswahl={stamm.auswahl} />;
      case 8: return <ReiterAdressenAnlagen halteverbotszonen={daten.halteverbotszonen} />;
      case 9: return <ReiterCheckliste vorlage={stamm.checkliste} />;
      case 10: return <ReiterUmzugsgutErfassung gut={daten.umzugsgut} zimmer={stamm.zimmer} />;
      case 11: return <ReiterUmzugsgutKomplett gut={daten.umzugsgut} />;
      default: return <ReiterUmzugsgutSummen gut={daten.umzugsgut} />;
    }
  };

  return (
    <MaskeKontext.Provider value={maske}>
      <Symbolleiste
        nachbarn={nachbarn}
        aktuell={id}
        onSpeichern={speichern}
        speichernAktiv={!lesen && geaendert && !laeuft}
        onBearbeiten={() => { if (lesen) setLesen(false); else if (!geaendert) setLesen(true); else setMeldung({ art: "fehler", text: "Bitte zuerst speichern." }); }}
        inBearbeitung={!lesen}
        onLoeschen={admin ? loeschen : undefined}
        loeschenHinweis="Nur der Admin darf Angebote löschen"
        darfWeg={darfWeg}
        meldung={laeuft ? { art: "ok", text: "Bitte warten …" } : meldung}
      />
      <div className="inhalt">
        <div className="kopfzeile">
          <span>Angebotsnr.: <b>{z.angebot.angebotnr ?? "(ohne)"}</b>{geaendert ? <b title="Ungespeicherte Änderungen"> *</b> : null}</span>
          <span>Auftraggeber: <b>{adressName(z.adressen.auftraggeber) || "–"}</b></span>
          <span>Status: <b>{z.angebot.status ?? "–"}</b></span>
          {daten.rechnungen.length > 0 && (
            <span className="nicht-drucken">Rechnungen: {daten.rechnungen.map((r, i) => <span key={r.id}>{i ? ", " : ""}<Link href={`/alt/rechnungen/${r.id}`}>{r.rechnungnr ?? r.id}</Link></span>)}</span>
          )}
          {z.angebot.kunde_id != null && <span className="nicht-drucken"><Link href={`/alt/kunden/${z.angebot.kunde_id}`}>Kundenstamm</Link></span>}
        </div>
        <div className="reiter-leiste" role="tablist" aria-label="Reiter des Angebots" onKeyDown={reiterTaste}>
          {REITER.map((titel, i) => (
            <button key={titel} ref={(el) => { reiterRefs.current[i] = el; }} type="button" role="tab" id={`reiter-${i}`} aria-selected={reiter === i} aria-controls="reiter-blatt" tabIndex={reiter === i ? 0 : -1} onClick={() => setReiter(i)}>
              {titel}
            </button>
          ))}
        </div>
        <div className="reiter-blatt" role="tabpanel" id="reiter-blatt" aria-labelledby={`reiter-${reiter}`}>
          {blatt()}
        </div>
      </div>
      <Statusleiste datei="Angebote" satz={`Datensatz ${position} von ${gesamt}`} sperre={lesen ? "Nur lesen" : geaendert ? "In Bearbeitung *" : "In Bearbeitung"} />
    </MaskeKontext.Provider>
  );
}
